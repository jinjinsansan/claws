import { Hono } from "hono";
import type { Env } from "./types.js";
import { handleSend } from "./routes/send.js";
import { handleSchedule } from "./routes/schedule.js";
import { handleStatus } from "./routes/status.js";
import { processScheduledNotifications } from "./services/cron-processor.js";
import { handleQueueBatch } from "./handlers/queue-handler.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

app.post("/send", handleSend);
app.post("/schedule", handleSchedule);
app.get("/status/:id", handleStatus);

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "openclaw-push-notification" });
});

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(processScheduledNotifications(env));
  },

  async queue(
    batch: MessageBatch<import("./types.js").NotificationQueueMessage>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleQueueBatch(batch, env));
  },
};
