// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RewardDistributor.sol";
import "../src/mocks/MockUSDT.sol";

contract RewardDistributorTest is Test {
    RewardDistributor public distributor;
    MockUSDT public usdt;

    address public admin;
    address public recipient1;
    address public recipient2;
    address public recipient3;
    address public nonDistributor;

    uint256 public constant INITIAL_FUND = 100_000 * 10 ** 6; // 100,000 USDT

    event RewardDistributed(
        bytes32 indexed batchId,
        address indexed recipient,
        uint256 amount,
        uint8 generation,
        bytes32 sourcePurchaseId
    );
    event BatchExecuted(
        bytes32 indexed batchId,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 successCount,
        uint256 failCount
    );
    event RewardClaimed(address indexed recipient, uint256 amount);

    function setUp() public {
        admin = address(this);
        recipient1 = makeAddr("recipient1");
        recipient2 = makeAddr("recipient2");
        recipient3 = makeAddr("recipient3");
        nonDistributor = makeAddr("nonDistributor");

        // Deploy contracts
        usdt = new MockUSDT();
        distributor = new RewardDistributor(address(usdt));

        // Fund the distributor contract with USDT
        usdt.mint(address(distributor), INITIAL_FUND);
    }

    // ================================================================
    // Helper Functions
    // ================================================================

    function _createRewardItem(
        address recipient,
        uint256 amount,
        uint8 generation,
        bytes32 sourcePurchaseId
    ) internal pure returns (RewardDistributor.RewardItem memory) {
        return RewardDistributor.RewardItem({
            recipient: recipient,
            amount: amount,
            generation: generation,
            sourcePurchaseId: sourcePurchaseId
        });
    }

    function _createBatchId(string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(label));
    }

    // ================================================================
    // distributeBatch - Happy Path
    // ================================================================

    function test_DistributeBatch_Success() public {
        bytes32 batchId = _createBatchId("batch-001");
        bytes32 purchaseId = keccak256("purchase-001");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](3);
        rewards[0] = _createRewardItem(recipient1, 90 * 10 ** 6, 1, purchaseId);  // 90 USDT gen1
        rewards[1] = _createRewardItem(recipient2, 30 * 10 ** 6, 2, purchaseId);  // 30 USDT gen2
        rewards[2] = _createRewardItem(recipient3, 15 * 10 ** 6, 3, purchaseId);  // 15 USDT gen3

        // Expect events for each recipient
        vm.expectEmit(true, true, false, true);
        emit RewardDistributed(batchId, recipient1, 90 * 10 ** 6, 1, purchaseId);

        vm.expectEmit(true, true, false, true);
        emit RewardDistributed(batchId, recipient2, 30 * 10 ** 6, 2, purchaseId);

        vm.expectEmit(true, true, false, true);
        emit RewardDistributed(batchId, recipient3, 15 * 10 ** 6, 3, purchaseId);

        // Expect batch executed event
        vm.expectEmit(true, false, false, true);
        emit BatchExecuted(batchId, 135 * 10 ** 6, 3, 3, 0);

        distributor.distributeBatch(batchId, rewards);

        // Verify balances
        assertEq(usdt.balanceOf(recipient1), 90 * 10 ** 6);
        assertEq(usdt.balanceOf(recipient2), 30 * 10 ** 6);
        assertEq(usdt.balanceOf(recipient3), 15 * 10 ** 6);

        // Verify totalReceived tracking
        assertEq(distributor.totalReceived(recipient1), 90 * 10 ** 6);
        assertEq(distributor.totalReceived(recipient2), 30 * 10 ** 6);
        assertEq(distributor.totalReceived(recipient3), 15 * 10 ** 6);

        // Verify distribution record
        RewardDistributor.DistributionRecord memory record = distributor.getDistribution(batchId);
        assertTrue(record.exists);
        assertEq(record.batchId, batchId);
        assertEq(record.totalAmount, 135 * 10 ** 6);
        assertEq(record.recipientCount, 3);
    }

    // ================================================================
    // distributeBatch - Revert Cases
    // ================================================================

    function test_DistributeBatch_Revert_DuplicateBatch() public {
        bytes32 batchId = _createBatchId("batch-dup");
        bytes32 purchaseId = keccak256("purchase-dup");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](1);
        rewards[0] = _createRewardItem(recipient1, 10 * 10 ** 6, 1, purchaseId);

        // First call succeeds
        distributor.distributeBatch(batchId, rewards);

        // Second call with same batchId should revert
        vm.expectRevert(RewardDistributor.BatchAlreadyProcessed.selector);
        distributor.distributeBatch(batchId, rewards);
    }

    function test_DistributeBatch_Revert_EmptyBatch() public {
        bytes32 batchId = _createBatchId("batch-empty");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](0);

        vm.expectRevert(RewardDistributor.EmptyBatch.selector);
        distributor.distributeBatch(batchId, rewards);
    }

    function test_DistributeBatch_Revert_BatchSizeExceeded() public {
        bytes32 batchId = _createBatchId("batch-big");
        bytes32 purchaseId = keccak256("purchase-big");

        // Create 201 items (exceeds MAX_BATCH_SIZE of 200)
        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](201);
        for (uint256 i = 0; i < 201; i++) {
            rewards[i] = _createRewardItem(
                // forge-lint: disable-next-line(unsafe-typecast)
                address(uint160(i + 1)),
                1 * 10 ** 6,
                1,
                purchaseId
            );
        }

        vm.expectRevert(RewardDistributor.BatchSizeExceeded.selector);
        distributor.distributeBatch(batchId, rewards);
    }

    function test_DistributeBatch_Revert_InsufficientBalance() public {
        // Deploy a new distributor with no funds
        RewardDistributor unfundedDistributor = new RewardDistributor(address(usdt));
        unfundedDistributor.grantRole(distributor.DISTRIBUTOR_ROLE(), address(this));

        bytes32 batchId = _createBatchId("batch-no-funds");
        bytes32 purchaseId = keccak256("purchase-no-funds");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](1);
        rewards[0] = _createRewardItem(recipient1, 1000 * 10 ** 6, 1, purchaseId);

        vm.expectRevert(RewardDistributor.InsufficientBalance.selector);
        unfundedDistributor.distributeBatch(batchId, rewards);
    }

    function test_DistributeBatch_Revert_NotDistributor() public {
        bytes32 batchId = _createBatchId("batch-no-role");
        bytes32 purchaseId = keccak256("purchase-no-role");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](1);
        rewards[0] = _createRewardItem(recipient1, 10 * 10 ** 6, 1, purchaseId);

        vm.prank(nonDistributor);
        vm.expectRevert();
        distributor.distributeBatch(batchId, rewards);
    }

    // ================================================================
    // claimReward
    // ================================================================

    function test_ClaimReward_Success() public {
        // To test claiming, we need claimableBalance > 0.
        // We manually set it via the slot since MockUSDT always succeeds.
        // Instead, we'll use a workaround: directly write to the claimableBalance mapping.
        // claimableBalance is at storage slot index that follows `distributions` and `totalReceived`.
        //
        // Alternative approach: call distributeBatch with a reward item,
        // then have the recipient claim again. But since MockUSDT transfers always succeed,
        // the claimableBalance won't be set via distributeBatch.
        //
        // We'll use vm.store to set claimableBalance for recipient1.

        // claimableBalance mapping is the 3rd mapping in the contract after inherited storage.
        // Let's find the slot: claimableBalance is declared after totalReceived.
        // We need to compute the storage slot for claimableBalance[recipient1].
        // In Solidity, mapping slot = keccak256(abi.encode(key, slotOfMapping))

        // First, fund some USDT to the distributor for the claim
        uint256 claimAmount = 50 * 10 ** 6;

        // Use vm.store to set claimableBalance[recipient1] = claimAmount
        // claimableBalance mapping is at storage slot 4 (verified via forge inspect)
        bytes32 slot = keccak256(abi.encode(recipient1, uint256(4)));
        vm.store(address(distributor), slot, bytes32(claimAmount));

        // Verify claimable balance was set
        assertEq(distributor.getClaimableBalance(recipient1), claimAmount);

        // Expect event
        vm.expectEmit(true, false, false, true);
        emit RewardClaimed(recipient1, claimAmount);

        // Claim
        vm.prank(recipient1);
        distributor.claimReward();

        // Verify balance transferred
        assertEq(usdt.balanceOf(recipient1), claimAmount);

        // Verify claimable balance is now 0
        assertEq(distributor.getClaimableBalance(recipient1), 0);

        // Verify totalReceived updated
        assertEq(distributor.totalReceived(recipient1), claimAmount);
    }

    function test_ClaimReward_Revert_NoBalance() public {
        vm.prank(recipient1);
        vm.expectRevert(RewardDistributor.NoClaimableBalance.selector);
        distributor.claimReward();
    }

    // ================================================================
    // emergencyWithdraw
    // ================================================================

    function test_EmergencyWithdraw() public {
        address withdrawTo = makeAddr("withdrawTo");
        uint256 withdrawAmount = 50_000 * 10 ** 6;

        distributor.emergencyWithdraw(withdrawTo, withdrawAmount);

        assertEq(usdt.balanceOf(withdrawTo), withdrawAmount);
        assertEq(usdt.balanceOf(address(distributor)), INITIAL_FUND - withdrawAmount);
    }

    function test_EmergencyWithdraw_Revert_NonAdmin() public {
        vm.prank(nonDistributor);
        vm.expectRevert();
        distributor.emergencyWithdraw(nonDistributor, 1000 * 10 ** 6);
    }

    // ================================================================
    // Pausable
    // ================================================================

    function test_Pausable() public {
        // Initially not paused
        assertFalse(distributor.paused());

        // Pause
        distributor.pause();
        assertTrue(distributor.paused());

        // distributeBatch should fail when paused
        bytes32 batchId = _createBatchId("batch-paused");
        bytes32 purchaseId = keccak256("purchase-paused");
        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](1);
        rewards[0] = _createRewardItem(recipient1, 10 * 10 ** 6, 1, purchaseId);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        distributor.distributeBatch(batchId, rewards);

        // claimReward should also fail when paused
        vm.prank(recipient1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        distributor.claimReward();

        // Unpause
        distributor.unpause();
        assertFalse(distributor.paused());

        // distributeBatch should work again
        distributor.distributeBatch(batchId, rewards);
        assertEq(usdt.balanceOf(recipient1), 10 * 10 ** 6);
    }

    // ================================================================
    // View Functions
    // ================================================================

    function test_TotalReceived() public {
        bytes32 purchaseId = keccak256("purchase-tracking");

        // First batch
        bytes32 batchId1 = _createBatchId("batch-track-1");
        RewardDistributor.RewardItem[] memory rewards1 = new RewardDistributor.RewardItem[](1);
        rewards1[0] = _createRewardItem(recipient1, 90 * 10 ** 6, 1, purchaseId);
        distributor.distributeBatch(batchId1, rewards1);

        assertEq(distributor.totalReceived(recipient1), 90 * 10 ** 6);

        // Second batch - cumulative
        bytes32 batchId2 = _createBatchId("batch-track-2");
        RewardDistributor.RewardItem[] memory rewards2 = new RewardDistributor.RewardItem[](1);
        rewards2[0] = _createRewardItem(recipient1, 30 * 10 ** 6, 1, purchaseId);
        distributor.distributeBatch(batchId2, rewards2);

        // Verify cumulative tracking
        assertEq(distributor.totalReceived(recipient1), 120 * 10 ** 6);
    }

    function test_GetDistribution() public {
        bytes32 batchId = _createBatchId("batch-view");
        bytes32 purchaseId = keccak256("purchase-view");

        RewardDistributor.RewardItem[] memory rewards = new RewardDistributor.RewardItem[](2);
        rewards[0] = _createRewardItem(recipient1, 90 * 10 ** 6, 1, purchaseId);
        rewards[1] = _createRewardItem(recipient2, 30 * 10 ** 6, 2, purchaseId);

        distributor.distributeBatch(batchId, rewards);

        RewardDistributor.DistributionRecord memory record = distributor.getDistribution(batchId);

        assertTrue(record.exists);
        assertEq(record.batchId, batchId);
        assertEq(record.totalAmount, 120 * 10 ** 6);
        assertEq(record.recipientCount, 2);
        assertEq(record.timestamp, block.timestamp);

        // Non-existent batch should return default (exists = false)
        bytes32 fakeBatchId = _createBatchId("nonexistent");
        RewardDistributor.DistributionRecord memory fakeRecord = distributor.getDistribution(fakeBatchId);
        assertFalse(fakeRecord.exists);
    }
}
