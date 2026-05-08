import { Hono } from "hono";
import type { Env } from "./types.js";
import { handleOnPurchase } from "./handlers/on-purchase.js";
import { executeDailyDistribution } from "./handlers/daily-batch.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

app.post("/on-purchase", handleOnPurchase);

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "openclaw-reward-calculator" });
});

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(executeDailyDistribution(env));
  },
};
