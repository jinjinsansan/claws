import type { Context } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { getOrCreateSession, setActiveClaw } from "../services/auth-service.js";
import { getClawById } from "../characters/registry.js";

export function createCallbackHandler(env: Env) {
  return async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !ctx.from) return;

    if (data.startsWith("select_claw:")) {
      const clawId = data.replace("select_claw:", "");
      const supabase = getSupabase(env);
      const session = await getOrCreateSession(supabase, ctx.from.id, ctx.chat?.id ?? ctx.from.id);

      await setActiveClaw(supabase, session.id, clawId);
      const claw = await getClawById(supabase, clawId);

      if (claw) {
        const catchphrase = claw.dossier["Catchphrase"] ?? "";
        await ctx.answerCallbackQuery({ text: `${claw.name_jp} に切り替えました` });
        await ctx.editMessageText(
          `⚔️ ${claw.name_jp}（${claw.name_en}）がアクティブになりました\n\n${catchphrase}\n\n話しかけてみてください！`
        );
      } else {
        await ctx.answerCallbackQuery({ text: "Claw が見つかりません" });
      }
    }
  };
}
