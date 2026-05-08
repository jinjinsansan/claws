import type { Context } from "hono";
import type { Env } from "../types.js";
import { createSupabaseClient } from "../lib/supabase.js";

type HonoEnv = { Bindings: Env };

/**
 * GET /status/:id
 * Get delivery status for a notification.
 * SPEC-08 §11
 */
export async function handleStatus(c: Context<HonoEnv>) {
  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  const supabase = createSupabaseClient(c.env);

  const { data: notification, error } = await supabase
    .from("push_notifications")
    .select("id, title, status, total_targets, total_delivered, total_failed, sent_at, created_at")
    .eq("id", id)
    .single();

  if (error || !notification) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(notification);
}
