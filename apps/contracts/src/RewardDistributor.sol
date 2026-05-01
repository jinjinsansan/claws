// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardDistributor is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 200;

    IERC20 public immutable usdtToken;

    struct RewardItem {
        address recipient;
        uint256 amount;
        uint8 generation;
        bytes32 sourcePurchaseId;
    }

    struct DistributionRecord {
        bytes32 batchId;
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => DistributionRecord) public distributions;
    mapping(address => uint256) public totalReceived;
    mapping(address => uint256) public claimableBalance;

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
    event RewardFallbackToClaim(
        bytes32 indexed batchId,
        address indexed recipient,
        uint256 amount
    );
    event RewardClaimed(address indexed recipient, uint256 amount);

    error EmptyBatch();
    error BatchSizeExceeded();
    error BatchAlreadyProcessed();
    error InsufficientBalance();
    error TransferFailed();
    error NoClaimableBalance();
    error InvalidAddress();

    constructor(address _usdtAddress) {
        if (_usdtAddress == address(0)) revert InvalidAddress();

        usdtToken = IERC20(_usdtAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function distributeBatch(
        bytes32 batchId,
        RewardItem[] calldata rewards
    ) external nonReentrant whenNotPaused onlyRole(DISTRIBUTOR_ROLE) {
        if (rewards.length == 0) revert EmptyBatch();
        if (rewards.length > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        if (distributions[batchId].exists) revert BatchAlreadyProcessed();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < rewards.length; i++) {
            totalAmount += rewards[i].amount;
        }

        if (usdtToken.balanceOf(address(this)) < totalAmount) {
            revert InsufficientBalance();
        }

        uint256 successCount = 0;
        uint256 failCount = 0;

        for (uint256 i = 0; i < rewards.length; i++) {
            RewardItem calldata item = rewards[i];
            if (item.recipient == address(0) || item.amount == 0) {
                continue;
            }

            bool success = usdtToken.transfer(item.recipient, item.amount);
            if (success) {
                totalReceived[item.recipient] += item.amount;
                successCount++;
                emit RewardDistributed(
                    batchId, item.recipient, item.amount,
                    item.generation, item.sourcePurchaseId
                );
            } else {
                claimableBalance[item.recipient] += item.amount;
                failCount++;
                emit RewardFallbackToClaim(batchId, item.recipient, item.amount);
            }
        }

        distributions[batchId] = DistributionRecord({
            batchId: batchId,
            totalAmount: totalAmount,
            recipientCount: rewards.length,
            timestamp: block.timestamp,
            exists: true
        });

        emit BatchExecuted(batchId, totalAmount, rewards.length, successCount, failCount);
    }

    function claimReward() external nonReentrant whenNotPaused {
        uint256 amount = claimableBalance[msg.sender];
        if (amount == 0) revert NoClaimableBalance();

        claimableBalance[msg.sender] = 0;

        bool success = usdtToken.transfer(msg.sender, amount);
        if (!success) {
            claimableBalance[msg.sender] = amount;
            revert TransferFailed();
        }

        totalReceived[msg.sender] += amount;
        emit RewardClaimed(msg.sender, amount);
    }

    function emergencyWithdraw(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        bool success = usdtToken.transfer(to, amount);
        if (!success) revert TransferFailed();
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- View Functions ---

    function getDistribution(bytes32 batchId) external view returns (DistributionRecord memory) {
        return distributions[batchId];
    }

    function getClaimableBalance(address account) external view returns (uint256) {
        return claimableBalance[account];
    }

    function getTotalReceived(address account) external view returns (uint256) {
        return totalReceived[account];
    }
}
