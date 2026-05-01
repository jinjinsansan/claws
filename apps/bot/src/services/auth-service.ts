import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotSession } from "../types.js";

export async function getOrCreateSession(
  supabase: SupabaseClient,
  telegramUserId: number,
  telegramChatId: number
): Promise<BotSession> {
  const { data: existing } = await supabase
    .from("bot_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (existing) return existing as BotSession;

  const { data: created, error } = await supabase
    .from("bot_sessions")
    .insert({
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      conversation_state: "idle",
      state_data: {},
      is_linked: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return created as BotSession;
}

export async function linkWallet(
  supabase: SupabaseClient,
  telegramUserId: number,
  linkCode: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const { data: request } = await supabase
    .from("telegram_link_requests")
    .select("*")
    .eq("code", linkCode)
    .eq("used", false)
    .single();

  if (!request) return { success: false, error: "無効なリンクコードです" };

  const now = new Date();
  if (new Date(request.expires_at) < now) {
    return { success: false, error: "リンクコードの有効期限が切れています" };
  }

  const { error: updateReqError } = await supabase
    .from("telegram_link_requests")
    .update({ used: true, used_at: now.toISOString() })
    .eq("id", request.id);

  if (updateReqError) return { success: false, error: "リンク処理に失敗しました" };

  const { error: updateSessionError } = await supabase
    .from("bot_sessions")
    .update({
      user_id: request.user_id,
      is_linked: true,
      linked_at: now.toISOString(),
    })
    .eq("telegram_user_id", telegramUserId);

  if (updateSessionError) return { success: false, error: "セッション更新に失敗しました" };

  return { success: true, userId: request.user_id };
}

export async function updateSessionState(
  supabase: SupabaseClient,
  sessionId: string,
  state: string,
  stateData?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = {
    conversation_state: state,
    last_message_at: new Date().toISOString(),
  };
  if (stateData !== undefined) update.state_data = stateData;

  await supabase.from("bot_sessions").update(update).eq("id", sessionId);
}

export async function setActiveClaw(
  supabase: SupabaseClient,
  sessionId: string,
  clawId: string
): Promise<void> {
  await supabase
    .from("bot_sessions")
    .update({ active_claw_id: clawId })
    .eq("id", sessionId);
}
