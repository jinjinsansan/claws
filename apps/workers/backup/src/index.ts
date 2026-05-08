import { Hono } from "hono";
import type { Env } from "./types.js";
import { performDailyBackup } from "./handlers/daily-backup.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

app.post("/backup", async (c) => {
  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await performDailyBackup(c.env);
  return c.json({ success: true, ...result });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "openclaw-backup" });
});

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      performDailyBackup(env).then((result) => {
        console.log("Backup completed:", JSON.stringify(result));
      }),
    );
  },
};
