import type { Context } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { getOrCreateSession, setActiveClaw } from "../services/auth-service.js";
import { getOwnedClaws } from "../services/nft-service.js";
import { getClawById } from "../characters/registry.js";

export function createSelectHandler(env: Env) {
  return async (ctx: Context) => {
    const from = ctx.from;
    const text = ctx.message?.text ?? "";
    if (!from) return;

    const supabase = getSupabase(env);
    const session = await getOrCreateSession(supabase, from.id, ctx.chat?.id ?? from.id);

    if (!session.is_linked || !session.user_id) {
      await ctx.reply("まだウォレットが紐付けられていません。\n/start <リンクコード> で紐付けてください。");
      return;
    }

    const arg = text.split(" ")[1]?.trim();
    if (!arg) {
      await ctx.reply("使い方: /select <番号>\n例: /select 10\n\nまたは /colony で一覧から選択できます。");
      return;
    }

    const clawNo = Number(arg);
    if (!Number.isInteger(clawNo) || clawNo < 1 || clawNo > 30) {
      await ctx.reply("番号は 1〜30 で指定してください。例: /select 10");
      return;
    }

    const owned = await getOwnedClaws(supabase, session.user_id);
    const target = owned.find((c) => c.clawNo === clawNo);
    if (!target) {
      await ctx.reply(`No.${String(clawNo).padStart(2, "0")} は所持していません。/colony で所持Clawを確認してください。`);
      return;
    }

    await setActiveClaw(supabase, session.id, target.clawId);
    const claw = await getClawById(supabase, target.clawId);
    const catchphrase = claw?.dossier["Catchphrase"] ?? "";

    await ctx.reply(
      `⚔️ No.${String(target.clawNo).padStart(2, "0")} ${target.nameJp}（${target.nameEn}）に切り替えました。\n` +
      `${catchphrase}\n\n` +
      "話しかけてみてください！",
    );
  };
}
