import { Hono } from "hono";
import type { Env } from "./types.js";
import { handleGenerate } from "./routes/generate.js";
import { handleStatus } from "./routes/status.js";
import { handleUpdate } from "./routes/update.js";
import { handleDelete, handleSuspend } from "./routes/delete.js";

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

// Auth middleware
app.use("/*", async (c, next) => {
  // Health check is public
  if (c.req.path === "/health") return next();

  const authHeader = c.req.header("Authorization");
  const expected = `Bearer ${c.env.HP_GENERATOR_API_KEY}`;

  if (!authHeader || authHeader !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

app.get("/health", (c) => c.json({ status: "ok", service: "openclaw-hp-generator" }));

app.post("/generate", handleGenerate);
app.get("/status/:siteId", handleStatus);
app.post("/update", handleUpdate);
app.delete("/sites/:siteId", handleDelete);
app.post("/sites/:siteId/suspend", handleSuspend);

export default app;
