import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { config } from "../../config/env.js";

// ─── Types ──────────────────────────────────────────────────
export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  from_email?: string;
  use_tls?: boolean;
}

export interface EmailAttachment {
  filename: string;
  content_base64?: string;
  mime_type?: string;
  url?: string;
  path?: string;
}

export interface EmailRecipient {
  key?: string;
  email: string;
  subject?: string;
  body?: string;
  is_html?: boolean;
  attachments?: EmailAttachment[];
}

export interface EmailResultRow {
  key: string;
  status: string;
  email: string;
  details: string;
  sentAt: string;
}

export interface SendBatchResult {
  success: boolean;
  partial?: boolean;
  summary: { total: number; sent: number; failed: number };
  table: {
    columns: string[];
    data: (string | null)[][];
  };
  errors: { key: string; email: string; status: number; error: string }[];
}

// ─── Email Regex ────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

// ─── Service Class ──────────────────────────────────────────
export class EmailService {
  /**
   * Resolve effective SMTP config by merging request config with server env defaults.
   */
  public resolveSmtpConfig(smtp?: SmtpConfig): SmtpConfig {
    return {
      host: smtp?.host?.trim() || config.smtpHost || "smtp.gmail.com",
      port: smtp?.port || config.smtpPort || 587,
      user: smtp?.user?.trim() || config.smtpUser || "",
      password: smtp?.password?.trim() || config.smtpPassword || "",
      from_email: smtp?.from_email?.trim() || config.smtpFrom || smtp?.user?.trim() || config.smtpUser || "",
      use_tls: smtp?.use_tls !== false,
    };
  }

