import type { Env } from "../types.js";

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends an email via Resend API.
 * SPEC-08 §9: supplemental email for important notifications.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  env: Env,
): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "OPENCLAW <noreply@openclaw.com>",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });

    if (res.ok) {
      return { success: true };
    }
    const errData = (await res.json()) as { message?: string };
    return { success: false, error: errData.message ?? `HTTP ${res.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { success: false, error: message };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080202;color:#f0e6d6;font-family:'Noto Sans JP',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#8b0000,#d10202);padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:24px;color:#e8c878;">OPENCLAW</h1>
      <h2 style="margin:8px 0 0;font-size:16px;color:#f0e6d6;">${escapeHtml(title)}</h2>
    </div>
    <div style="background:#1a0808;padding:24px;border-radius:0 0 8px 8px;">
      ${escapeHtml(body).replace(/\n/g, "<br>")}
    </div>
    <div style="padding:16px;color:#6b5d50;font-size:12px;text-align:center;">
      <p>OPENCLAW Platform</p>
    </div>
  </div>
</body>
</html>`;
}
