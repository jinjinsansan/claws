import { type Address } from "viem";
import ClawsNFTAbi from "./ClawsNFT.abi.json";
import RewardDistributorAbi from "./RewardDistributor.abi.json";

export const POLYGON_CHAIN_ID = 137;
export const AMOY_CHAIN_ID = 80002;

export const USDT_ADDRESS = (process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS ?? "0xc2132D05D31c914a87C6611C10748AEb04B58e8F") as Address;
export const CLAWS_NFT_ADDRESS = (process.env.NEXT_PUBLIC_CLAWS_NFT_ADDRESS ?? "") as Address;
export const REWARD_DISTRIBUTOR_ADDRESS = (process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS ?? "") as Address;

export const PRICE_USDT = 300_000_000n; // 300 USDT (6 decimals)

export const USDT_ABI = [
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
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export { ClawsNFTAbi, RewardDistributorAbi };
