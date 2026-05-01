import type { Context } from "grammy";

export function createHelpHandler() {
  return async (ctx: Context) => {
    await ctx.reply(
      "⚔️ OPENCLAW Bot — 使い方\n\n" +
      "📜 コマンド一覧:\n" +
      "/start <コード> — ウォレット紐付け\n" +
      "/colony — コロニー（Claw 切り替え）\n" +
      "/status — アカウント情報\n" +
      "/help — この画面\n\n" +
      "💬 会話:\n" +
      "自由に話しかけると、アクティブな Claw が応答します。\n\n" +
      "🏠 HP生成:\n" +
      "「HP作って」と送ると、HP 生成フローが始まります。\n\n" +
      "🔗 詳しくは https://openclaw.com をご覧ください。"
    );
  };
}
