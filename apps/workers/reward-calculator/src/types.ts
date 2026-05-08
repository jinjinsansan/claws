export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  POLYGON_RPC_URL: string;
  PRIVATE_KEY_REWARD_DISTRIBUTOR: string;
  REWARD_CONTRACT_ADDRESS: string;
  USDT_CONTRACT_ADDRESS: string;
  TREASURY_ADDRESS: string;
  CHAIN_ID: string;
  MAX_BATCH_SIZE: string;
  API_SECRET: string;
  DISCORD_WEBHOOK_URL?: string;
}

export interface RewardItem {
  recipient_user_id: string;
  recipient_wallet_address: string;
  generation: 1 | 2 | 3;
  rate_percentage: number;
  amount_usdt: number;
  nft_purchase_id: string;
}

export interface ReferrerChain {
  gen1: { id: string } | null;
  gen2: { id: string } | null;
  gen3: { id: string } | null;
}

export interface BatchReward {
  id: string;
  recipient_user_id: string;
  recipient_wallet_address: string;
  generation: number;
  amount_usdt: number;
  nft_purchase_id: string;
}
