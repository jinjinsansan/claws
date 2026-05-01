import type { Context } from "grammy";
import type { Env } from "../env.js";
import { getSupabase } from "../lib/supabase.js";
import { chatCompletion } from "../lib/claude.js";
import { getOrCreateSession, updateSessionState } from "../services/auth-service.js";
import { hasActiveNft } from "../services/nft-service.js";
import { getClawById } from "../characters/registry.js";
import { buildSystemPrompt } from "../characters/system-prompts.js";
import { checkTone } from "../characters/tone-guard.js";
import { detectIntent } from "../services/intent-service.js";
import { saveMessage, getHistory } from "../services/conversation-service.js";

const MAX_TONE_RETRIES = 2;

export function createMessageHandler(env: Env) {
  return async (ctx: Context) => {
    const from = ctx.from;
    const text = ctx.message?.text;
    if (!from || !text) return;

    const supabase = getSupabase(env);
    const session = await getOrCreateSession(supabase, from.id, ctx.chat?.id ?? from.id);

    if (!session.is_linked || !session.user_id) {
      await ctx.reply(
        "まだウォレットが紐付けられていません。\n/start <リンクコード> で紐付けてください。"
      );
      return;
    }

    if (!(await hasActiveNft(supabase, session.user_id))) {
      await ctx.reply(
        "Claw NFT を所有していないため、会話できません。\nhttps://openclaw.com/apply から購入できます。"
      );
      return;
    }

    if (!session.active_claw_id) {
      await ctx.reply("アクティブな Claw が設定されていません。\n/colony で選択してください。");
      return;
    }

    const claw = await getClawById(supabase, session.active_claw_id);
    if (!claw) {
      await ctx.reply("Claw データの読み込みに失敗しました。");
      return;
    }

    const { intent } = detectIntent(text);

    if (intent === "help") {
      await ctx.reply(
        "⚔️ OPENCLAW Bot の使い方:\n\n" +
        "/colony — コロニー（Claw 切り替え）\n" +
        "/status — アカウント状態\n" +
        "/help — この画面\n\n" +
        "自由に話しかけると、あなたの Claw が商いのアドバイスをします。\n" +
        "「HP作って」と言うと、HP生成フローが始まります。"
      );
      return;
    }

    if (intent === "switch_claw") {
      await ctx.reply("/colony コマンドで Claw を切り替えられます。");
      return;
    }

    if (intent === "post_sns") {
      await ctx.reply("SNS 投稿機能は MVP2 で実装予定です。もうしばらくお待ちください！");
      return;
    }

    if (intent === "generate_hp") {
      await updateSessionState(supabase, session.id, "collecting_hp_info", {
        step: "business_name",
      });
      await ctx.reply(
        `${claw.name_jp}: HP生成だな。まず、商いの名前を教えてくれ。`
      );
      return;
    }

    if (session.conversation_state === "collecting_hp_info") {
      await handleHpFlow(ctx, env, session, claw, text);
      return;
    }

    // Default: chat with character
    await saveMessage(supabase, {
      botSessionId: session.id,
      userId: session.user_id,
      direction: "inbound",
      activeClawId: claw.id,
      content: text,
      telegramMessageId: ctx.message?.message_id,
    });

    const history = await getHistory(supabase, session.id, claw.id);
    history.push({ role: "user", content: text });

    const systemPrompt = buildSystemPrompt(claw);
    let response = await chatCompletion(env, systemPrompt, history);

    for (let retry = 0; retry < MAX_TONE_RETRIES; retry++) {
      const check = checkTone(claw, response.content);
      if (check.passed) break;

      const retryMessages = [
        ...history,
        { role: "assistant" as const, content: response.content },
        {
          role: "user" as const,
          content: `[システム] 前の応答はキャラクター設定に違反しています: ${check.violations.join("、")}。設定を守って言い直してください。`,
        },
      ];
      response = await chatCompletion(env, systemPrompt, retryMessages);
    }

    await saveMessage(supabase, {
      botSessionId: session.id,
      userId: session.user_id,
      direction: "outbound",
      activeClawId: claw.id,
      content: response.content,
      llmModel: response.model,
      llmTokensUsed: response.inputTokens + response.outputTokens,
      llmCostUsd: estimateCost(response.inputTokens, response.outputTokens),
    });

    await updateSessionState(supabase, session.id, "idle");
    await ctx.reply(response.content);
  };
}

async function handleHpFlow(
  ctx: Context,
  env: Env,
  session: { id: string; user_id: string | null; state_data: Record<string, unknown> },
  claw: { id: string; name_jp: string; dossier: Record<string, string> },
  text: string
): Promise<void> {
  const supabase = getSupabase(env);
  const state = session.state_data as { step: string; business_name?: string; business_type?: string; description?: string };

  switch (state.step) {
    case "business_name":
      await updateSessionState(supabase, session.id, "collecting_hp_info", {
        ...state,
        step: "business_type",
        business_name: text,
      });
      await ctx.reply(`${claw.name_jp}: 「${text}」だな。業種は何だ？`);
      break;

    case "business_type":
      await updateSessionState(supabase, session.id, "collecting_hp_info", {
        ...state,
        step: "description",
        business_type: text,
      });
      await ctx.reply(`${claw.name_jp}: ${text}か。商いの特徴やアピールしたい点を教えてくれ。`);
      break;

    case "description":
      await updateSessionState(supabase, session.id, "idle", {});

      if (env.HP_GENERATOR_URL && env.HP_GENERATOR_API_KEY && session.user_id) {
        await ctx.reply(
          `${claw.name_jp}: 了解した。HP を生成する。少し待て。\n\n` +
          `📋 商い名: ${state.business_name}\n` +
          `📋 業種: ${state.business_type}\n` +
          `📋 特徴: ${text}`
        );
        try {
          const res = await fetch(`${env.HP_GENERATOR_URL}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.HP_GENERATOR_API_KEY}`,
            },
            body: JSON.stringify({
              userId: session.user_id,
              clawId: claw.id,
              clawNo: 0,
              businessName: state.business_name,
              businessType: state.business_type,
              businessDescription: text,
            }),
          });
          const result = await res.json() as { url?: string; status?: string; error?: string };
          if (result.url) {
            await ctx.reply(`${claw.name_jp}: HP の生成を開始した。完了次第ここに連絡する。\n🔗 ${result.url}`);
          } else {
            await ctx.reply(`${claw.name_jp}: HP 生成の開始に失敗した。${result.error ?? ""}`);
          }
        } catch {
          await ctx.reply(`${claw.name_jp}: HP Generator への接続に失敗した。後で試してくれ。`);
        }
      } else {
        await ctx.reply(
          `${claw.name_jp}: 了解した。HP を生成する準備ができた。\n\n` +
          `📋 商い名: ${state.business_name}\n` +
          `📋 業種: ${state.business_type}\n` +
          `📋 特徴: ${text}\n\n` +
          `⚠️ HP Generator Worker が未接続です。デプロイ後に利用可能になります。`
        );
      }
      break;

    default:
      await updateSessionState(supabase, session.id, "idle", {});
      await ctx.reply("HP 生成フローをリセットしました。もう一度「HP作って」と言ってください。");
  }
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet pricing: $3/1M input, $15/1M output (approximate)
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
