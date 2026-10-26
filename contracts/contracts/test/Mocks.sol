// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory s) ERC20(s, s) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockOracle {
    uint256 public price = 1e18;

    function set(uint256 p) external {
        price = p;
    }
}

/// Stands in for a Mezo pool's quote(): returns `rate` MUSD per token.
contract MockPool {
    uint256 public rate = 0.8e18;

    function quote(address, uint256 amountIn, uint256) external view returns (uint256) {
        return (amountIn * rate) / 1e18;
    }
}
