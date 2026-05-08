import type { SupabaseClient } from "@supabase/supabase-js";

export class DeliveryTracker {
  constructor(private supabase: SupabaseClient) {}

  async createDelivery(
    notificationId: string,
    userId: string,
    telegramUserId: number,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("notification_deliveries")
      .insert({
        push_notification_id: notificationId,
        user_id: userId,
        telegram_user_id: telegramUserId,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create delivery: ${error.message}`);
    return data.id;
  }

  async markDelivered(deliveryId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.supabase
      .from("notification_deliveries")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        metadata: metadata ?? {},
      })
      .eq("id", deliveryId);
  }

  async markFailed(deliveryId: string, reason: string): Promise<void> {
    await this.supabase
      .from("notification_deliveries")
      .update({
        status: "failed",
        failed_reason: reason,
      })
      .eq("id", deliveryId);
  }

  async updateNotificationStats(notificationId: string): Promise<void> {
    const { count: delivered } = await this.supabase
      .from("notification_deliveries")
      .select("*", { count: "exact", head: true })
      .eq("push_notification_id", notificationId)
      .eq("status", "delivered");

    const { count: failed } = await this.supabase
      .from("notification_deliveries")
      .select("*", { count: "exact", head: true })
      .eq("push_notification_id", notificationId)
      .eq("status", "failed");

    const { count: total } = await this.supabase
      .from("notification_deliveries")
      .select("*", { count: "exact", head: true })
      .eq("push_notification_id", notificationId);

    const allDone = (delivered ?? 0) + (failed ?? 0) >= (total ?? 0);

    await this.supabase
      .from("push_notifications")
      .update({
        total_delivered: delivered ?? 0,
        total_failed: failed ?? 0,
        ...(allDone ? { status: "sent", sent_at: new Date().toISOString() } : {}),
      })
      .eq("id", notificationId);
  }
}
