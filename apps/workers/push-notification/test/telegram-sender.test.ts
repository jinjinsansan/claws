import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTelegram } from "../src/services/telegram-sender.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockEnv = {
  TELEGRAM_BOT_TOKEN: "test-bot-token",
} as never;

describe("sendTelegram", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends message successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true, result: { message_id: 123 } }),
    });

    const result = await sendTelegram(12345, "Hello", mockEnv);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe(123);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-bot-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("12345"),
      }),
    );
  });

  it("handles Telegram API error", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({ ok: false, description: "Bot was blocked by the user" }),
    });

    const result = await sendTelegram(12345, "Hello", mockEnv);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Bot was blocked by the user");
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await sendTelegram(12345, "Hello", mockEnv);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection refused");
  });
});
