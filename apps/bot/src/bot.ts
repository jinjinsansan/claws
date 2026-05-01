import { Bot } from "grammy";
import type { Env } from "./env.js";
import { createStartHandler } from "./handlers/start.js";
import { createColonyHandler } from "./handlers/colony.js";
import { createCallbackHandler } from "./handlers/callback.js";
import { createMessageHandler } from "./handlers/message.js";
import { createHelpHandler } from "./handlers/help.js";
import { createStatusHandler } from "./handlers/status.js";

export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  // Commands
  bot.command("start", createStartHandler(env));
  bot.command("colony", createColonyHandler(env));
  bot.command("help", createHelpHandler());
  bot.command("status", createStatusHandler(env));

  // Callback queries (inline keyboard)
  bot.on("callback_query:data", createCallbackHandler(env));

  // Text messages (must be last)
  bot.on("message:text", createMessageHandler(env));

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  return bot;
}
