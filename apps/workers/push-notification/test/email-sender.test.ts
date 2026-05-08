import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, buildEmailHtml } from "../src/services/email-sender.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockEnv = {
  RESEND_API_KEY: "re_test_key",
} as never;

describe("sendEmail", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends email successfully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const result = await sendEmail("test@test.com", "Subject", "<p>Body</p>", mockEnv);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Invalid API key" }),
    });

    const result = await sendEmail("test@test.com", "Subject", "<p>Body</p>", mockEnv);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });
});

describe("buildEmailHtml", () => {
  it("generates valid HTML with title and body", () => {
    const html = buildEmailHtml("Test Title", "Test body\nLine 2");

    expect(html).toContain("Test Title");
    expect(html).toContain("Test body");
    expect(html).toContain("<br>");
    expect(html).toContain("OPENCLAW");
  });
});
