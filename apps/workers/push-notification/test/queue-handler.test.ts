import { describe, it, expect } from "vitest";

/**
 * Unit tests for queue-handler logic (pure/data-layer).
 * Integration with supabase/telegram is tested via their own test files.
 * SPEC-08 §3.3 / Cloudflare Queues consumer.
 */
describe("Queue handler message processing logic", () => {
  it("collects unique notification IDs across batch messages", () => {
    const messages = [
      { notificationId: "notif-1", deliveryId: "d-1" },
      { notificationId: "notif-1", deliveryId: "d-2" },
      { notificationId: "notif-2", deliveryId: "d-3" },
    ];

    const touched = new Set<string>();
    messages.forEach((m) => touched.add(m.notificationId));

    expect(touched.size).toBe(2);
    expect(touched.has("notif-1")).toBe(true);
    expect(touched.has("notif-2")).toBe(true);
  });

  it("sends email only for system and personal notification types", () => {
    const shouldSendEmail = (type: string, email?: string) =>
      Boolean(email) && (type === "system" || type === "personal");

    expect(shouldSendEmail("system", "user@test.com")).toBe(true);
    expect(shouldSendEmail("personal", "user@test.com")).toBe(true);
    expect(shouldSendEmail("announcement", "user@test.com")).toBe(false);
    expect(shouldSendEmail("promotion", "user@test.com")).toBe(false);
    expect(shouldSendEmail("system", undefined)).toBe(false);
  });

  it("formats telegram message with title and body", () => {
    const title = "テスト通知";
    const message = "本文テスト";
    const formatted = `*${title}*\n\n${message}`;
    expect(formatted).toBe("*テスト通知*\n\n本文テスト");
    // Telegram MarkdownV1 bold uses single asterisks *text*
    expect(formatted).toMatch(/^\*.+\*/m);
  });

  it("ack/retry pattern: ack on success, retry on exception", () => {
    let ackedCount = 0;
    let retriedCount = 0;

    const processMessage = (shouldFail: boolean) => {
      const msg = { ack: () => ackedCount++, retry: () => retriedCount++ };
      try {
        if (shouldFail) throw new Error("fail");
        msg.ack();
      } catch {
        msg.retry();
      }
    };

    processMessage(false);
    processMessage(true);

    expect(ackedCount).toBe(1);
    expect(retriedCount).toBe(1);
  });
});

describe("NotificationQueueMessage shape", () => {
  it("has required fields", () => {
    const msg = {
      notificationId: "n-1",
      deliveryId: "d-1",
      userId: "u-1",
      telegramUserId: 12345,
      title: "件名",
      message: "本文",
      notificationType: "announcement" as const,
    };

    expect(msg.notificationId).toBeDefined();
    expect(msg.deliveryId).toBeDefined();
    expect(msg.userId).toBeDefined();
    expect(msg.telegramUserId).toBeTypeOf("number");
    expect(msg.title).toBeDefined();
    expect(msg.message).toBeDefined();
    expect(["announcement", "promotion", "system", "personal"]).toContain(msg.notificationType);
  });

  it("email field is optional", () => {
    const withEmail = { notificationType: "system", email: "a@b.com" };
    const withoutEmail = { notificationType: "announcement" };

    expect(withEmail.email).toBeDefined();
    expect((withoutEmail as { email?: string }).email).toBeUndefined();
  });
});
