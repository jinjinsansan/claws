export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  RESEND_API_KEY: string;
  API_SECRET: string;
  RATE_LIMIT_PER_SECOND: string;
  NOTIFICATION_QUEUE?: Queue<NotificationQueueMessage>;
}

export type NotificationType = "announcement" | "promotion" | "system" | "personal";
export type TargetType = "all" | "specific_users" | "by_claw" | "by_tier";
export type NotificationStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type DeliveryStatus = "pending" | "delivered" | "failed" | "read";

export interface NotificationQueueMessage {
  notificationId: string;
  deliveryId: string;
  userId: string;
  telegramUserId: number;
  email?: string;
  title: string;
  message: string;
  notificationType: NotificationType;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  target_type: TargetType;
  target_filter: Record<string, unknown>;
  target_user_ids: string[] | null;
  from_claw_id: string | null;
  scheduled_for: string | null;
  status: NotificationStatus;
}

export interface DeliveryTarget {
  user_id: string;
  telegram_user_id: number;
  email?: string;
}
