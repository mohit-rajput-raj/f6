import type { Request, Response } from "express";
import { emailService } from "./email.service.js";

export class EmailController {
  /**
   * POST /api/v1/email/send-batch
   * Send batch emails via nodemailer with SMTP config or server defaults.
   */
  async sendBatch(req: Request, res: Response) {
    const { recipients, smtp_config, key_column_name } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        summary: { total: 0, sent: 0, failed: 0 },
        table: { columns: [key_column_name || "Key", "Status", "Email", "Details", "SentAt"], data: [] },
        errors: [{ key: "", email: "", status: 400, error: "No recipients provided" }],
      });
    }

    try {
      const result = await emailService.sendBatch(
        recipients,
        smtp_config,
        key_column_name || "Key",
      );
      res.json(result);
    } catch (err: any) {
      console.error("[email] sendBatch error:", err);
      res.status(500).json({
        success: false,
        summary: { total: recipients.length, sent: 0, failed: recipients.length },
        table: { columns: [key_column_name || "Key", "Status", "Email", "Details", "SentAt"], data: [] },
        errors: [{ key: "", email: "", status: 500, error: err.message || String(err) }],
      });
    }
  }

  /**
   * POST /api/v1/email/test-smtp
   * Test SMTP connection without sending any email.
   */
  async testSmtp(req: Request, res: Response) {
    const { smtp_config } = req.body;
    const effectiveSmtp = emailService.resolveSmtpConfig(smtp_config);

    if (!effectiveSmtp.user || !effectiveSmtp.password) {
      return res.status(400).json({
        success: false,
        error: "SMTP credentials (user & password) are required. For Gmail, use your Gmail address and 16-character Google App Password.",
      });
    }

    try {
      const transporter = emailService.createTransporter(effectiveSmtp);
      await transporter.verify();
      try { transporter.close(); } catch {}

      res.json({
        success: true,
        message: `SMTP connection to ${effectiveSmtp.host}:${effectiveSmtp.port} verified successfully!`,
      });
    } catch (err: any) {
      const isGmail = (effectiveSmtp.host || "").toLowerCase().includes("gmail");
      const hint = isGmail
        ? " (For Gmail, make sure 2-Step Verification is ON and generate a 16-character App Password at myaccount.google.com/apppasswords)"
        : "";
      res.status(400).json({
        success: false,
        error: `SMTP verification failed: ${err.message || String(err)}${hint}`,
      });
    }
  }
}

export const emailController = new EmailController();
