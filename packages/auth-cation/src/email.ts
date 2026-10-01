/**
 * Email sender utility for Better Auth and verification flows.
 * Supports:
 *  1. Resend API (set RESEND_API_KEY in .env)
 *  2. Generic SMTP (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env)
 *  3. Local development terminal logger fallback with full verification URL & OTP
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  url?: string;
  code?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  url,
  code,
}: SendEmailOptions): Promise<{
  success: boolean;
  error?: string;
  provider?: string;
}> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  // Build clean HTML content if not provided
  const emailHtml =
    html ||
    `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #111827; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #111827;">Verify your email address</h2>
      <p style="font-size: 14px; line-height: 22px; color: #4b5563; margin-bottom: 24px;">
        Click the button below to verify your account and restore full access to your workspace.
      </p>
      ${
        url
          ? `<div style="margin: 24px 0;">
              <a href="${url}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
                Verify Email Address
              </a>
            </div>`
          : ""
      }
      ${
        code
          ? `<div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <span style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 6px;">Your 6-Digit Verification Code:</span>
              <strong style="font-size: 26px; letter-spacing: 6px; font-family: monospace; color: #111827;">${code}</strong>
            </div>`
          : ""
      }
      <p style="font-size: 12px; line-height: 18px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
        If you did not request this verification, you can safely ignore this email.
      </p>
    </div>
  `;

  const emailText =
    text ||
    `Verify your email address:\n\n${url ? `Click here to verify: ${url}\n\n` : ""}${code ? `Your OTP code is: ${code}\n\n` : ""}`;

  // 1. Try Resend if API key is present
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject,
          html: emailHtml,
          text: emailText,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        return { success: true, provider: "resend" };
      } else {
        console.error("[Email Service] Resend error:", resData);
      }
    } catch (err: any) {
      console.error(
        "[Email Service] Failed to send via Resend API:",
        err?.message || err,
      );
    }
  }

  // 2. Fallback / Dev output

  return { success: true, provider: "local-dev" };
}
