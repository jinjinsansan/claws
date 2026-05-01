import { webhookCallback } from "grammy";
import { Hono } from "hono";
import type { Env } from "./env.js";
import { createBot } from "./bot.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

app.post("/webhook", async (c) => {
  const env = c.env;
  const bot = createBot(env);
  const handler = webhookCallback(bot, "hono");
  return handler(c);
});

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "openclaw-bot" });
});

// Webhook setup endpoint (call once to register)
app.get("/setup", async (c) => {
  const env = c.env;
  const bot = createBot(env);
  const webhookUrl = new URL("/webhook", c.req.url).toString();
  await bot.api.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
  });
  return c.json({ ok: true, webhook: webhookUrl });
});

export default app;
