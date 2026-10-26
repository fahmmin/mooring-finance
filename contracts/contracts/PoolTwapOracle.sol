// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Mezo Pools (Aerodrome-style) basic pool: time-weighted quote from its stored price observations.
interface IMezoPool {
    function quote(address tokenIn, uint256 amountIn, uint256 granularity) external view returns (uint256);
}

/// @title Pool TWAP oracle
/// @notice Prices MEZO in MUSD from the Mezo Pools MEZO/MUSD pool's own time-weighted average, so a single
/// swap in the current block can't move it.
/// shortcut: the testnet pool is small and rarely traded, so this TWAP is easy to move over time; use Pyth MEZO/USD on mainnet
contract PoolTwapOracle {
    IMezoPool public immutable pool;
    address public immutable token; // MEZO
    uint256 public immutable granularity; // number of 30-minute observations averaged

    constructor(IMezoPool pool_, address token_, uint256 granularity_) {
        pool = pool_;
        token = token_;
        granularity = granularity_;
    }

    function price() external view returns (uint256) {
        return pool.quote(token, 1e18, granularity);
    }
}
