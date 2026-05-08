import { createSupabaseClient } from "../lib/supabase.js";
import { sendTelegram } from "../services/telegram-sender.js";
import { buildEmailHtml, sendEmail } from "../services/email-sender.js";
import { DeliveryTracker } from "../services/delivery-tracker.js";
import type { Env, NotificationQueueMessage } from "../types.js";

export async function handleQueueBatch(
  batch: MessageBatch<NotificationQueueMessage>,
  env: Env,
): Promise<void> {
  const supabase = createSupabaseClient(env);
  const tracker = new DeliveryTracker(supabase);
  const touchedNotifications = new Set<string>();

  for (const message of batch.messages) {
    const payload = message.body;
    touchedNotifications.add(payload.notificationId);

    try {
      const telegramResult = await sendTelegram(
        payload.telegramUserId,
        `*${payload.title}*\n\n${payload.message}`,
        env,
      );

      if (telegramResult.success) {
        await tracker.markDelivered(payload.deliveryId, {
          telegram_message_id: telegramResult.messageId,
        });
      } else {
        await tracker.markFailed(payload.deliveryId, telegramResult.error ?? "Telegram send failed");
      }

      if (
        payload.email &&
        (payload.notificationType === "system" || payload.notificationType === "personal")
      ) {
        await sendEmail(
          payload.email,
          payload.title,
          buildEmailHtml(payload.title, payload.message),
          env,
        );
      }

      message.ack();
    } catch (error) {
      console.error("Queue delivery failed:", error);
      message.retry();
    }
  }

  for (const notificationId of touchedNotifications) {
    await tracker.updateNotificationStats(notificationId);
  }
}
