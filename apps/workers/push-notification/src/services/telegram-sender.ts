import type { Env } from "../types.js";

interface SendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Sends a Telegram message directly via Bot API.
 * SPEC-08 §7
 */
export async function sendTelegram(
  telegramUserId: number,
  text: string,
  env: Env,
): Promise<SendResult> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramUserId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    }
    return { success: false, error: data.description ?? "Unknown Telegram error" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { success: false, error: message };
  }
}
