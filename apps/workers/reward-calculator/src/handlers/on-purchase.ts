import type { Context } from "hono";
import type { Env } from "../types.js";
import { createSupabaseClient } from "../lib/supabase.js";
import { RewardCalculator } from "../services/reward-calculator.js";

type HonoEnv = { Bindings: Env };

/**
 * POST /on-purchase
 * Called by the purchase webhook after an NFT purchase is confirmed.
 * Calculates referral rewards in real-time (status='calculated').
 * SPEC-03 §3.2: real-time calculation + daily batch sending.
 */
export async function handleOnPurchase(c: Context<HonoEnv>) {
  const apiSecret = c.env.API_SECRET;
  const authHeader = c.req.header("authorization");

  if (!apiSecret || authHeader !== `Bearer ${apiSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ purchaseId: string }>();
  if (!body.purchaseId) {
    return c.json({ error: "Missing purchaseId" }, 400);
  }

  const supabase = createSupabaseClient(c.env);
  const calculator = new RewardCalculator(supabase);

  try {
    const rewards = await calculator.calculateAndStore(body.purchaseId);
    return c.json({
      success: true,
      rewards_count: rewards.length,
      total_amount: rewards.reduce((s, r) => s + r.amount_usdt, 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("on-purchase error:", message);
    return c.json({ error: message }, 500);
  }
}
