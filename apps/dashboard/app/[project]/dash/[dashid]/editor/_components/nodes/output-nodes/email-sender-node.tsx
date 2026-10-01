"use client";
import Image from "next/image";
// import profilePic from '../public/profile.jpg';
import React, { memo, useState, useEffect, useMemo, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import {
  Mail,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Settings2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  RefreshCw,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  X,
  Plus,
  Layers,
  Sparkles,
  KeyRound,
  Check,
} from "lucide-react";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@repo/ui/components/ui/tabs";
import { toast } from "sonner";
import {
  sendBatchEmailsAction,
  testSmtpConnectionAction,
  getSelectableMediaFiles,
  type EmailRecipientJob,
  type EmailAttachment,
  type SmtpConfig,
} from "@/app/[project]/dash/[dashid]/editor/_actions/email-actions";
import { useDeskStore } from "@/stores/desk-store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";

interface Dataset {
  columns: string[];
  data: any[][];
}

export const EmailSenderNode = memo(
  ({ id, data }: { id: string; data: any }) => {
    const { setNodes, getEdges } = useReactFlow();
    const { nodes } = useEditorWorkFlow();
    const handleDelete = useDeleteNode();

    // Edge connected to key handle
    const edges = getEdges();
    const keyEdge = edges.find(
      (e) =>
        e.target === id &&
        (e.targetHandle === "key" || e.targetHandle === "keyColumn"),
    );

    // Dynamic key resolution from DeskTextInputNode or upstream input node
    const dynamicDeskKey = useDeskStore((s) => {
      if (!keyEdge) return "";
      const srcNode = nodes.find((n) => n.id === keyEdge.source);
      if (!srcNode) return "";
      if (srcNode.type === "DeskTextInputNode") {
        const sourceData = srcNode.data as any;
        const deskBlockId = sourceData?.deskBlockId;
        const deskInputId = sourceData?.deskInputId || srcNode.id;
        if (deskBlockId) {
          const block = s.blocks.find((b) => b.id === deskBlockId);
          const val = block?.textInputs?.find(
            (t) => t.id === deskInputId,
          )?.value;
          if (val !== undefined && val !== null && val !== "") return val;
        }
        for (const b of s.blocks) {
          const found = b.textInputs?.find(
            (t) => t.id === deskInputId || t.id === srcNode.id,
          );
          if (found && found.value) return found.value;
        }
        return sourceData?.text ?? "";
      }
      return typeof srcNode.data?.text === "string"
        ? srcNode.data.text
        : typeof srcNode.data?.result === "string"
          ? srcNode.data.result
          : "";
    });

    // Incoming dataset
    const incomingDataset: Dataset | null = data.text || data.result || null;
    const inputColumns = useMemo(() => {
      if (incomingDataset?.columns && Array.isArray(incomingDataset.columns)) {
        return incomingDataset.columns;
      }
      if (Array.isArray(data.inputColumns) && data.inputColumns.length > 0) {
        return data.inputColumns;
      }
      return [];
    }, [incomingDataset, data.inputColumns]);

    // Extract dashid from pathname
    const dashid =
      typeof window !== "undefined"
        ? window.location.pathname.split("/dash/")[1]?.split("/")[0]
        : undefined;

    // Node Configuration state
    const [emailColumn, setEmailColumn] = useState<string>(
      data.emailColumn || "",
    );
    const [keyColumn, setKeyColumn] = useState<string>(data.keyColumn || "Key");
    const [subjectTemplate, setSubjectTemplate] = useState<string>(
      data.subjectTemplate || "Update Notification for {{Name}}",
    );
    const [bodyTemplate, setBodyTemplate] = useState<string>(
      data.bodyTemplate ||
        "<p>Hello {{Name}},</p><p>Here is your update for key ID <strong>{{Key}}</strong>.</p><p>Best regards,<br/>UNIXL Team</p>",
    );

    // Media & Attachments
    const [mediaMode, setMediaMode] = useState<"broadcast" | "individual">(
      data.mediaMode || "broadcast",
    );
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
      data.selectedFileIds || [],
    );
    const [mediaUrlInput, setMediaUrlInput] = useState<string>(
      data.mediaUrlInput || "",
    );
    const [mediaColumn, setMediaColumn] = useState<string>(
      data.mediaColumn || "",
    );
    const [attachAsLink, setAttachAsLink] = useState<boolean>(
      data.attachAsLink ?? false,
    );

    // Available Workspace Files
    const [availableFiles, setAvailableFiles] = useState<
      {
        id: string;
        name: string;
        fileType: string;
        source: "workspace" | "library";
        url?: string;
      }[]
    >([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    // SMTP Settings
    const [showSmtp, setShowSmtp] = useState(false);
    const [smtpHost, setSmtpHost] = useState(data.smtpConfig?.host || "");
    const [smtpPort, setSmtpPort] = useState(data.smtpConfig?.port || "587");
    const [smtpUser, setSmtpUser] = useState(data.smtpConfig?.user || "");
    const [smtpPass, setSmtpPass] = useState(data.smtpConfig?.password || "");
    const [smtpFrom, setSmtpFrom] = useState(data.smtpConfig?.from_email || "");
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [smtpStatus, setSmtpStatus] = useState<{
      verified: boolean;
      message?: string;
    } | null>(null);

    // Dispatch execution state
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState<
      "config" | "media" | "smtp" | "results"
    >("config");

    const handleApplyGmailPreset = () => {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("587");
      if (smtpUser && !smtpFrom) {
        setSmtpFrom(smtpUser);
      }
      toast.success("Gmail preset loaded: smtp.gmail.com:587");
    };

    const handleApplyOutlookPreset = () => {
      setSmtpHost("smtp.office365.com");
      setSmtpPort("587");
      if (smtpUser && !smtpFrom) {
        setSmtpFrom(smtpUser);
      }
      toast.success("Outlook preset loaded: smtp.office365.com:587");
    };

    const handleTestSmtp = async () => {
      if (!smtpUser.trim() || !smtpPass.trim()) {
        toast.error("Please enter Username/Email and App Password first.");
        return;
      }
      setTestingSmtp(true);
      setSmtpStatus(null);
      try {
        const res = await testSmtpConnectionAction({
          host: smtpHost.trim() || "smtp.gmail.com",
          port: parseInt(smtpPort, 10) || 587,
          user: smtpUser.trim(),
          password: smtpPass.trim(),
          from_email: smtpFrom.trim() || smtpUser.trim(),
        });
        if (res.success) {
          setSmtpStatus({ verified: true, message: res.message });
          toast.success(res.message || "SMTP verified successfully!");
        } else {
          setSmtpStatus({ verified: false, message: res.error });
          toast.error(res.error || "SMTP verification failed.");
        }
      } catch (err: any) {
        setSmtpStatus({ verified: false, message: err.message });
        toast.error(err.message || "Failed to test SMTP connection.");
      } finally {
        setTestingSmtp(false);
      }
    };

    // Auto-detect email column if not set
    useEffect(() => {
      if (!emailColumn && inputColumns.length > 0) {
        const detected = inputColumns.find((c: string) =>
          /email|mail|e-mail/i.test(c),
        );
        if (detected) {
          setEmailColumn(detected);
        } else {
          setEmailColumn(inputColumns[0] || "");
        }
      }
    }, [inputColumns, emailColumn]);

    // Auto-detect key column if not set
    useEffect(() => {
      if ((!keyColumn || keyColumn === "Key") && inputColumns.length > 0) {
        const detectedKey = inputColumns.find((c: string) =>
          /id|roll|key|code|enrollment|student/i.test(c),
        );
        if (detectedKey) {
          setKeyColumn(detectedKey);
        }
      }
    }, [inputColumns, keyColumn]);

    // Fetch selectable media files
    const loadFiles = useCallback(async () => {
      if (!dashid) return;
      setLoadingFiles(true);
      try {
        const files = await getSelectableMediaFiles(dashid);
        setAvailableFiles(files);
      } catch (err) {
        console.warn("Could not load selectable files:", err);
      } finally {
        setLoadingFiles(false);
      }
    }, [dashid]);

    useEffect(() => {
      loadFiles();
    }, [loadFiles]);

    // Synchronize state back into node data
    const updateNodeData = useCallback(
      (updates: Partial<any>) => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
          ),
        );
      },
      [id, setNodes],
    );

    useEffect(() => {
      updateNodeData({
        emailColumn,
        keyColumn,
        subjectTemplate,
        bodyTemplate,
        mediaMode,
        selectedFileIds,
        mediaUrlInput,
        mediaColumn,
        attachAsLink,
        smtpConfig: {
          host: smtpHost,
          port: parseInt(smtpPort, 10) || 587,
          user: smtpUser,
          password: smtpPass,
          from_email: smtpFrom,
        },
      });
    }, [
      emailColumn,
      keyColumn,
      subjectTemplate,
      bodyTemplate,
      mediaMode,
      selectedFileIds,
      mediaUrlInput,
      mediaColumn,
      attachAsLink,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      updateNodeData,
    ]);

    // Insert variable tag into subject or body
    const insertVariable = (col: string, target: "subject" | "body") => {
      const placeholder = `{{${col}}}`;
      if (target === "subject") {
        setSubjectTemplate((prev) => `${prev} ${placeholder}`);
      } else {
        setBodyTemplate((prev) => `${prev} ${placeholder}`);
      }
      toast.success(`Inserted ${placeholder}`);
    };

    // Execute batch email sending
    const handleSendEmails = async () => {
      if (
        !incomingDataset ||
        !incomingDataset.columns ||
        incomingDataset.columns.length === 0
      ) {
        toast.error(
          "No input dataset found. Connect a table or sheet to the input handle.",
        );
        return;
      }

      if (!emailColumn) {
        toast.error("Please select an Email column");
        return;
      }

      const emailColIdx = incomingDataset.columns.indexOf(emailColumn);
      if (emailColIdx === -1) {
        toast.error(
          `Selected email column "${emailColumn}" not found in dataset.`,
        );
        return;
      }

      const effectiveKeyColName = (dynamicDeskKey || keyColumn || "Key").trim();
      const keyColIdx = incomingDataset.columns.indexOf(effectiveKeyColName);
      const mediaColIdx = mediaColumn
        ? incomingDataset.columns.indexOf(mediaColumn)
        : -1;

      // Build recipient jobs
      const recipients: EmailRecipientJob[] = incomingDataset.data.map(
        (row, rIdx) => {
          const emailVal = String(row[emailColIdx] ?? "").trim();
          const keyVal =
            keyColIdx !== -1
              ? String(row[keyColIdx] ?? "")
              : dynamicDeskKey
                ? `${dynamicDeskKey}_${rIdx + 1}`
                : `Row_${rIdx + 1}`;

          // Replace placeholders in subject and body
          let renderedSubject = subjectTemplate;
          let renderedBody = bodyTemplate;

          incomingDataset.columns.forEach((col, idx) => {
            const val = String(row[idx] ?? "");
            const reg = new RegExp(`\\{\\{${col}\\}\\}`, "gi");
            renderedSubject = renderedSubject.replace(reg, val);
            renderedBody = renderedBody.replace(reg, val);
          });

          // Also replace {{Key}} generic alias
          renderedSubject = renderedSubject.replace(/\{\{Key\}\}/gi, keyVal);
          renderedBody = renderedBody.replace(/\{\{Key\}\}/gi, keyVal);

          // Collect attachments for this recipient
          const attachments: EmailAttachment[] = [];

          // 1. Broadcast files (same media to all)
          if (mediaMode === "broadcast") {
            selectedFileIds.forEach((fid) => {
              const matched = availableFiles.find((f) => f.id === fid);
              if (matched) {
                attachments.push({
                  filename: matched.name,
                  mime_type: matched.fileType.includes("pdf")
                    ? "application/pdf"
                    : matched.fileType.includes("csv")
                      ? "text/csv"
                      : "application/octet-stream",
                  url: matched.url,
                });
              }
            });

            // Direct media URL
            if (mediaUrlInput.trim()) {
              const urlName = mediaUrlInput.split("/").pop() || "media_file";
              if (attachAsLink) {
                renderedBody += `<p><a href="${mediaUrlInput.trim()}" target="_blank">Download Attachment: ${urlName}</a></p>`;
              } else {
                attachments.push({
                  filename: urlName,
                  url: mediaUrlInput.trim(),
                });
              }
            }
          } else {
            // 2. Individual media by key ID
            if (mediaColIdx !== -1) {
              const rowMedia = String(row[mediaColIdx] ?? "").trim();
              if (rowMedia) {
                const fileName =
                  rowMedia.split("/").pop() || `${keyVal}_attachment`;
                if (attachAsLink || rowMedia.startsWith("http")) {
                  renderedBody += `<p><a href="${rowMedia}" target="_blank">Download Document: ${fileName}</a></p>`;
                } else {
                  attachments.push({
                    filename: fileName,
                    url: rowMedia,
                  });
                }
              }
            }

            // Match files by Key in filename
            if (keyVal) {
              const matchedFile = availableFiles.find((f) =>
                f.name.toLowerCase().includes(keyVal.toLowerCase()),
              );
              if (matchedFile) {
                attachments.push({
                  filename: matchedFile.name,
                  url: matchedFile.url,
                });
              }
            }
          }

          return {
            key: keyVal || `Row_${incomingDataset.data.indexOf(row) + 1}`,
            email: emailVal,
            subject: renderedSubject,
            body: renderedBody,
            attachments,
            is_html: true,
          };
        },
      );

      setIsSending(true);
      try {
        const res = await sendBatchEmailsAction({
          recipients,
          smtpConfig: {
            host: smtpHost.trim() || undefined,
            port: parseInt(smtpPort, 10) || undefined,
            user: smtpUser.trim() || undefined,
            password: smtpPass.trim() || undefined,
            from_email: smtpFrom.trim() || undefined,
          },
          keyColumnName: effectiveKeyColName || "Key",
        });

        // Save output table in node.data.result and node.data.text
        const outputTable = res.table;
        const errorMsg =
          res.errors.length > 0
            ? `${res.errors.length} email(s) encountered delivery errors (status 500)`
            : undefined;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    result: outputTable,
                    text: outputTable,
                    rowCount: outputTable.data.length,
                    error: errorMsg,
                    errors: res.errors,
                    lastExecutionSummary: res.summary,
                    sentAt: new Date().toLocaleTimeString(),
                  },
                }
              : n,
          ),
        );

        if (res.success) {
          toast.success(`Successfully sent ${res.summary.sent} email(s)!`);
        } else if (res.partial) {
          toast.warning(
            `Partially sent: ${res.summary.sent} succeeded, ${res.summary.failed} failed with status 500.`,
          );
        } else {
          toast.error(
            `Email dispatch failed: ${res.errors[0]?.error || "Status 500"}`,
          );
        }

        setActiveTab("results");
      } catch (err: any) {
        console.error("Email dispatch failed:", err);
        const errMsg = err?.message || "Failed to dispatch batch emails";
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    error: errMsg,
                    errors: [
                      { key: "All", email: "", status: 500, error: errMsg },
                    ],
                  },
                }
              : n,
          ),
        );
        toast.error(errMsg);
      } finally {
        setIsSending(false);
      }
    };

    const executionResult: Dataset | null = data.result || null;
    const executionSummary = data.lastExecutionSummary || null;

    return (
      <>
        <div className="flex justify-between items-center px-2 pt-1">
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-red-400 hover:text-red-600 transition-colors"
            onClick={handleDelete}
          />
        </div>

        <BaseNode className="min-w-[340px] max-w-[420px] shadow-xl border-violet-500/30">
          {/* Node Header */}
          <BaseNodeHeader className="border-b flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-800 text-white rounded-t-md">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-white/10">
                <Image
                  src="/icons/googleMail.png"
                  alt="Icon description"
                  width={34}
                  height={34}
                />
              </div>
              <div>
                <BaseNodeHeaderTitle className="text-white text-xs font-semibold leading-tight">
                  Email Dispatcher
                </BaseNodeHeaderTitle>
                <div className="text-[10px] text-purple-200/80">
                  Output Table Generator
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {executionSummary && (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 border-white/20 text-white font-mono ${
                    executionSummary.failed > 0
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  {executionSummary.sent}/{executionSummary.total} Sent
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[9px] border-white/30 text-white/90 px-1.5 py-0"
              >
                Output
              </Badge>
            </div>
          </BaseNodeHeader>

          <BaseNodeContent className="p-3 space-y-3 text-xs">
            {/* Incoming Dataset Status */}
            {incomingDataset?.columns && incomingDataset.columns.length > 0 ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
                <span className="font-medium text-[11px]">
                  {incomingDataset.data.length} recipient rows ready
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {incomingDataset.columns.length} columns
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] text-center">
                Connect a table or sheet to the <strong>in</strong> handle on
                the left
              </div>
            )}

            {/* Navigation Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="w-full h-7 bg-muted/60 p-0.5 grid grid-cols-4">
                <TabsTrigger value="config" className="text-[10px] h-6 px-1">
                  Setup
                </TabsTrigger>
                <TabsTrigger value="media" className="text-[10px] h-6 px-1">
                  Media ({selectedFileIds.length + (mediaUrlInput ? 1 : 0)})
                </TabsTrigger>
                <TabsTrigger value="smtp" className="text-[10px] h-6 px-1">
                  SMTP
                </TabsTrigger>
                <TabsTrigger value="results" className="text-[10px] h-6 px-1">
                  Status Table
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Setup & Message */}
              <TabsContent value="config" className="space-y-2.5 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground font-semibold">
                      Email Column *
                    </Label>
                    <select
                      value={emailColumn}
                      onChange={(e) => setEmailColumn(e.target.value)}
                      className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Select Column --</option>
                      {inputColumns.map((col: string) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground font-semibold">
                        Key Column *
                      </Label>
                      {dynamicDeskKey ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
                        >
                          Desk: {dynamicDeskKey}
                        </Badge>
                      ) : null}
                    </div>
                    <Input
                      value={dynamicDeskKey || keyColumn}
                      onChange={(e) => setKeyColumn(e.target.value)}
                      placeholder="e.g. Roll No / ID"
                      className="h-7 text-xs mt-1"
                      disabled={Boolean(dynamicDeskKey)}
                    />
                  </div>
                </div>

                {/* Variable Injection Chips */}
                {inputColumns.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground font-medium">
                      Insert dynamic placeholders:
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-muted/20 border rounded-md">
                      {inputColumns.slice(0, 8).map((col: string) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => insertVariable(col, "body")}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition cursor-pointer"
                          title={`Click to insert {{${col}}} in body`}
                        >
                          +{col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject Template */}
                <div>
                  <Label className="text-[10px] text-muted-foreground font-semibold">
                    Subject Line
                  </Label>
                  <Input
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="Subject (e.g. Results for {{Name}})"
                    className="h-7 text-xs mt-1"
                  />
                </div>

                {/* Body Template */}
                <div>
                  <Label className="text-[10px] text-muted-foreground font-semibold">
                    Body Template (HTML Supported)
                  </Label>
                  <textarea
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    rows={3}
                    className="w-full mt-1 bg-background border border-border rounded-md p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 leading-normal resize-y"
                    placeholder="<p>Hello {{Name}}...</p>"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: Media & Files */}
              <TabsContent value="media" className="space-y-2.5 mt-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[11px] font-semibold text-foreground">
                    Media Mode:
                  </span>
                  <div className="flex rounded-md border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setMediaMode("broadcast")}
                      className={`px-2 py-0.5 text-[10px] rounded transition ${
                        mediaMode === "broadcast"
                          ? "bg-purple-600 text-white font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Same Media to All
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaMode("individual")}
                      className={`px-2 py-0.5 text-[10px] rounded transition ${
                        mediaMode === "individual"
                          ? "bg-purple-600 text-white font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Individual by Key
                    </button>
                  </div>
                </div>

                {mediaMode === "broadcast" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground font-semibold">
                        Select Files from Project System:
                      </Label>
                      <button
                        type="button"
                        onClick={loadFiles}
                        className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw className="size-2.5" /> Refresh
                      </button>
                    </div>

                    <div className="max-h-24 overflow-y-auto space-y-1 p-1 bg-muted/20 border rounded-md">
                      {loadingFiles ? (
                        <div className="text-[10px] text-muted-foreground text-center py-2">
                          Loading workspace files...
                        </div>
                      ) : availableFiles.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground text-center py-2 italic">
                          No files in project yet. Upload PDF/CSV/Excel in Files
                          or Data Library.
                        </div>
                      ) : (
                        availableFiles.map((file) => {
                          const isChecked = selectedFileIds.includes(file.id);
                          return (
                            <label
                              key={file.id}
                              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 text-[11px] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFileIds([
                                      ...selectedFileIds,
                                      file.id,
                                    ]);
                                  } else {
                                    setSelectedFileIds(
                                      selectedFileIds.filter(
                                        (id) => id !== file.id,
                                      ),
                                    );
                                  }
                                }}
                                className="rounded border-border text-purple-600"
                              />
                              <span className="truncate flex-1 font-medium">
                                {file.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[8px] px-1 py-0 uppercase"
                              >
                                {file.fileType}
                              </Badge>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Direct Media URL / Image Link */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">
                        Direct Media Link / Image URL
                      </Label>
                      <Input
                        value={mediaUrlInput}
                        onChange={(e) => setMediaUrlInput(e.target.value)}
                        placeholder="https://.../brochure.pdf or image link"
                        className="h-7 text-xs mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-700 dark:text-purple-300">
                      💡 Will auto-attach files named with the row's{" "}
                      <strong>{keyColumn}</strong> (e.g. <code>101.pdf</code>),
                      or take link from a column below.
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">
                        Media Column (containing URL or file name)
                      </Label>
                      <select
                        value={mediaColumn}
                        onChange={(e) => setMediaColumn(e.target.value)}
                        className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="">
                          -- Match Files by Key Column ID --
                        </option>
                        {inputColumns.map((col: string) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: SMTP Settings */}
              <TabsContent value="smtp" className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Fast Server SMTP Presets:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleApplyGmailPreset}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 font-medium border border-red-500/20 transition-colors"
                    >
                      Gmail
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyOutlookPreset}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-medium border border-blue-500/20 transition-colors"
                    >
                      Outlook
                    </button>
                  </div>
                </div>

                {/* Gmail Guide Box */}
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                  <span className="font-semibold">⚠️ Important for Gmail:</span>{" "}
                  Use a <strong>16-character Google App Password</strong> (not
                  your login password).
                  <br />
                  Turn 2-Step Verification ON, then generate one at:{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-mono text-purple-600 dark:text-purple-400"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      SMTP Host
                    </Label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Port
                    </Label>
                    <Input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Username / Email
                    </Label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => {
                        setSmtpUser(e.target.value);
                        if (!smtpFrom) setSmtpFrom(e.target.value);
                      }}
                      placeholder="your-email@gmail.com"
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      App Password (16 chars)
                    </Label>
                    <Input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    From Address
                  </Label>
                  <Input
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="Your Name <your-email@gmail.com>"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>

                {/* Test SMTP Connection Button & Status */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="h-7 text-[10px] gap-1 px-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-300"
                  >
                    {testingSmtp ? (
                      <>
                        <Loader2 className="size-3 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-3" /> Test Connection
                        (Nodemailer)
                      </>
                    )}
                  </Button>

                  {smtpStatus && (
                    <span
                      className={`text-[9px] font-medium truncate max-w-[170px] ${
                        smtpStatus.verified
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                      title={smtpStatus.message}
                    >
                      {smtpStatus.verified
                        ? "✓ Connected"
                        : "✗ Error: " + smtpStatus.message}
                    </span>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: Status Table Output */}
              <TabsContent value="results" className="space-y-2 mt-2">
                {executionResult && executionResult.columns?.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        Generated Table: {executionResult.data.length} rows
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 text-emerald-600"
                      >
                        Output Ready
                      </Badge>
                    </div>

                    <div className="max-h-32 overflow-auto border rounded bg-background text-[10px]">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/80 sticky top-0 border-b">
                            {executionResult.columns.map(
                              (col: string, idx: number) => (
                                <th
                                  key={idx}
                                  className="px-2 py-1 text-left font-semibold border-r last:border-r-0"
                                >
                                  {col}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {executionResult.data.map(
                            (row: any[], rIdx: number) => {
                              const statusStr = String(row[1] ?? "");
                              const isSuccess = statusStr.includes("success");
                              return (
                                <tr
                                  key={rIdx}
                                  className="border-b last:border-b-0 hover:bg-muted/30"
                                >
                                  <td className="px-2 py-0.5 font-mono border-r font-medium">
                                    {row[0]}
                                  </td>
                                  <td className="px-2 py-0.5 border-r font-semibold">
                                    <span
                                      className={
                                        isSuccess
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-rose-600 dark:text-rose-400"
                                      }
                                    >
                                      {statusStr}
                                    </span>
                                  </td>
                                  <td className="px-2 py-0.5 border-r truncate max-w-[120px]">
                                    {row[2]}
                                  </td>
                                  <td className="px-2 py-0.5 border-r text-muted-foreground truncate max-w-[100px]">
                                    {row[3]}
                                  </td>
                                  <td className="px-2 py-0.5 text-muted-foreground">
                                    {row[4]}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground text-center py-4 italic">
                    Run execution or click "Send Emails" to generate the output
                    status table.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Button: Send Emails */}
            <Button
              onClick={handleSendEmails}
              disabled={
                isSending ||
                !incomingDataset ||
                incomingDataset.columns.length === 0
              }
              className="w-full h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sending Emails...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Emails & Generate Table</span>
                </>
              )}
            </Button>
          </BaseNodeContent>

          {/* Input handles */}
          <Handle
            type="target"
            position={Position.Left}
            id="in"
            className="w-3 h-3 bg-purple-600 top-[35%]"
            title="Input Dataset (Table)"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="key"
            className="w-3 h-3 bg-indigo-500 top-[65%]"
            title="Key Input (Desk Input or Key Column Name)"
          />

          {/* Output handle: Status Table */}
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="w-3 h-3 bg-emerald-500"
            title="Generated Status Table (Key, Email, Status, Details, SentAt)"
          />
        </BaseNode>
      </>
    );
  },
);

EmailSenderNode.displayName = "EmailSenderNode";
