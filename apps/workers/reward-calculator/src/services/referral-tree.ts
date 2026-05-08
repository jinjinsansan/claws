import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReferrerChain } from "../types.js";

export class ReferralTreeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get up to 3 generations of referrers for a user.
   * Uses the referrals table (pre-built by trigger on user creation).
   */
  async getReferrerChain(userId: string): Promise<ReferrerChain> {
    const { data: referrals, error } = await this.supabase
      .from("referrals")
      .select("referrer_user_id, generation")
      .eq("referred_user_id", userId)
      .order("generation", { ascending: true })
      .limit(3);

    if (error) {
      throw new Error(`Failed to fetch referral chain: ${error.message}`);
    }

    const chain: ReferrerChain = { gen1: null, gen2: null, gen3: null };

    for (const ref of referrals ?? []) {
      const key = `gen${ref.generation}` as keyof ReferrerChain;
      if (key in chain) {
        chain[key] = { id: ref.referrer_user_id };
      }
    }

    return chain;
  }

  /**
   * Get the primary verified wallet address for a user.
   */
  async getUserWallet(userId: string): Promise<string | null> {
    const { data: wallet } = await this.supabase
      .from("user_wallets")
      .select("wallet_address")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .eq("is_verified", true)
      .single();

    return wallet?.wallet_address ?? null;
  }
}
