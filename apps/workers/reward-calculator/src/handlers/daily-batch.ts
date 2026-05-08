import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../lib/supabase.js";
import { RewardDistributorService } from "../services/reward-distributor.js";
import { generateBatchId } from "../lib/batch-id.js";
import { notifyAdminError } from "../lib/notify.js";
import type { Env, BatchReward } from "../types.js";

/**
 * Daily batch distribution.
 * SPEC-03 §4.3: runs at 0:00 JST via Cloudflare Cron (UTC 15:00).
 * Collects all rewards with status='calculated', groups into batches
 * of MAX_BATCH_SIZE, and distributes on-chain.
 */
export async function executeDailyDistribution(env: Env): Promise<void> {
  const supabase = createSupabaseClient(env);
  const maxBatchSize = parseInt(env.MAX_BATCH_SIZE, 10) || 200;

  const { data: rewards, error } = await supabase
    .from("referral_rewards")
    .select("id, recipient_user_id, recipient_wallet_address, generation, amount_usdt, nft_purchase_id")
    .eq("status", "calculated")
    .lte("scheduled_for", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    const msg = `Failed to fetch pending rewards: ${error.message}`;
    console.error(msg);
    await notifyAdminError(msg, env);
    return;
  }

  if (!rewards || rewards.length === 0) {
    console.log("No pending rewards to distribute");
    return;
  }

  console.log(`Processing ${rewards.length} pending rewards`);

  const batches: BatchReward[][] = [];
  for (let i = 0; i < rewards.length; i += maxBatchSize) {
    batches.push(rewards.slice(i, i + maxBatchSize) as BatchReward[]);
  }

  for (const batch of batches) {
    await processBatch(batch, env, supabase);
  }
}

async function processBatch(
  batch: BatchReward[],
  env: Env,
  supabase: SupabaseClient,
): Promise<void> {
  const batchId = generateBatchId();
  const totalAmount = batch.reduce((sum, r) => sum + Number(r.amount_usdt), 0);
  const rewardIds = batch.map((r) => r.id);

  console.log(`Batch ${batchId}: ${batch.length} rewards, ${totalAmount} USDT`);

  const { data: distribution, error: distError } = await supabase
    .from("reward_distributions")
    .insert({
      batch_id: batchId,
      total_recipients: batch.length,
      total_amount_usdt: totalAmount,
      status: "pending",
    })
    .select("id")
    .single();

  if (distError || !distribution) {
    console.error("Failed to create distribution record:", distError?.message);
    await notifyAdminError(`Failed to create distribution: ${distError?.message}`, env);
    return;
  }

  await supabase
    .from("referral_rewards")
    .update({ status: "scheduled", distribution_id: distribution.id })
    .in("id", rewardIds);

  try {
    const distributor = new RewardDistributorService(env);
    const { distributeHash } = await distributor.distributeBatch(batchId, batch);

    await supabase
      .from("reward_distributions")
      .update({
        status: "sent",
        transaction_hash: distributeHash,
        executed_at: new Date().toISOString(),
      })
      .eq("id", distribution.id);

    await supabase
      .from("referral_rewards")
      .update({ status: "sent" })
      .in("id", rewardIds);

    await supabase.from("audit_logs").insert({
      action: "reward_batch_sent",
      actor_type: "system",
      entity_type: "reward_distribution",
      entity_id: distribution.id,
      metadata: {
        batch_id: batchId,
        transaction_hash: distributeHash,
        total_amount: totalAmount,
        recipient_count: batch.length,
      },
    });

    for (const reward of batch) {
      await supabase.from("push_notifications").insert({
        title: "紹介報酬が届きました",
        message: `${reward.amount_usdt} USDT の報酬が送金されました。`,
        notification_type: "system",
        target_type: "specific_users",
        target_user_ids: [reward.recipient_user_id],
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
      });
    }

    console.log(`Batch ${batchId} sent: ${distributeHash}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Batch ${batchId} failed:`, message);

    await supabase
      .from("reward_distributions")
      .update({ status: "failed", failed_reason: message })
      .eq("id", distribution.id);

    await supabase
      .from("referral_rewards")
      .update({ status: "failed", metadata: { error: message } })
      .in("id", rewardIds);

    await notifyAdminError(`Batch ${batchId} failed: ${message}`, env);
  }
}
