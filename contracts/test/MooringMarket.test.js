const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const e = (n) => ethers.parseEther(String(n));

describe("MooringMarket", () => {
  let musd, mezo, oracle, market, owner, lender, borrower, liquidator;

  beforeEach(async () => {
    [owner, lender, borrower, liquidator] = await ethers.getSigners();
    musd = await ethers.deployContract("MockToken", ["MUSD"]);
    mezo = await ethers.deployContract("MockToken", ["MEZO"]);
    oracle = await ethers.deployContract("MockOracle"); // 1 MEZO = 1 MUSD
    market = await ethers.deployContract("MooringMarket", [musd, mezo, oracle, owner.address]);
    for (const s of [lender, borrower, liquidator]) {
      await musd.mint(s, e(10_000));
      await mezo.mint(s, e(10_000));
      await musd.connect(s).approve(market, ethers.MaxUint256);
      await mezo.connect(s).approve(market, ethers.MaxUint256);
    }
    await market.connect(lender).deposit(e(1000), lender);
    await market.connect(borrower).depositCollateral(e(1000));
  });

  it("lets a borrower take up to 50% of collateral value and no more", async () => {
    await expect(market.connect(borrower).borrow(e(501))).to.be.revertedWithCustomError(market, "Unhealthy");
    await market.connect(borrower).borrow(e(500));
    expect(await musd.balanceOf(borrower)).to.equal(e(10_500));
    await expect(market.connect(borrower).withdrawCollateral(e(1))).to.be.revertedWithCustomError(market, "Unhealthy");
  });

  it("charges interest to borrowers and pays it to lenders", async () => {
    await market.connect(borrower).borrow(e(400)); // 40% utilisation -> 2% + 10% * 0.5 = 7% a year
    expect(await market.borrowRate()).to.equal(e(0.07));
    await time.increase(365 * 24 * 3600);
    const debt = await market.debtOf(borrower);
    expect(debt).to.be.closeTo(e(428), e(0.01));
    expect(await market.totalAssets()).to.be.closeTo(e(1028), e(0.01));

    await market.connect(borrower).repay(ethers.MaxUint256, borrower); // pays exactly the debt
    expect(await market.debtOf(borrower)).to.equal(0);
    expect(await market.totalBorrows()).to.equal(0);
    await market.connect(lender).redeem(await market.balanceOf(lender), lender, lender);
    expect(await musd.balanceOf(lender)).to.be.closeTo(e(10_028), e(0.01));
  });

  it("only lets lenders withdraw what isn't lent", async () => {
    await market.connect(borrower).borrow(e(500));
    expect(await market.maxWithdraw(lender)).to.equal(e(500));
    await expect(market.connect(lender).withdraw(e(501), lender, lender)).to.be.reverted;
    await expect(market.connect(borrower).borrow(e(501))).to.be.revertedWithCustomError(market, "NoLiquidity");
  });

  it("liquidates only past 65% with an 8% bonus and a 50% close factor", async () => {
    await market.connect(borrower).borrow(e(500));
    await expect(market.connect(liquidator).liquidate(borrower, e(100))).to.be.revertedWithCustomError(market, "Healthy");

    await oracle.set(e(0.7)); // collateral now worth 700, debt 500 = 71% > 65%
    const [, , , , health] = await market.position(borrower);
    expect(health).to.be.lt(e(1));

    await market.connect(liquidator).liquidate(borrower, e(1000)); // capped at half the debt
    const repaid = e(250);
    const seized = (repaid * e(1.08)) / e(0.7);
    expect(await market.debtOf(borrower)).to.be.closeTo(e(250), e(0.001)); // plus a few seconds of interest
    expect(await mezo.balanceOf(liquidator)).to.be.closeTo(e(10_000) + seized, e(0.001));
    expect(await market.collateralOf(borrower)).to.be.closeTo(e(1000) - seized, e(0.001));
  });

  it("caps the seizure at the collateral when a position is underwater", async () => {
    await market.connect(borrower).borrow(e(500));
    await oracle.set(e(0.2)); // collateral worth 200 against 500 of debt
    await market.connect(liquidator).liquidate(borrower, e(250));
    expect(await market.collateralOf(borrower)).to.equal(0);
    expect(await market.debtOf(borrower)).to.be.closeTo(e(500) - (e(1000) * e(0.2)) / e(1.08), e(0.001)); // the rest is bad debt
  });

  it("prices MEZO from a Mezo pool TWAP", async () => {
    const pool = await ethers.deployContract("MockPool");
    const twap = await ethers.deployContract("PoolTwapOracle", [pool, mezo, 4]);
    expect(await twap.price()).to.equal(e(0.8));
    await expect(market.connect(borrower).setOracle(twap)).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    await market.setOracle(twap);
    await expect(market.connect(borrower).borrow(e(401))).to.be.revertedWithCustomError(market, "Unhealthy");
    await market.connect(borrower).borrow(e(400));
  });
});
