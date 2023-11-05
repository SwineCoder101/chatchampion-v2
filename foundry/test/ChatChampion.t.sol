// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ChatChampion.sol";

contract ChatChampionTest is Test {
    ChatChampion chatChampion;
    address[] initialAddresses;

    function setUp() public {
        // Prepare a list of initial addresses
        initialAddresses = new address[](2);
        initialAddresses[0] = address(0x1);
        initialAddresses[1] = address(0x2);
        // Deploy the ChatChampion contract
        chatChampion = new ChatChampion(address(this), initialAddresses);
    }

    function testInitialMint() public {
        // Each initial address should have 1000 CC tokens
        for (uint256 i = 0; i < initialAddresses.length; i++) {
            assertEq(chatChampion.balanceOf(initialAddresses[i]), 1000 ether);
        }
    }

    function testCannotAirDropAfterEnd() public {
        // End the airdrop
        chatChampion.endAirDrop();
        // Attempting another airdrop should fail
        vm.expectRevert();
        chatChampion.airDrop(address(0x3));
    }

    function testRewardDistribution() public {
        address[] memory users = new address[](2);
        users[0] = address(0x1);
        users[1] = address(0x2);
        uint256[] memory scores = new uint256[](2);
        scores[0] = 50;
        scores[1] = 150;

        // Simulate time passing
        vm.warp(block.timestamp + 2 hours);

        // Reward the users
        chatChampion.rewardUsers(users, scores);

        // Calculate expected rewards
        uint256 totalReward = 2000 ether; // 2 hours * 1000 CC per hour
        uint256 totalScore = 200;
        uint256 rewardPerScore = totalReward / totalScore;
        uint256 expectedRewardUser1 = rewardPerScore * 50;
        uint256 expectedRewardUser2 = rewardPerScore * 150;

        // Check if the rewards were distributed correctly
        assertEq(chatChampion.balanceOf(users[0]), 1000 ether + expectedRewardUser1);
        assertEq(chatChampion.balanceOf(users[1]), 1000 ether + expectedRewardUser2);
    }

    function testFailRewardWithNoScores() public {
        address[] memory users = new address[](1);
        users[0] = address(0x1);
        uint256[] memory scores = new uint256[](1);
        scores[0] = 0;

        // Attempting to reward with a total score of 0 should fail
        chatChampion.rewardUsers(users, scores);
    }

    // Additional tests can be written to cover all possible scenarios and edge cases
}
