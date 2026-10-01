// ═══════════════════════════════════════════════════════════
// IO Node Executors
// Handles: SaveFile, GetFile, EmailSender
// These nodes perform I/O operations (file system, email)
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset } from "@repo/workflow-engine/types";
import { supabase } from "@repo/db";
import { config } from "../../config/env.js";

const EMPTY: Dataset = { columns: [], data: [] };

const resolveText = (raw: any): string => {
  if (typeof raw === "string") return raw.trim();
  if (raw?.text) return String(raw.text).trim();
  if (raw?.value) return String(raw.value).trim();
  return "";
};

// ── SaveFileNode ────────────────────────────────────────────
export class SaveFileExecutor implements INodeExecutor {
  type = "SaveFileNode";

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const input = ctx.inputs.get("data") ?? ctx.inputs.get("in")
      ?? ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    const ds: Dataset = input ?? EMPTY;

    const dynamicFileName = resolveText(ctx.inputs.get("file-name") ?? ctx.inputs.get("fileName"));
    const dynamicFolderName = resolveText(ctx.inputs.get("folder-name") ?? ctx.inputs.get("folderName"));

    const resolvedFileName = (dynamicFileName || ctx.nodeData?.fileName || "output_file.csv").trim();
    const resolvedFolderName = (dynamicFolderName || ctx.nodeData?.folderName || "").trim();
    const autoSave = ctx.nodeData?.autoSave !== false;

    if (autoSave && ds.columns?.length > 0) {
      try {
        // Save to workspace_file table
        const fileName = resolvedFileName.endsWith(".csv") ? resolvedFileName : `${resolvedFileName}.csv`;

        // Check if file exists
        const { data: existing } = await supabase
          .from("workspace_file")
          .select("id")
          .eq("dashid", ctx.dashid)
          .eq("fileName", fileName)
          .eq("folderPath", resolvedFolderName)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("workspace_file")
            .update({
              data: ds,
              metadata: { rowCount: ds.data.length, colCount: ds.columns.length, sourceNodeId: ctx.nodeId },
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("workspace_file").insert({
            dashid: ctx.dashid,
            userId: ctx.userId,
            fileName,
            folderPath: resolvedFolderName,
            fileType: "csv",
            data: ds,
            metadata: { rowCount: ds.data.length, colCount: ds.columns.length, sourceNodeId: ctx.nodeId },
          });
        }

        ctx.emitNodeMeta({
          lastSavedAt: new Date().toLocaleTimeString(),
          wasOverwritten: !!existing,
          dynamicFileName,
          dynamicFolderName,
        });
      } catch (err) {
        console.error("SaveFileNode execution error:", err);
      }
    }

    return ds;
  }
}

// ── GetFileNode ─────────────────────────────────────────────
export class GetFileExecutor implements INodeExecutor {
  type = "GetFileNode";

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const dynamicFileName = resolveText(ctx.inputs.get("file-name") ?? ctx.inputs.get("fileName"));
    const dynamicFolderName = resolveText(ctx.inputs.get("folder-name") ?? ctx.inputs.get("folderName"));

    const resolvedFileName = (dynamicFileName || ctx.nodeData?.fileName || "").trim();
    const resolvedFolderName = (dynamicFolderName || ctx.nodeData?.folderName || "").trim();

    if (resolvedFileName) {
      try {
        const { data: fileRec } = await supabase
          .from("workspace_file")
          .select("data, name")
          .eq("dashid", ctx.dashid)
          .eq("fileName", resolvedFileName)
          .eq("folderPath", resolvedFolderName)
          .maybeSingle();

        if (fileRec?.data) {
          ctx.emitNodeMeta({
            fileName: fileRec.name,
            dynamicFileName,
            dynamicFolderName,
          });
          return fileRec.data as Dataset;
        }
      } catch (err) {
        console.error("GetFileNode execution error:", err);
      }
    }

    return ctx.nodeData?.text ?? ctx.nodeData?.result ?? EMPTY;
  }
}

// ── EmailSenderNode ─────────────────────────────────────────
export class EmailSenderExecutor implements INodeExecutor {
  type = "EmailSenderNode";

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const input = ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    const dynamicKey = resolveText(ctx.inputs.get("key") ?? ctx.inputs.get("keyColumn"));
    const resolvedKey = dynamicKey || ctx.nodeData?.keyColumn || "Key";

