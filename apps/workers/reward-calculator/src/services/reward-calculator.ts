import type { SupabaseClient } from "@supabase/supabase-js";
import { ReferralTreeService } from "./referral-tree.js";
import type { RewardItem } from "../types.js";

const PURCHASE_AMOUNT_USDT = 300;

const RATES_MVP1 = {
  1: 30, // gen1: 30%
  2: 10, // gen2: 10%
  3: 5,  // gen3: 5%
} as const;

export class RewardCalculator {
  private treeService: ReferralTreeService;

  constructor(private supabase: SupabaseClient) {
    this.treeService = new ReferralTreeService(supabase);
  }

  /**
   * Calculate and store referral rewards for a confirmed purchase.
   * SPEC-03 §4.2: real-time calculation, stored as status='calculated'.
   */
  async calculateAndStore(purchaseId: string): Promise<RewardItem[]> {
    const { data: purchase, error } = await this.supabase
      .from("nft_purchases")
      .select("id, user_id, amount_usdt, status")
      .eq("id", purchaseId)
      .single();

    if (error || !purchase) {
      throw new Error(`Purchase not found: ${purchaseId}`);
    }

    if (purchase.status !== "confirmed") {
      console.log(`Skip: purchase ${purchaseId} not confirmed (status=${purchase.status})`);
      return [];
    }

    if (!purchase.user_id) {
      console.log(`Skip: purchase ${purchaseId} has no user_id`);
      return [];
    }

    const existingCheck = await this.supabase
      .from("referral_rewards")
      .select("id")
      .eq("nft_purchase_id", purchaseId)
      .limit(1);

    if (existingCheck.data && existingCheck.data.length > 0) {
      console.log(`Skip: rewards already calculated for purchase ${purchaseId}`);
      return [];
    }

    let chain = await this.treeService.getReferrerChain(purchase.user_id);

    // SPEC-03 §2.2: If no referrer, admin is default gen1 (set by DB trigger).
    // The referrals table should already contain the admin as gen1 referrer.
    // If referrals table is empty, resolve admin from admin_users as fallback.
    if (!chain.gen1) {
      const { data: admin } = await this.supabase
        .from("admin_users")
        .select("user_id")
        .eq("role", "super_admin")
        .order("granted_at", { ascending: true })
        .limit(1)
        .single();

      if (admin) {
        chain = { gen1: { id: admin.user_id }, gen2: null, gen3: null };
      }
    }

    const rewards: RewardItem[] = [];
    const amount = Number(purchase.amount_usdt) || PURCHASE_AMOUNT_USDT;

    for (const gen of [1, 2, 3] as const) {
      const referrer = chain[`gen${gen}`];
      if (!referrer) continue;

      const wallet = await this.treeService.getUserWallet(referrer.id);
      if (!wallet) {
        console.warn(`No verified wallet for referrer ${referrer.id} (gen=${gen}), skipping`);
        continue;
      }

      const rate = RATES_MVP1[gen];
      rewards.push({
        recipient_user_id: referrer.id,
        recipient_wallet_address: wallet,
        generation: gen,
        rate_percentage: rate,
        amount_usdt: (amount * rate) / 100,
        nft_purchase_id: purchaseId,
      });
    }

    if (rewards.length > 0) {
      const scheduledFor = this.getNextDistributionTime();
      const rows = rewards.map((r) => ({
        source_type: "nft_purchase" as const,
        nft_purchase_id: r.nft_purchase_id,
        recipient_user_id: r.recipient_user_id,
        recipient_wallet_address: r.recipient_wallet_address,
        generation: r.generation,
        rate_percentage: r.rate_percentage,
        base_rate_percentage: r.rate_percentage,
        bonus_rate_percentage: 0,
        amount_usdt: r.amount_usdt,
        status: "calculated" as const,
        scheduled_for: scheduledFor,
      }));

      const { error: insertError } = await this.supabase
        .from("referral_rewards")
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to insert rewards: ${insertError.message}`);
      }

      await this.supabase.from("audit_logs").insert({
        action: "referral_rewards_calculated",
        actor_type: "system",
        entity_type: "nft_purchase",
        entity_id: purchaseId,
        metadata: {
          reward_count: rewards.length,
          total_amount: rewards.reduce((s, r) => s + r.amount_usdt, 0),
          generations: rewards.map((r) => r.generation),
        },
      });
    }

    return rewards;
  }

  private getNextDistributionTime(): string {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);

    const nextMidnight = new Date(jstNow);
    nextMidnight.setHours(24, 0, 0, 0);

    const utcTime = new Date(nextMidnight.getTime() - jstOffset);
    return utcTime.toISOString();
  }
}
