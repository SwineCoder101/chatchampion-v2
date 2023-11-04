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
        // Define users and scores inline for easy editing
        address user0 = address(0x1);
        uint256 score0 = 10;
        address user1 = address(0x2);
        uint256 score1 = 20;
        address user2 = address(0x3);
        uint256 score2 = 30;

        // Simulate time passing
        uint256 hoursPassed = 1;
        vm.warp(block.timestamp + (hoursPassed * 1 hours));

        // Execute the reward function
        chatChampion.rewardUsers(user0, user1, user2, score0, score1, score2);

        // Calculate total score and total reward
        uint256 totalScore = score0 + score1 + score2;
        uint256 totalReward = hoursPassed * 1000 ether;

        // Calculate and assert expected rewards for each user
        assertEq(chatChampion.balanceOf(user0), (score0 * totalReward / totalScore));
        emit log_uint(chatChampion.balanceOf(user0));
        assertEq(chatChampion.balanceOf(user1), (score1 * totalReward / totalScore));
        emit log_uint(chatChampion.balanceOf(user1));
        assertEq(chatChampion.balanceOf(user2), (score2 * totalReward / totalScore));
        emit log_uint(chatChampion.balanceOf(user2));

    }
}