    const inputDs: Dataset | null = (input?.columns?.length > 0 ? input : ctx.nodeData?.text || ctx.nodeData?.result) || null;

    if (!inputDs || !inputDs.columns?.length) {
      return { columns: [resolvedKey, "Status"], data: [] };
    }

    const emailColName = ctx.nodeData?.emailColumn
      || inputDs.columns.find((c: string) => /email|mail/i.test(c))
      || inputDs.columns[0];
    const emailColIdx = inputDs.columns.indexOf(emailColName);
    const keyColIdx = inputDs.columns.indexOf(resolvedKey);

    if (emailColIdx === -1) {
      return inputDs;
    }

    // Build email jobs
    const recipientJobs = inputDs.data.map((row: any[], rIdx: number) => {
      const emailVal = String(row[emailColIdx] ?? "").trim();
      const keyVal = keyColIdx !== -1
        ? String(row[keyColIdx] ?? "")
        : dynamicKey
          ? `${dynamicKey}_${rIdx + 1}`
          : `Row_${rIdx + 1}`;

      let renderedSub = ctx.nodeData?.subjectTemplate || "Update Notification for {{Name}}";
      let renderedBody = ctx.nodeData?.bodyTemplate || "<p>Update for Key: {{Key}}</p>";

      inputDs.columns.forEach((col: string, idx: number) => {
        const val = String(row[idx] ?? "");
        const reg = new RegExp(`\\{\\{${col}\\}\\}`, "gi");
        renderedSub = renderedSub.replace(reg, val);
        renderedBody = renderedBody.replace(reg, val);
      });
      renderedSub = renderedSub.replace(/\{\{Key\}\}/gi, keyVal);
      renderedBody = renderedBody.replace(/\{\{Key\}\}/gi, keyVal);

      return {
        key: keyVal,
        email: emailVal,
        subject: renderedSub,
        body: renderedBody,
        is_html: true,
      };
    });

    // Send emails using server's nodemailer
    const results: Array<{ key: string; email: string; status: string }> = [];

    try {
      const nodemailer = await import("nodemailer");
      const smtpConfig = ctx.nodeData?.smtpConfig || {};
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host || config.smtpHost,
        port: smtpConfig.port || config.smtpPort,
        auth: {
          user: smtpConfig.user || config.smtpUser,
          pass: smtpConfig.password || config.smtpPassword,
        },
      });

      for (const job of recipientJobs) {
        try {
          await transporter.sendMail({
            from: smtpConfig.from || config.smtpFrom || config.smtpUser,
            to: job.email,
            subject: job.subject,
            html: job.body,
          });
          results.push({ key: job.key, email: job.email, status: "sent" });
        } catch (emailErr: any) {
          results.push({ key: job.key, email: job.email, status: `error: ${emailErr.message}` });
        }
      }
    } catch (err: any) {
      // Nodemailer not configured, mark all as error
      for (const job of recipientJobs) {
        results.push({ key: job.key, email: job.email, status: "error: SMTP not configured" });
      }
    }

    const resultTable: Dataset = {
      columns: [resolvedKey, "Email", "Status"],
      data: results.map((r) => [r.key, r.email, r.status]),
    };

    ctx.emitNodeMeta({
      rowCount: resultTable.data.length,
      lastExecutionSummary: `${results.filter((r) => r.status === "sent").length}/${results.length} sent`,
    });

    return resultTable;
  }
}

// ── Output passthrough nodes ────────────────────────────────
export class OutputPassthroughExecutor implements INodeExecutor {
  type = "OutputNode2";
  async execute(ctx: ExecutionContext): Promise<any> {
    return ctx.inputs.get("default") ?? ctx.inputs.values().next().value ?? null;
  }
}

export class FileOutputExecutor extends OutputPassthroughExecutor {
  type = "FileOutputNode";
}

export class BaseOutputExecutor extends OutputPassthroughExecutor {
  type = "baseOutput";
}

export function createIOExecutors(): INodeExecutor[] {
  return [
    new SaveFileExecutor(),
    new GetFileExecutor(),
    new EmailSenderExecutor(),
    new OutputPassthroughExecutor(),
    new FileOutputExecutor(),
    new BaseOutputExecutor(),
  ];
}
