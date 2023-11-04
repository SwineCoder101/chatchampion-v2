// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ChatChampion.sol"; // Adjust the path to where your ChatChampion contract is located

contract ChatChampionTest is Test {
    ChatChampion private chatChampion;
    address private owner;
    address[] private airdropRecipients;

    function setUp() public {
        // Set up the owner and recipient addresses
        owner = address(this); // In tests, 'this' is the deploying address
        airdropRecipients = new address[](30);
        for (uint256 i = 0; i < 30; i++) {
            airdropRecipients[i] = vm.addr(i + 1);
        }

        // Deploy the ChatChampion contract
        chatChampion = new ChatChampion(owner, airdropRecipients);
    }

    function testInitialMint() public {
        // Test initial state
        assertEq(chatChampion.balanceOf(owner), 0);
        for (uint i = 0; i < airdropRecipients.length; i++) {
            assertEq(chatChampion.balanceOf(airdropRecipients[i]), 1000 ether, "Airdrop amount incorrect for recipient");
        }
    }

    function testCannotAirDropAfterEnded() public {
        // End the airdrop
        chatChampion.endAirDrop();

        // Attempting to airdrop after ending should fail
        vm.expectRevert();
        chatChampion.airDrop(address(4));
    }

    function testRewardDistribution() public {
        // Define an array of users and an array of scores
        address[] memory users = new address[](3);
        uint256[] memory scores = new uint256[](3);

        users[0] = address(0x1);
        scores[0] = 10;
        users[1] = address(0x2);
        scores[1] = 20;
        users[2] = address(0x3);
        scores[2] = 30;

        // Simulate time passing
        uint256 hoursPassed = 1;
        vm.warp(block.timestamp + (hoursPassed * 1 hours));

        // Execute the reward function
        chatChampion.rewardUsers(users, scores);

        // Calculate total score and total reward
        uint256 totalScore = scores[0] + scores[1] + scores[2];
        uint256 totalReward = hoursPassed * 1000 ether;

        // Calculate and assert expected rewards for each user
        for (uint i = 0; i < users.length; i++) {
            uint256 expectedReward = (scores[i] * totalReward / totalScore);
            assertEq(chatChampion.balanceOf(users[i]), expectedReward);
            emit log_uint(chatChampion.balanceOf(users[i]));
        }
    }
}