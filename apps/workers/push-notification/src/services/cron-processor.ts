import { createSupabaseClient } from "../lib/supabase.js";
import { resolveTargets } from "./target-resolver.js";
import { sendTelegram } from "./telegram-sender.js";
import { sendEmail, buildEmailHtml } from "./email-sender.js";
import { DeliveryTracker } from "./delivery-tracker.js";
import type { Env } from "../types.js";

/**
 * Cron processor: runs every minute to process scheduled notifications.
 * SPEC-08 §8.2
 */
export async function processScheduledNotifications(env: Env): Promise<void> {
  const supabase = createSupabaseClient(env);

  const { data: notifications, error } = await supabase
    .from("push_notifications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(10);

  if (error) {
    console.error("Cron fetch error:", error.message);
    return;
  }

  if (!notifications || notifications.length === 0) return;

  const rateLimit = parseInt(env.RATE_LIMIT_PER_SECOND, 10) || 20;
  const tracker = new DeliveryTracker(supabase);

  for (const notification of notifications) {
    await supabase
      .from("push_notifications")
      .update({ status: "sending" })
      .eq("id", notification.id);

    const targets = await resolveTargets(notification, supabase);

    await supabase
      .from("push_notifications")
      .update({ total_targets: targets.length })
      .eq("id", notification.id);

    if (env.NOTIFICATION_QUEUE) {
      for (const target of targets) {
        const deliveryId = await tracker.createDelivery(
          notification.id,
          target.user_id,
          target.telegram_user_id,
        );

        await env.NOTIFICATION_QUEUE.send({
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

      await supabase.from("audit_logs").insert({
        action: "push_notification_queued",
        actor_type: "system",
        entity_type: "push_notification",
        entity_id: notification.id,
        metadata: {
          title: notification.title,
          target_type: notification.target_type,
          total_targets: targets.length,
        },
      });
      continue;
    }

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
            env,
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
              env,
            );
          }
        }),
      );

      if (i + rateLimit < targets.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await tracker.updateNotificationStats(notification.id);

    await supabase.from("audit_logs").insert({
      action: "push_notification_sent",
      actor_type: "system",
      entity_type: "push_notification",
      entity_id: notification.id,
      metadata: {
        title: notification.title,
        target_type: notification.target_type,
        total_targets: targets.length,
      },
    });
  }
}
