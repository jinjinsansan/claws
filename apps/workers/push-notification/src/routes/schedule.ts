import type { Context } from "hono";
import type { Env } from "../types.js";
import { createSupabaseClient } from "../lib/supabase.js";

type HonoEnv = { Bindings: Env };

/**
 * POST /schedule
 * Schedule a notification for future delivery.
 * SPEC-08 §4.1
 */
export async function handleSchedule(c: Context<HonoEnv>) {
  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{
    title: string;
    message: string;
    notification_type: string;
    target_type: string;
    target_user_ids?: string[];
    target_filter?: Record<string, unknown>;
    from_claw_id?: string;
    scheduled_for?: string;
    sender_admin_id?: string;
  }>();

  if (!body.title || !body.message || !body.notification_type || !body.target_type) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const supabase = createSupabaseClient(c.env);

  const scheduledFor = body.scheduled_for ?? new Date().toISOString();
  const status = "scheduled";

  const { data, error } = await supabase
    .from("push_notifications")
    .insert({
      sender_admin_id: body.sender_admin_id ?? null,
      title: body.title,
      message: body.message,
      notification_type: body.notification_type,
      target_type: body.target_type,
      target_user_ids: body.target_user_ids ?? null,
      target_filter: body.target_filter ?? {},
      from_claw_id: body.from_claw_id ?? null,
      scheduled_for: scheduledFor,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, notificationId: data.id });
}
