"use server";

import { pypApi } from "@/lib/axios";
import { supabase } from "@repo/db";

const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.SERVER_URL ||
  "http://localhost:3000/api/v1";

export interface EmailAttachment {
  filename: string;
  content_base64?: string;
  mime_type?: string;
  url?: string;
}

export interface EmailRecipientJob {
  key?: string;
  email: string;
  subject?: string;
  body?: string;
  attachments?: EmailAttachment[];
  is_html?: boolean;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  from_email?: string;
  use_tls?: boolean;
}

export interface SendBatchEmailsOptions {
  recipients: EmailRecipientJob[];
  smtpConfig?: SmtpConfig;
  keyColumnName?: string;
}

export interface SendBatchEmailsResult {
  success: boolean;
  partial?: boolean;
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
  table: {
    columns: string[];
    data: (string | null)[][];
  };
  errors: {
    key: string;
    email: string;
    status: number;
    error: string;
  }[];
}

/**
 * Server action to test SMTP connection via apps/server nodemailer.
 */
export async function testSmtpConnectionAction(smtpConfig: SmtpConfig) {
  try {
    const res = await fetch(`${SERVER_URL}/email/test-smtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smtp_config: smtpConfig }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Could not connect to apps/server: ${err.message || String(err)}`,
    };
  }
}

/**
 * Server action to batch dispatch emails using apps/server (Node.js nodemailer)
 * with fallback to python server (pyp flask_mail) and strict error reporting.
 */
export async function sendBatchEmailsAction(
  options: SendBatchEmailsOptions,
): Promise<SendBatchEmailsResult> {
  const { recipients, smtpConfig, keyColumnName = "Key" } = options;

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      summary: { total: 0, sent: 0, failed: 0 },
      table: {
        columns: [keyColumnName, "Status", "Email", "Details", "SentAt"],
        data: [],
      },
      errors: [{ key: "", email: "", status: 500, error: "No recipients provided" }],
    };
  }

  // 1. Try apps/server (Node.js Express + Nodemailer) - PRIMARY DISPATCH ENGINE
  try {
    const serverRes = await fetch(`${SERVER_URL}/email/send-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients,
        smtp_config: smtpConfig,
        key_column_name: keyColumnName,
      }),
    });

    const data = await serverRes.json().catch(() => null);
    if (data && data.table && Array.isArray(data.table.data)) {
      return data;
    }
  } catch (err: any) {
    console.warn("apps/server email dispatch failed or unreachable:", err?.message);
  }

  // 2. Try Python (pyp) AI server (flask_mail) as secondary engine
  try {
    const res = await pypApi.post(
      "/ai/send-emails",
      {
        recipients,
        smtp_config: smtpConfig,
        key_column_name: keyColumnName,
      },
      { timeout: 60000 },
    );

    if (res.data && res.data.table) {
      return res.data;
    }
  } catch (err: any) {
    console.warn("Python email server failed or unreachable:", err?.message);
  }

  // 3. Fallback: Report failure with status 500 in table (never fake success)
  const outputRows: (string | null)[][] = [];
  const errorsList: { key: string; email: string; status: number; error: string }[] = [];
  const sentAt = new Date().toISOString().replace("T", " ").substring(0, 19);

  const missingSmtp = !smtpConfig?.user || !smtpConfig?.password;
  const generalErrMsg = missingSmtp
    ? "SMTP not configured. Open the SMTP tab and enter your Gmail address and 16-character App Password."
    : "Email server unreachable. Ensure apps/server is running on port 3000.";

  for (const job of recipients) {
    const keyVal = String(job.key ?? `Row_${outputRows.length + 1}`);
    const emailVal = String(job.email ?? "").trim();

    // Check regex first
    let itemError = generalErrMsg;
    if (!emailVal) {
      itemError = "Missing email address";
    } else if (!EMAIL_REGEX.test(emailVal)) {
      itemError = `Invalid email format: "${emailVal}" (regex check failed)`;
    }

    outputRows.push([keyVal, "500", emailVal, itemError, sentAt]);
    errorsList.push({
      key: keyVal,
      email: emailVal,
      status: 500,
      error: itemError,
    });
  }

  return {
    success: false,
    partial: false,
    summary: {
      total: recipients.length,
      sent: 0,
      failed: recipients.length,
    },
    table: {
      columns: [keyColumnName, "Status", "Email", "Details", "SentAt"],
      data: outputRows,
    },
    errors: errorsList,
  };
}

/**
 * Fetch files from Workspace files and Data Library for email attachment selection.
 */
export async function getSelectableMediaFiles(dashid?: string) {
  const result: {
    id: string;
    name: string;
    fileType: string;
    source: "workspace" | "library";
    url?: string;
    folderPath?: string;
  }[] = [];

  if (!dashid) return result;

  try {
    // 1. Workspace files
    const { data: wfFiles } = await supabase
      .from("workspace_file")
      .select("id, name, fileType, folderPath, metadata")
      .eq("workflowId", dashid)
      .order("updatedAt", { ascending: false });

    if (wfFiles) {
      for (const f of wfFiles) {
        result.push({
          id: f.id,
          name: f.name,
          fileType: f.fileType || "file",
          source: "workspace",
          url: f.metadata?.url || undefined,
          folderPath: f.folderPath || "",
        });
      }
    }

    // 2. Data library files
    const { data: dlFiles } = await supabase
      .from("data_library_file")
      .select("id, name, fileType, metadata")
      .eq("workflowId", dashid)
      .order("updatedAt", { ascending: false });

    if (dlFiles) {
      for (const f of dlFiles) {
        result.push({
          id: f.id,
          name: f.name,
          fileType: f.fileType || "json",
          source: "library",
          url: f.metadata?.url || undefined,
        });
      }
    }
  } catch (err) {
    console.warn("Could not load selectable media files:", err);
  }

  return result;
}
