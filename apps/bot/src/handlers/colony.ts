import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { getOrCreateSession } from "../services/auth-service.js";
import { getOwnedClaws } from "../services/nft-service.js";

export function createColonyHandler(env: Env) {
  return async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const supabase = getSupabase(env);
    const session = await getOrCreateSession(supabase, from.id, ctx.chat?.id ?? from.id);

    if (!session.is_linked || !session.user_id) {
      await ctx.reply("まだウォレットが紐付けられていません。\n/start <リンクコード> で紐付けてください。");
      return;
    }

    const owned = await getOwnedClaws(supabase, session.user_id);
    if (owned.length === 0) {
      await ctx.reply(
        "Claw を所有していません。\nhttps://openclaw.com/apply から購入できます。"
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const claw of owned) {
      const isActive = claw.clawId === session.active_claw_id;
      const label = `${isActive ? "✅ " : ""}No.${String(claw.clawNo).padStart(2, "0")} ${claw.nameJp}`;
      keyboard.text(label, `select_claw:${claw.clawId}`).row();
    }

    await ctx.reply(
      `⚔️ あなたのコロニー（${owned.length}体）\n\n` +
      "切り替えたい Claw を選んでください:",
      { reply_markup: keyboard }
    );
  };
}
