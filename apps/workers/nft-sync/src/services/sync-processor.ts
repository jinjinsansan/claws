import type { SupabaseClient } from "@supabase/supabase-js";
import { OwnershipChecker } from "./ownership-checker.js";
import type { Env, NftToken, SyncResult } from "../types.js";

/**
 * NFT Sync Processor.
 * SPEC-02 §9: Daily sync of on-chain ownership to DB.
 * If ownership changed, deactivate the token for the old owner
 * and update to the new owner. Related services (HP, Bot) stop within 24h.
 */
export class SyncProcessor {
  private checker: OwnershipChecker;

  constructor(
    private supabase: SupabaseClient,
    private env: Env,
  ) {
    this.checker = new OwnershipChecker(env);
  }

  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      total_checked: 0,
      transfers_detected: 0,
      deactivated: 0,
      errors: 0,
    };

    const { data: tokens, error } = await this.supabase
      .from("nft_tokens")
      .select("id, token_id, owner_wallet_address, owner_user_id, claw_id, claw_no, is_active")
      .eq("is_active", true);

    if (error || !tokens) {
      console.error("Failed to fetch active NFTs:", error?.message);
      return result;
    }

    result.total_checked = tokens.length;

    for (const token of tokens as NftToken[]) {
      try {
        const onChainOwner = await this.checker.getOnChainOwner(token.token_id);

        if (!onChainOwner) {
          result.errors++;
          continue;
        }

        if (onChainOwner !== token.owner_wallet_address.toLowerCase()) {
          await this.handleTransfer(token, onChainOwner);
          result.transfers_detected++;
        }
      } catch (err) {
        console.error(`Error syncing token ${token.token_id}:`, err);
        result.errors++;
      }
    }

    await this.supabase.from("audit_logs").insert({
      action: "nft_sync_completed",
      actor_type: "system",
      entity_type: "nft_tokens",
      metadata: result,
    });

    return result;
  }

  private async handleTransfer(token: NftToken, newOwner: string): Promise<void> {
    const { data: newWallet } = await this.supabase
      .from("user_wallets")
      .select("user_id")
      .eq("wallet_address", newOwner)
      .single();

    const newUserId = newWallet?.user_id ?? null;
    const oldUserId = token.owner_user_id;

    await this.supabase
      .from("nft_tokens")
      .update({
        owner_wallet_address: newOwner,
        owner_user_id: newUserId,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    if (oldUserId) {
      await this.deactivateOldOwnerServices(oldUserId, token);
    }

    await this.supabase.from("audit_logs").insert({
      action: "nft_transfer_detected",
      actor_type: "system",
      entity_type: "nft_token",
      entity_id: token.id,
      metadata: {
        token_id: token.token_id,
        old_owner: token.owner_wallet_address,
        new_owner: newOwner,
        old_user_id: oldUserId,
        new_user_id: newUserId,
      },
    });
  }

  private async deactivateOldOwnerServices(
    userId: string,
    token: NftToken,
  ): Promise<void> {
    const { count } = await this.supabase
      .from("nft_tokens")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", userId)
      .eq("is_active", true)
      .neq("id", token.id);

    if ((count ?? 0) === 0) {
      await this.supabase
        .from("user_sites")
        .update({ status: "suspended" })
        .eq("user_id", userId)
        .eq("status", "published");

      await this.supabase.from("push_notifications").insert({
        title: "NFT 所有状態の変更",
        message: "NFT の所有権が変更されたため、関連サービスが一時停止されました。新しい NFT を取得すると再開できます。",
        notification_type: "system",
        target_type: "specific_users",
        target_user_ids: [userId],
        scheduled_for: new Date().toISOString(),
        status: "scheduled",
      });
    }
  }
}
