// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC4626, ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// Price of 1 collateral token in MUSD, 18 decimals.
interface IPriceOracle {
    function price() external view returns (uint256);
}

/// @title Mooring Market
/// @notice An isolated MUSD money market on Mezo. Lenders deposit MUSD and get mMUSD (ERC-4626) shares that
/// grow with borrower interest. Borrowers post MEZO and borrow MUSD against it. Anyone can liquidate a
/// position once its debt passes 65% of its collateral value, and keeps an 8% bonus.
contract MooringMarket is ERC4626, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint256 private constant WAD = 1e18;
    uint256 public constant MAX_LTV = 0.5e18; // borrow up to 50% of collateral value
    uint256 public constant LIQ_THRESHOLD = 0.65e18; // liquidatable above 65%
    uint256 public constant LIQ_BONUS = 1.08e18; // liquidator receives 8% extra collateral
    uint256 public constant CLOSE_FACTOR = 0.5e18; // at most half the debt per liquidation

    // Kinked rate: 2% at 0% utilisation, 12% at the 80% kink, 112% at 100%, so lenders can always exit.
    uint256 public constant BASE_RATE = 0.02e18;
    uint256 public constant SLOPE_1 = 0.10e18;
    uint256 public constant SLOPE_2 = 1.0e18;
    uint256 public constant KINK = 0.8e18;

    IERC20 public immutable collateral;
    IPriceOracle public oracle;

    uint256 public borrowIndex = WAD; // grows with interest; debt = scaledDebt * borrowIndex
    uint256 public lastAccrual;
    uint256 public totalScaledDebt;
    mapping(address => uint256) public scaledDebt;
    mapping(address => uint256) public collateralOf;

    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed payer, address indexed user, uint256 amount);
    event Liquidated(address indexed liquidator, address indexed user, uint256 repaid, uint256 seized);
    event OracleSet(address oracle);

    error ZeroAmount();
    error Unhealthy();
    error Healthy();
    error NoLiquidity();
    error BadPrice();

    constructor(IERC20 musd, IERC20 collateral_, IPriceOracle oracle_, address owner_)
        ERC20("Mooring MUSD", "mMUSD")
        ERC4626(musd)
        Ownable(owner_)
    {
        collateral = collateral_;
        oracle = oracle_;
        lastAccrual = block.timestamp;
    }

    // ---------------------------------------------------------------- views

    function cash() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function totalBorrows() public view returns (uint256) {
        return totalScaledDebt.mulDiv(_index(), WAD, Math.Rounding.Ceil);
    }

    /// Lenders own the cash plus everything borrowers owe, including interest not yet written to storage.
    function totalAssets() public view override returns (uint256) {
        return cash() + totalBorrows();
    }

    /// Uses debt as of the last accrual, so the rate for a period is fixed at its start.
    function utilization() public view returns (uint256) {
        uint256 b = totalScaledDebt.mulDiv(borrowIndex, WAD);
        return b == 0 ? 0 : b.mulDiv(WAD, cash() + b);
    }

    /// Yearly borrow rate, 18 decimals.
    function borrowRate() public view returns (uint256) {
        uint256 u = utilization();
        if (u <= KINK) return BASE_RATE + SLOPE_1.mulDiv(u, KINK);
        return BASE_RATE + SLOPE_1 + SLOPE_2.mulDiv(u - KINK, WAD - KINK);
    }

    /// Yearly rate lenders earn: what borrowers pay, spread over all deposits.
    function supplyRate() external view returns (uint256) {
        return borrowRate().mulDiv(utilization(), WAD);
    }

    function debtOf(address user) public view returns (uint256) {
        return scaledDebt[user].mulDiv(_index(), WAD, Math.Rounding.Ceil);
    }

    function collateralPrice() public view returns (uint256 p) {
        p = oracle.price();
        if (p == 0) revert BadPrice();
    }

    /// Everything the app shows for one borrower. `health` above 1e18 is safe; below 1e18 can be liquidated.
    function position(address user)
        external
        view
        returns (uint256 coll, uint256 debt, uint256 collValue, uint256 maxBorrow, uint256 health)
    {
        coll = collateralOf[user];
        debt = debtOf(user);
        collValue = coll.mulDiv(collateralPrice(), WAD);
        maxBorrow = collValue.mulDiv(MAX_LTV, WAD);
        health = debt == 0 ? type(uint256).max : collValue.mulDiv(LIQ_THRESHOLD, debt);
    }

    /// Lenders can only take out what isn't lent.
    function maxWithdraw(address owner_) public view override returns (uint256) {
        return Math.min(super.maxWithdraw(owner_), cash());
    }

    function maxRedeem(address owner_) public view override returns (uint256) {
        return Math.min(super.maxRedeem(owner_), _convertToShares(cash(), Math.Rounding.Floor));
    }

    // ------------------------------------------------------------- lenders

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        accrue();
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256) {
        accrue();
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner_) public override nonReentrant returns (uint256) {
        accrue();
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(uint256 shares, address receiver, address owner_) public override nonReentrant returns (uint256) {
        accrue();
        return super.redeem(shares, receiver, owner_);
    }

    // ----------------------------------------------------------- borrowers

    function depositCollateral(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        collateralOf[msg.sender] += amount;
        emit CollateralDeposited(msg.sender, amount);
    }

    function withdrawCollateral(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        accrue();
        collateralOf[msg.sender] -= amount;
        if (!_withinLtv(msg.sender)) revert Unhealthy();
        collateral.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function borrow(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        accrue();
        if (amount > cash()) revert NoLiquidity();
        uint256 scaled = amount.mulDiv(WAD, borrowIndex, Math.Rounding.Ceil);
        scaledDebt[msg.sender] += scaled;
        totalScaledDebt += scaled;
        if (!_withinLtv(msg.sender)) revert Unhealthy();
        IERC20(asset()).safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    /// Repays up to `amount` of `user`'s debt. Paying more than the debt pays exactly the debt.
    function repay(uint256 amount, address user) external nonReentrant returns (uint256 paid) {
        if (amount == 0) revert ZeroAmount();
        accrue();
        paid = _reduceDebt(user, amount);
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), paid);
        emit Repaid(msg.sender, user, paid);
    }

    /// Repays part of an unhealthy loan and takes the matching MEZO plus an 8% bonus.
    function liquidate(address user, uint256 repayAmount) external nonReentrant returns (uint256 seized) {
        if (repayAmount == 0) revert ZeroAmount();
        accrue();
        uint256 debt = debtOf(user);
        uint256 price = collateralPrice();
        uint256 collValue = collateralOf[user].mulDiv(price, WAD);
        if (debt == 0 || collValue.mulDiv(LIQ_THRESHOLD, WAD) >= debt) revert Healthy();

        repayAmount = Math.min(repayAmount, debt.mulDiv(CLOSE_FACTOR, WAD, Math.Rounding.Ceil));
        seized = repayAmount.mulDiv(LIQ_BONUS, price);
        if (seized > collateralOf[user]) {
            // underwater: take all collateral and charge only what it covers
            seized = collateralOf[user];
            repayAmount = seized.mulDiv(price, LIQ_BONUS);
        }
        // shortcut: debt left on a position with no collateral stays as bad debt that lenders absorb; add a reserve fund before mainnet
        repayAmount = _reduceDebt(user, repayAmount);
        collateralOf[user] -= seized;
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), repayAmount);
        collateral.safeTransfer(msg.sender, seized);
        emit Liquidated(msg.sender, user, repayAmount, seized);
    }

    /// Writes interest earned since the last call into the borrow index.
    function accrue() public {
        uint256 i = _index();
        if (i != borrowIndex) borrowIndex = i;
        lastAccrual = block.timestamp;
    }

    // --------------------------------------------------------------- owner

    function setOracle(IPriceOracle oracle_) external onlyOwner {
        oracle = oracle_;
        emit OracleSet(address(oracle_));
    }

    // ------------------------------------------------------------ internal

    function _index() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0 || totalScaledDebt == 0) return borrowIndex;
        return borrowIndex + borrowIndex.mulDiv(borrowRate() * dt, 365 days * WAD);
    }

    function _withinLtv(address user) internal view returns (bool) {
        uint256 debt = debtOf(user);
        return debt == 0 || debt <= collateralOf[user].mulDiv(collateralPrice(), WAD).mulDiv(MAX_LTV, WAD);
    }

    function _reduceDebt(address user, uint256 amount) internal returns (uint256 paid) {
        uint256 debt = debtOf(user);
        uint256 scaled;
        if (amount >= debt) {
            (paid, scaled) = (debt, scaledDebt[user]);
        } else {
            (paid, scaled) = (amount, amount.mulDiv(WAD, borrowIndex));
        }
        scaledDebt[user] -= scaled;
        totalScaledDebt -= scaled;
    }
}
