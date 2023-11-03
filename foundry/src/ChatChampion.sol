// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChatChampion is ERC20, Ownable {
    bool public airDropEnded = false;
    uint256 private lastRewardTime = block.timestamp;

    constructor(address initialOwner, address[] memory addresses)
        ERC20("ChatChampion", "CC")
        Ownable(initialOwner)
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            airDrop(addresses[i]);
        }
    }
    function airDrop(address to) public onlyOwner {
        require(!airDropEnded);
        _mint(to, 1000 ether);
    }
    function endAirDrop() public onlyOwner {
        airDropEnded = true;
    }
    function rewardUsers(address user0, uint256 score0, address user1, uint256 score1, address user2, uint256 score2) public onlyOwner {
        // Rewards are 1000 tokens per hour
        uint256 reward = (block.timestamp - lastRewardTime) / 1 hours * 1000 ether;
        lastRewardTime = block.timestamp;
        uint256 totalScore = score0 + score1 + score2;
        _mint(user0, (score0 * reward) / totalScore);
        _mint(user1, (score1 * reward) / totalScore);
        _mint(user2, (score2 * reward) / totalScore);

    }
}