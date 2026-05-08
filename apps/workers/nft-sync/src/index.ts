import { Hono } from "hono";
import type { Env } from "./types.js";
import { createSupabaseClient } from "./lib/supabase.js";
import { SyncProcessor } from "./services/sync-processor.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

app.post("/sync", async (c) => {
  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const supabase = createSupabaseClient(c.env);
  const processor = new SyncProcessor(supabase, c.env);
  const result = await processor.syncAll();

  return c.json({ success: true, ...result });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "openclaw-nft-sync" });
});

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const supabase = createSupabaseClient(env);
    const processor = new SyncProcessor(supabase, env);
    ctx.waitUntil(
      processor.syncAll().then((result) => {
        console.log("NFT sync completed:", JSON.stringify(result));
      }),
    );
  },
};
