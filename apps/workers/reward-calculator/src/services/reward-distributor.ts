import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type Address,
  type Hash,
  encodePacked,
  keccak256,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Env, BatchReward } from "../types.js";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const REWARD_DISTRIBUTOR_ABI = [
  {
    name: "distributeBatch",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "batchId", type: "bytes32" },
      {
        name: "rewards",
        type: "tuple[]",
        components: [
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "generation", type: "uint8" },
          { name: "sourcePurchaseId", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export class RewardDistributorService {
  private publicClient;
  private walletClient;
  private account;

  constructor(private env: Env) {
    this.account = privateKeyToAccount(
      env.PRIVATE_KEY_REWARD_DISTRIBUTOR as `0x${string}`,
    );
    this.publicClient = createPublicClient({
      chain: polygon,
      transport: http(env.POLYGON_RPC_URL),
    });
    this.walletClient = createWalletClient({
      account: this.account,
      chain: polygon,
      transport: http(env.POLYGON_RPC_URL),
    });
  }

  async distributeBatch(
    batchId: string,
    rewards: BatchReward[],
  ): Promise<{ transferHash: Hash; distributeHash: Hash }> {
    const totalAmount = rewards.reduce((sum, r) => sum + r.amount_usdt, 0);
    const totalAmountWei = parseUnits(totalAmount.toString(), 6);
    const rewardContract = this.env.REWARD_CONTRACT_ADDRESS as Address;
    const usdtAddress = this.env.USDT_CONTRACT_ADDRESS as Address;

    const balance = await this.publicClient.readContract({
      address: usdtAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [this.account.address],
    });

    if (balance < totalAmountWei) {
      throw new Error(
        `Insufficient USDT balance: have ${balance}, need ${totalAmountWei}`,
      );
    }

    const transferHash = await this.walletClient.writeContract({
      address: usdtAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [rewardContract, totalAmountWei],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: transferHash });

    // If distributeBatch fails after transfer, USDT sits in the contract.
    // The contract's emergencyWithdraw() can recover funds (admin-only).
    // We throw with context so the caller can log the transferHash for recovery.
    const batchIdBytes = keccak256(
      encodePacked(["string"], [batchId]),
    ) as `0x${string}`;

    const rewardItems = rewards.map((r) => ({
      recipient: r.recipient_wallet_address as Address,
      amount: parseUnits(r.amount_usdt.toString(), 6),
      generation: r.generation,
      sourcePurchaseId: keccak256(
        encodePacked(["string"], [r.nft_purchase_id]),
      ) as `0x${string}`,
    }));

    let distributeHash: Hash;
    try {
      distributeHash = await this.walletClient.writeContract({
        address: rewardContract,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: "distributeBatch",
        args: [batchIdBytes, rewardItems],
      });

      await this.publicClient.waitForTransactionReceipt({
        hash: distributeHash,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      throw new Error(
        `distributeBatch failed after USDT transfer (${transferHash}). ` +
        `Use emergencyWithdraw() to recover ${totalAmount} USDT. Error: ${msg}`,
      );
    }

    return { transferHash, distributeHash };
  }
}
