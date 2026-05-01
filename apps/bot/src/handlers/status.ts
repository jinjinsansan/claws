import type { Context } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { getOrCreateSession } from "../services/auth-service.js";
import { getOwnedClaws } from "../services/nft-service.js";
import { getClawById } from "../characters/registry.js";

export function createStatusHandler(env: Env) {
  return async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const supabase = getSupabase(env);
    const session = await getOrCreateSession(supabase, from.id, ctx.chat?.id ?? from.id);

    if (!session.is_linked || !session.user_id) {
      await ctx.reply(
        "📊 ステータス\n\n" +
        "🔗 紐付け: 未完了\n" +
        "🐉 所有 Claw: —\n\n" +
        "/start <リンクコード> で紐付けてください。"
      );
      return;
    }

    const owned = await getOwnedClaws(supabase, session.user_id);
    let activeName = "未選択";
    if (session.active_claw_id) {
      const active = await getClawById(supabase, session.active_claw_id);
      if (active) activeName = `${active.name_jp}（${active.name_en}）`;
    }

    const clawList = owned.length > 0
      ? owned.map((c) => `  No.${String(c.clawNo).padStart(2, "0")} ${c.nameJp}`).join("\n")
      : "なし";

    await ctx.reply(
      "📊 ステータス\n\n" +
      `🔗 紐付け: ✅ 完了\n` +
      `🐉 所有 Claw: ${owned.length}体\n${clawList}\n` +
      `⚔️ アクティブ: ${activeName}\n\n` +
      "/colony で切り替え可能"
    );
  };
}
