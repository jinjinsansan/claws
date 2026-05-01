import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotMessage, MessageDirection, ContentType } from "../types.js";

const MAX_HISTORY = 20;

export async function saveMessage(
  supabase: SupabaseClient,
  params: {
    botSessionId: string;
    userId: string | null;
    direction: MessageDirection;
    activeClawId: string | null;
    content: string;
    contentType?: ContentType;
    telegramMessageId?: number;
    llmModel?: string;
    llmTokensUsed?: number;
    llmCostUsd?: number;
  }
): Promise<void> {
  await supabase.from("bot_messages").insert({
    bot_session_id: params.botSessionId,
    user_id: params.userId,
    direction: params.direction,
    active_claw_id: params.activeClawId,
    content: params.content,
    content_type: params.contentType ?? "text",
    telegram_message_id: params.telegramMessageId ?? null,
    llm_model: params.llmModel ?? null,
    llm_tokens_used: params.llmTokensUsed ?? null,
    llm_cost_usd: params.llmCostUsd ?? null,
  });
}

export async function getHistory(
  supabase: SupabaseClient,
  botSessionId: string,
  clawId: string | null
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  let query = supabase
    .from("bot_messages")
    .select("direction, content")
    .eq("bot_session_id", botSessionId)
    .eq("content_type", "text")
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  if (clawId) {
    query = query.eq("active_claw_id", clawId);
  }

  const { data } = await query;
  if (!data) return [];

  return data
    .reverse()
    .map((msg: { direction: string; content: string }) => ({
      role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
      content: msg.content,
    }));
}
