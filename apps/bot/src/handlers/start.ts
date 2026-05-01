import type { Context } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { getOrCreateSession, linkWallet } from "../services/auth-service.js";
import { getOwnedClaws } from "../services/nft-service.js";
import { getAllClaws } from "../characters/registry.js";
import { setActiveClaw } from "../services/auth-service.js";

export function createStartHandler(env: Env) {
  return async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const supabase = getSupabase(env);
    const session = await getOrCreateSession(supabase, from.id, ctx.chat?.id ?? from.id);

    const args = ctx.message?.text?.split(" ").slice(1) ?? [];
    const linkCode = args[0];

    if (linkCode && !session.is_linked) {
      const result = await linkWallet(supabase, from.id, linkCode);
      if (result.success && result.userId) {
        const owned = await getOwnedClaws(supabase, result.userId);
        if (owned.length > 0) {
          await setActiveClaw(supabase, session.id, owned[0].clawId);
          await ctx.reply(
            `🔗 ウォレット紐付け完了！\n\n` +
            `あなたの Claw:\n` +
            owned.map((c) => `  No.${String(c.clawNo).padStart(2, "0")} ${c.nameJp}（${c.nameEn}）`).join("\n") +
            `\n\n${owned[0].nameJp} がアクティブです。話しかけてみてください！`
          );
        } else {
          await ctx.reply(
            "🔗 ウォレット紐付け完了！\n\n" +
            "まだ Claw を所有していません。\nhttps://openclaw.com/apply から購入できます。"
          );
        }
        return;
      } else {
        await ctx.reply(`❌ ${result.error ?? "リンクに失敗しました"}`);
        return;
      }
    }

    if (session.is_linked) {
      await ctx.reply(
        "✅ あなたは既に紐付け済みです。\n\n" +
        "Claw に話しかけるか、/colony でキャラクターを切り替えられます。"
      );
      return;
    }

    const claws = await getAllClaws(supabase);
    const clawList = claws.slice(0, 5).map((c) =>
      `  No.${String(c.claw_no).padStart(2, "0")} ${c.name_jp}（${c.name_en}）`
    ).join("\n");

    await ctx.reply(
      "⚔️ OPENCLAW Bot へようこそ！\n\n" +
      "あなたの Claw 戦士と会話し、商いを支援します。\n\n" +
      `🐉 戦士一覧（一部）:\n${clawList}\n  ...他 ${claws.length - 5} 体\n\n` +
      "まずウォレットを紐付けてください:\n" +
      "1. https://openclaw.com にログイン\n" +
      "2. 会員エリアの「Telegram 連携」からリンクコードを取得\n" +
      "3. /start <リンクコード> で紐付け"
    );
  };
}