  /**
   * Create a nodemailer transporter from SMTP config.
   */
  public createTransporter(smtp: SmtpConfig): Transporter<SMTPTransport.SentMessageInfo> {
    const port = smtp.port || 587;
    const isSecure = port === 465;
    // Strip spaces if user copied Google App Password as "abcd efgh ijkl mnop"
    const cleanedPassword = smtp.password ? smtp.password.replace(/\s+/g, "") : "";

    return nodemailer.createTransport({
      host: smtp.host || "smtp.gmail.com",
      port,
      secure: isSecure,
      auth: {
        user: smtp.user?.trim(),
        pass: cleanedPassword,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed / intranet certs
      },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  /**
   * Build nodemailer attachments array from our attachment format.
   */
  private buildAttachments(attachments?: EmailAttachment[]): SendMailOptions["attachments"] {
    if (!attachments || attachments.length === 0) return undefined;

    return attachments.map((att) => {
      // Priority: base64 content > URL > local path
      if (att.content_base64) {
        const raw = att.content_base64.includes(",")
          ? att.content_base64.split(",")[1]!
          : att.content_base64;
        return {
          filename: att.filename,
          content: Buffer.from(raw, "base64"),
          contentType: att.mime_type,
        };
      }
      if (att.url) {
        return {
          filename: att.filename,
          path: att.url,
          contentType: att.mime_type,
        };
      }
      if (att.path) {
        return {
          filename: att.filename,
          path: att.path,
          contentType: att.mime_type,
        };
      }
      return { filename: att.filename, content: "" };
    });
  }

  /**
   * Send a batch of emails and return per-recipient status table.
   */
  async sendBatch(
    recipients: EmailRecipient[],
    smtpConfig?: SmtpConfig,
    keyColumnName: string = "Key",
  ): Promise<SendBatchResult> {
    const columns = [keyColumnName, "Status", "Email", "Details", "SentAt"];
    const outputRows: (string | null)[][] = [];
    const errors: { key: string; email: string; status: number; error: string }[] = [];
    let sentCount = 0;
    let failCount = 0;

    if (!recipients || recipients.length === 0) {
      return {
        success: false,
        summary: { total: 0, sent: 0, failed: 0 },
        table: { columns, data: [] },
        errors: [{ key: "", email: "", status: 500, error: "No recipients provided" }],
      };
    }

    const effectiveSmtp = this.resolveSmtpConfig(smtpConfig);

    // Validate SMTP config
    if (!effectiveSmtp.user || !effectiveSmtp.password) {
      const errMsg = "SMTP credentials missing. Please open the 'SMTP' tab on the node and enter your Gmail/SMTP email and 16-character Google App Password.";
      for (const job of recipients) {
        const keyVal = String(job.key ?? `Row_${outputRows.length + 1}`);
        const emailVal = String(job.email ?? "").trim();
        const sentAt = new Date().toISOString().replace("T", " ").substring(0, 19);
        outputRows.push([keyVal, "500", emailVal, errMsg, sentAt]);
        errors.push({ key: keyVal, email: emailVal, status: 500, error: errMsg });
      }
      return {
        success: false,
        summary: { total: recipients.length, sent: 0, failed: recipients.length },
        table: { columns, data: outputRows },
        errors,
      };
    }

    // Create transporter & verify connection
    let transporter: Transporter<SMTPTransport.SentMessageInfo>;
    try {
      transporter = this.createTransporter(effectiveSmtp);
      await transporter.verify();
    } catch (err: any) {
      const isGmail = (effectiveSmtp.host || "").toLowerCase().includes("gmail");
      const hint = isGmail
        ? " (For Gmail, make sure 2-Step Verification is ON and you generated a 16-character App Password at myaccount.google.com/apppasswords)"
        : "";
      const errMsg = `SMTP connection failed: ${err.message || String(err)}${hint}`;

      for (const job of recipients) {
        const keyVal = String(job.key ?? `Row_${outputRows.length + 1}`);
        const emailVal = String(job.email ?? "").trim();
        const sentAt = new Date().toISOString().replace("T", " ").substring(0, 19);
        outputRows.push([keyVal, "500", emailVal, errMsg, sentAt]);
        errors.push({ key: keyVal, email: emailVal, status: 500, error: errMsg });
      }
      return {
        success: false,
        summary: { total: recipients.length, sent: 0, failed: recipients.length },
        table: { columns, data: outputRows },
        errors,
      };
    }

    const fromEmail = effectiveSmtp.from_email || effectiveSmtp.user;

    // Send each recipient
    for (const job of recipients) {
      const keyVal = String(job.key ?? `Row_${outputRows.length + 1}`);
      const emailVal = String(job.email ?? "").trim();
      const subject = job.subject || "Notification";
      const body = job.body || "";
      const sentAt = new Date().toISOString().replace("T", " ").substring(0, 19);

      // Regex validation
      if (!emailVal || !EMAIL_REGEX.test(emailVal)) {
        failCount++;
        const errMsg = !emailVal
          ? "Missing email address"
          : `Invalid email format: "${emailVal}" (regex check failed)`;
        outputRows.push([keyVal, "500", emailVal, errMsg, sentAt]);
        errors.push({ key: keyVal, email: emailVal, status: 500, error: errMsg });
        continue;
      }

      try {
        const mailOptions: SendMailOptions = {
          from: fromEmail,
          to: emailVal,
          subject,
          attachments: this.buildAttachments(job.attachments),
        };

        if (job.is_html) {
          mailOptions.html = body;
          mailOptions.text = body.replace(/<[^>]+>/g, "");
        } else {
          mailOptions.text = body;
        }

        const info = await transporter.sendMail(mailOptions);

        sentCount++;
        const detail = `Delivered (ID: ${info.messageId || "N/A"})`;
        outputRows.push([keyVal, "sent success", emailVal, detail, sentAt]);
      } catch (err: any) {
        failCount++;
        const errMsg = `Send failed: ${err.message || String(err)}`;
        outputRows.push([keyVal, "500", emailVal, errMsg, sentAt]);
        errors.push({ key: keyVal, email: emailVal, status: 500, error: errMsg });
      }
    }

    try {
      transporter.close();
    } catch {}

    return {
      success: failCount === 0,
      partial: sentCount > 0 && failCount > 0,
      summary: {
        total: recipients.length,
        sent: sentCount,
        failed: failCount,
      },
      table: { columns, data: outputRows },
      errors,
    };
  }
}

export const emailService = new EmailService();
