import type { Env } from "../types.js";

export async function notifyAdminError(message: string, env: Env): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `[OPENCLAW Reward] ${message}` }),
    });
  } catch {
    console.error("Failed to send Discord notification");
  }
}
