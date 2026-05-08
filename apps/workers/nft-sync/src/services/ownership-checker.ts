import { createPublicClient, http, type Address } from "viem";
import { polygon } from "viem/chains";
import type { Env } from "../types.js";

const OWNER_OF_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export class OwnershipChecker {
  private client;
  private contractAddress: Address;

  constructor(env: Env) {
    this.client = createPublicClient({
      chain: polygon,
      transport: http(env.POLYGON_RPC_URL),
    });
    this.contractAddress = env.NFT_CONTRACT_ADDRESS as Address;
  }

  async getOnChainOwner(tokenId: number): Promise<string | null> {
    try {
      const owner = await this.client.readContract({
        address: this.contractAddress,
        abi: OWNER_OF_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
      return (owner as string).toLowerCase();
    } catch {
      return null;
    }
  }
}
