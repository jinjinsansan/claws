import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification, DeliveryTarget } from "../types.js";

/**
 * Resolves notification targets to a list of users with their Telegram IDs.
 * SPEC-08 §6.1
 */
export async function resolveTargets(
  notification: Notification,
  supabase: SupabaseClient,
): Promise<DeliveryTarget[]> {
  switch (notification.target_type) {
    case "all":
      return resolveAll(supabase);
    case "specific_users":
      return resolveSpecific(notification.target_user_ids ?? [], supabase);
    case "by_claw":
      return resolveByClaw(notification.target_filter, supabase);
    case "by_tier":
      return resolveByTier(notification.target_filter, supabase);
    default:
      return [];
  }
}

async function resolveAll(supabase: SupabaseClient): Promise<DeliveryTarget[]> {
  const { data } = await supabase
    .from("users")
    .select("id, telegram_user_id, email")
    .eq("is_active", true)
    .not("telegram_user_id", "is", null);

  return (data ?? []).map((u) => ({
    user_id: u.id,
    telegram_user_id: u.telegram_user_id,
    email: u.email,
  }));
}

async function resolveSpecific(
  userIds: string[],
  supabase: SupabaseClient,
): Promise<DeliveryTarget[]> {
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from("users")
    .select("id, telegram_user_id, email")
    .in("id", userIds)
    .not("telegram_user_id", "is", null);

  return (data ?? []).map((u) => ({
    user_id: u.id,
    telegram_user_id: u.telegram_user_id,
    email: u.email,
  }));
}

async function resolveByClaw(
  filter: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<DeliveryTarget[]> {
  const clawIds = (filter.claw_ids as string[]) ?? [];
  if (clawIds.length === 0) return [];

  const { data: tokens } = await supabase
    .from("nft_tokens")
    .select("owner_user_id")
    .in("claw_id", clawIds)
    .eq("is_active", true)
    .not("owner_user_id", "is", null);

  const uniqueIds = [...new Set((tokens ?? []).map((t) => t.owner_user_id))];
  return resolveSpecific(uniqueIds, supabase);
}

async function resolveByTier(
  filter: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<DeliveryTarget[]> {
  const minDirect = (filter.min_direct_referrals as number) ?? 0;

  const { data } = await supabase
    .from("users")
    .select("id, telegram_user_id, email")
    .gte("direct_referrals_count", minDirect)
    .eq("is_active", true)
    .not("telegram_user_id", "is", null);

  return (data ?? []).map((u) => ({
    user_id: u.id,
    telegram_user_id: u.telegram_user_id,
    email: u.email,
  }));
}
