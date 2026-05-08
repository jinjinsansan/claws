export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  POLYGON_RPC_URL: string;
  NFT_CONTRACT_ADDRESS: string;
  CHAIN_ID: string;
  API_SECRET: string;
}

export interface NftToken {
  id: string;
  token_id: number;
  owner_wallet_address: string;
  owner_user_id: string | null;
  claw_id: string;
  claw_no: number;
  is_active: boolean;
}

export interface SyncResult {
  total_checked: number;
  transfers_detected: number;
  deactivated: number;
  errors: number;
}
