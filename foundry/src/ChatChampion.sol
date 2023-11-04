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
            _mint(addresses[i], 1000 ether);
        }
    }
    function airDrop(address to) public onlyOwner {
        require(!airDropEnded);
        _mint(to, 1000 ether);
    }
    function endAirDrop() public onlyOwner {
        airDropEnded = true;
    }
    function rewardUsers(address[] memory users, uint256[] memory scores) public onlyOwner {
        require(users.length == scores.length, "Users and scores length mismatch");

        // Calculate the total reward based on the time elapsed since the last reward
        uint256 reward = (block.timestamp - lastRewardTime) / 1 hours * 1000 ether;
        lastRewardTime = block.timestamp;

        // Calculate the total score
        uint256 totalScore = 0;
        for (uint256 i = 0; i < scores.length; i++) {
            totalScore += scores[i];
        }

        // Require that the totalScore is greater than 0 to prevent division by zero
        require(totalScore > 0, "Total score must be greater than 0");

        // Distribute rewards based on each user's score
        for (uint256 i = 0; i < users.length; i++) {
            if (scores[i] > 0) {
                _mint(users[i], (scores[i] * reward) / totalScore);
            }
        }
    }
}