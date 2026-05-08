import type { Context } from "hono";
import type { Env } from "../types.js";
import { createSupabaseClient } from "../lib/supabase.js";
import { resolveTargets } from "../services/target-resolver.js";
import { sendTelegram } from "../services/telegram-sender.js";
import { sendEmail, buildEmailHtml } from "../services/email-sender.js";
import { DeliveryTracker } from "../services/delivery-tracker.js";

type HonoEnv = { Bindings: Env };

/**
 * POST /send
 * Immediately send a notification (used for system/personal notifications).
 * SPEC-08 §3.3
 */
export async function handleSend(c: Context<HonoEnv>) {
  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ notificationId: string }>();
  if (!body.notificationId) {
    return c.json({ error: "Missing notificationId" }, 400);
  }

  const supabase = createSupabaseClient(c.env);
  const tracker = new DeliveryTracker(supabase);

  const { data: notification, error } = await supabase
    .from("push_notifications")
    .select("*")
    .eq("id", body.notificationId)
    .single();

  if (error || !notification) {
    return c.json({ error: "Notification not found" }, 404);
  }

  await supabase
    .from("push_notifications")
    .update({ status: "sending" })
    .eq("id", notification.id);

  const targets = await resolveTargets(notification, supabase);

  await supabase
    .from("push_notifications")
    .update({ total_targets: targets.length })
    .eq("id", notification.id);

  if (c.env.NOTIFICATION_QUEUE) {
    for (const target of targets) {
      const deliveryId = await tracker.createDelivery(
        notification.id,
        target.user_id,
        target.telegram_user_id,
      );

      await c.env.NOTIFICATION_QUEUE.send({
        notificationId: notification.id,
        deliveryId,
        userId: target.user_id,
        telegramUserId: target.telegram_user_id,
        email: target.email,
        title: notification.title,
        message: notification.message,
        notificationType: notification.notification_type,
      });
    }

    return c.json({
      success: true,
      mode: "queue",
      total_targets: targets.length,
      queued: targets.length,
    });
  }

  const rateLimit = parseInt(c.env.RATE_LIMIT_PER_SECOND, 10) || 20;
  let processed = 0;

  for (let i = 0; i < targets.length; i += rateLimit) {
    const batch = targets.slice(i, i + rateLimit);

    await Promise.all(
      batch.map(async (target) => {
        const deliveryId = await tracker.createDelivery(
          notification.id,
          target.user_id,
          target.telegram_user_id,
        );

        const result = await sendTelegram(
          target.telegram_user_id,
          `*${notification.title}*\n\n${notification.message}`,
          c.env,
        );

        if (result.success) {
          await tracker.markDelivered(deliveryId, {
            telegram_message_id: result.messageId,
          });
        } else {
          await tracker.markFailed(deliveryId, result.error ?? "Unknown");
        }

        if (
          target.email &&
          (notification.notification_type === "system" ||
            notification.notification_type === "personal")
        ) {
          await sendEmail(
            target.email,
            notification.title,
            buildEmailHtml(notification.title, notification.message),
            c.env,
          );
        }

        processed++;
      }),
    );

    if (i + rateLimit < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await tracker.updateNotificationStats(notification.id);

  return c.json({
    success: true,
    total_targets: targets.length,
    processed,
  });
}
