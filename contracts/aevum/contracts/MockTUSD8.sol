// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockTUSD8
 * @notice 6-decimal test stablecoin mirroring tUSD8 on QDay Aevum Testnet for local unit tests.
 */
contract MockTUSD8 is ERC20 {
    constructor() ERC20("Test USD8", "tUSD8") {
        _mint(msg.sender, 1_000_000 * 1e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
