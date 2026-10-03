"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { ActiveRun } from "@/stores/execution.store";
import {
  Play,
  Settings,
  FileUp,
  Table2,
  Eye,
  ChevronDown,
  Loader2,
  CheckSquare,
  Trash2,
  Edit2,
  Download,
  Plus,
  Pencil,
  Inbox,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@/components/ui/components";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@repo/ui/components/ui/resizable";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import {
  useDeskStore,
  type DeskBlockState,
  type Dataset,
  type IncomingTabData,
  type PushedFileRecord,
} from "@/stores/desk-store";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";

const SpreadsheetComponent = dynamic(
  () =>
    import("@syncfusion/ej2-react-spreadsheet").then(
      (m) => m.SpreadsheetComponent,
    ),
  { ssr: false },
);

import { openSheetInSyncfusion } from "@/lib/sheet-utils";
import { SheetDataUploadModal } from "./SheetDataUploadModal";

// ─── CSV parsing helper ─────────────────────────────────────
function parseCSV(text: string): { columns: string[]; data: string[][] } {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return { columns: [], data: [] };
  const parseLine = (line: string) => {
    const result: string[] = [];
    let inQuotes = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const columns = parseLine(lines[0]);
  const data = lines
    .slice(1)
    .filter((l) => l.trim())
    .map(parseLine);
  return { columns, data };
}

// ─── Column letter helper ───────────────────────────────────
function colLetter(idx: number): string {
  let result = "";
  let n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

// ─── Props ──────────────────────────────────────────────────
interface DeskBlockProps {
  block: DeskBlockState; // The BigBlock (root block, parentId=null)
  blockIndex: number;
  totalBlocks: number;
  allBlocks: DeskBlockState[]; // All blocks for finding children
  isGuest: boolean;
  dashid: string;
  userId?: string;
  onExecute: (blockId: string) => void;
  onServerExecute?: (
    blockId: string,
    options?: { pushedFileRecord?: PushedFileRecord; customSheets?: any[] },
  ) => void;
  onCancelServerRun?: (blockId: string) => void;
  serverRunId?: string;
  serverRun?: ActiveRun;
  onAddTab: (bigBlockId: string) => Promise<string | undefined>;
  onRenameTab: (blockId: string, newName: string) => Promise<void>;
  onDeleteTab: (blockId: string) => Promise<void>;
  onDeleteBigBlock?: (bigBlockId: string) => Promise<void>;
  previousBlockOutput?: Dataset | null;
}

export function DeskBlock({
  block,
  blockIndex,
  totalBlocks,
  allBlocks,
  isGuest,
  dashid,
  userId,
  onExecute,
  onServerExecute,
  onCancelServerRun,
  serverRunId,
  serverRun,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onDeleteBigBlock,
  previousBlockOutput,
}: DeskBlockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const spreadsheetRef = useRef<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ─── Child blocks (tabs within this BigBlock) ─────────────
  const childBlocks = (allBlocks || [])
    .filter((b) => b.parentId === block.id)
    .sort((a, b) => a.blockOrder - b.blockOrder);

  // ─── Active tab persistence (localStorage) ────────────────
  const storageKey = `desk-tab-${block.id}`;
  const [activeChildId, setActiveChildId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved && childBlocks.find((c) => c.id === saved)) return saved;
    }
    return childBlocks[0]?.id || "";
  });

  // Sync localStorage when active tab changes
  useEffect(() => {
    if (activeChildId) {
      localStorage.setItem(storageKey, activeChildId);
    }
  }, [activeChildId, storageKey]);

  // Keep active child valid when children change
  useEffect(() => {
    if (
      childBlocks.length > 0 &&
      !childBlocks.find((c) => c.id === activeChildId)
    ) {
      setActiveChildId(childBlocks[0].id);
    }
  }, [childBlocks, activeChildId]);

  const activeChild = childBlocks.find((c) => c.id === activeChildId) || null;

  // ─── Store actions ─────────────────────────────────────────
  const {
    updateTextInputValue,
    updateTextInputPlaceholder,
    updateSheetData,
    updateSheetName,
    toggleCheckbox,
    setBlockOutput,
    isViewer,
  } = useDeskStore();

  // ─── Active preview tab state ──────────────────────────────
  const [activePreviewTab, setActivePreviewTab] =
    useState<string>("output_preview");

  const incomingDataByTab = useDeskStore((s) => s.incomingDataByTab);
  const incomingDatasets: IncomingTabData[] = useMemo(() => {
    if (!activeChild) return [];
    return useDeskStore.getState().getIncomingDataForTab(activeChild.id);
  }, [incomingDataByTab, activeChild?.id, activeChild?.name]);

  // ─── Current Execution Error ─────────────────────────────
  const currentError = useMemo(() => {
    return (
      activeChild?.executionError ||
      block.executionError ||
      (serverRun?.status === "error" && serverRun?.error
        ? {
            message: serverRun.error,
            code: "SERVER_RUN_ERROR",
            timestamp: serverRun.completedAt || new Date().toISOString(),
          }
        : null)
    );
  }, [activeChild?.executionError, block.executionError, serverRun]);

  const outputPreviewData = activeChild?.outputPreview ?? null;
  const activeSheet = activeChild?.sheets.find(
    (s) => s.id === activePreviewTab,
  );
  const activeIncoming = incomingDatasets.find(
    (inc: IncomingTabData) => `incoming_${inc.id}` === activePreviewTab,
  );

  const previewData: Dataset | null =
    activePreviewTab === "errors"
      ? null
      : activePreviewTab === "output_preview"
        ? outputPreviewData
        : activeIncoming
          ? activeIncoming.data
          : (activeSheet?.data ?? null);

  const spreadsheetKey = useMemo(() => {
    const id = activeChild?.id || "tab";
    const tab = activePreviewTab;
    const rows = previewData?.data?.length ?? 0;
    const cols = previewData?.columns?.length ?? 0;
    const firstCell = String(previewData?.data?.[0]?.[0] ?? "");
    const updated = activeIncoming?.updatedAt ?? 0;
    return `${id}_${tab}_${rows}_${cols}_${firstCell}_${updated}`;
  }, [
    activeChild?.id,
    activePreviewTab,
    previewData,
    activeIncoming?.updatedAt,
  ]);

  // Auto-switch to "errors" tab if an error occurs
  useEffect(() => {
    if (currentError) {
      setActivePreviewTab("errors");
    }
  }, [currentError]);

  // Auto-select output_preview if it has data and no active error, or fallback to first sheet with data
  useEffect(() => {
    if (!activeChild) return;
    if (currentError) {
      setActivePreviewTab("errors");
    } else if (
      outputPreviewData &&
      outputPreviewData.columns &&
      outputPreviewData.columns.length > 0
    ) {
      setActivePreviewTab("output_preview");
    } else if (
      activeChild.sheets.length > 0 &&
      activePreviewTab !== "output_preview" &&
      activePreviewTab !== "errors"
    ) {
      const sheetWithData = activeChild.sheets.find((s) => s.data);
      if (sheetWithData) setActivePreviewTab(sheetWithData.id);
    }
  }, [activeChild, outputPreviewData, currentError]);

  // ─── Add new tab (uses callback from page.tsx) ─────────────
  const handleAddTab = useCallback(async () => {
    setIsAddingTab(true);
    try {
      const newId = await onAddTab(block.id);
      if (newId) setActiveChildId(newId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add tab");
    } finally {
      setIsAddingTab(false);
    }
  }, [block.id, onAddTab]);

  // ─── Rename tab ────────────────────────────────────────────
  const startRename = useCallback((childId: string, currentName: string) => {
    setRenamingTabId(childId);
    setRenameValue(currentName);
  }, []);

  const commitRename = useCallback(async () => {
    if (!renamingTabId || !renameValue.trim()) {
      setRenamingTabId(null);
      return;
    }
    try {
      await onRenameTab(renamingTabId, renameValue.trim());
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename");
    } finally {
      setRenamingTabId(null);
    }
  }, [renamingTabId, renameValue, onRenameTab]);

  // ─── Pending Push Data for Confirmation Dialog ─────────────
  const [pendingPushData, setPendingPushData] = useState<{
    file: { name: string; size?: number };
    sheetId: string;
    sheetName: string;
    dataset: Dataset;
    blockId: string;
  } | null>(null);

  // ─── Combined Pushed Files for this Block / Tab ────────────
  const allPushedFiles = useMemo(() => {
    const childFiles = activeChild?.pushedFiles || [];
    const blockFiles = block.pushedFiles || [];
    const map = new Map<string, PushedFileRecord>();
    for (const f of childFiles) map.set(f.id, f);
    for (const f of blockFiles) if (!map.has(f.id)) map.set(f.id, f);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
    );
  }, [activeChild?.pushedFiles, block.pushedFiles]);

  // ─── File upload for sheets ─────────────────────────────
  const handleSheetFileUpload = useCallback(
    (
      blockId: string,
      sheetId: string,
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const inputEl = e.target;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const parsed = parseCSV(text);
        if (parsed.columns.length > 0) {
          const isServerRunning = Boolean(
            serverRunId &&
              (activeChild?.isExecuting ||
                (serverRun &&
                  (serverRun.status === "running" ||
                    serverRun.status === "paused")))
          );

          if (isServerRunning) {
            const sheetName =
              activeChild?.sheets.find((s) => s.id === sheetId)?.name || "Sheet";
            setPendingPushData({
              file: { name: file.name, size: file.size },
              sheetId,
              sheetName,
              dataset: parsed,
              blockId,
            });
          } else {
            updateSheetData(blockId, sheetId, parsed);
            setBlockOutput(blockId, null); // reset old output preview since new data was uploaded
            setActivePreviewTab(sheetId);
            toast.success(`Loaded ${parsed.data.length} rows`);
          }
        } else {
          toast.error("Could not parse file — ensure it's a valid CSV");
        }
        inputEl.value = ""; // allow re-uploading the same file
      };
      reader.readAsText(file);
    },
    [updateSheetData, setBlockOutput, serverRunId, activeChild, serverRun],
  );

  // ─── Sheet Data Upload Modal ───────────────────────────────
  const [uploadModalTarget, setUploadModalTarget] = useState<{
    sheetId: string;
    sheetName: string;
  } | null>(null);

  const handleOpenUploadModal = useCallback(
    (sheetId: string, sheetName: string) => {
      if (isGuest) return;
      setUploadModalTarget({ sheetId, sheetName });
    },
    [isGuest],
  );

  const handleDatasetLoaded = useCallback(
    (dataset: Dataset, sourceName: string) => {
      if (!uploadModalTarget || !activeChild) return;
      const targetSheetId = uploadModalTarget.sheetId;
      const targetSheetName = uploadModalTarget.sheetName;
      setUploadModalTarget(null);

      const isServerRunning = Boolean(
        serverRunId &&
          (activeChild.isExecuting ||
            (serverRun &&
              (serverRun.status === "running" ||
                serverRun.status === "paused")))
      );

      if (isServerRunning) {
        setPendingPushData({
          file: { name: sourceName, size: 0 },
          sheetId: targetSheetId,
          sheetName: targetSheetName,
          dataset,
          blockId: activeChild.id,
        });
      } else {
        updateSheetData(activeChild.id, targetSheetId, dataset);
        setBlockOutput(activeChild.id, null);
        setActivePreviewTab(targetSheetId);
        toast.success(
          `Loaded ${dataset.data.length} rows × ${dataset.columns.length} cols from "${sourceName}"`,
        );
      }
    },
    [
      uploadModalTarget,
      activeChild,
      updateSheetData,
      setBlockOutput,
      setActivePreviewTab,
      serverRunId,
      serverRun,
    ],
  );

  // ─── Confirm Push to Server Instance ────────────────────────
  const handleConfirmPush = useCallback(() => {
    if (!pendingPushData || !activeChild) return;
    const { file, sheetId, sheetName, dataset, blockId } = pendingPushData;

    // 1. Update the sheet data locally in store
    updateSheetData(blockId, sheetId, dataset);
    setBlockOutput(blockId, null);

    // 2. Prepare customSheets list with the updated sheet
    const customSheets = activeChild.sheets.map((s) =>
      s.id === sheetId ? { ...s, data: dataset } : s
    );

    // 3. Create PushedFileRecord
    const record: PushedFileRecord = {
      id: `push_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sheetId,
      sheetName,
      fileName: file.name,
      fileSize: file.size,
      rowCount: dataset.data.length,
      columnCount: dataset.columns.length,
      status: "processing",
      runId: serverRunId,
      pushedAt: new Date().toISOString(),
    };

    // 4. Trigger server execution with pushedFileRecord and updated sheets
    if (onServerExecute) {
      onServerExecute(blockId, {
        pushedFileRecord: record,
        customSheets,
      });
    }

    // 5. Open Pushed Files tab so user sees execution in real-time
    setActivePreviewTab("pushed_files");
    toast.success(`Pushed "${file.name}" to running server instance`);
    setPendingPushData(null);
  }, [pendingPushData, activeChild, updateSheetData, setBlockOutput, onServerExecute, serverRunId]);

  // ─── Load previous BigBlock output into a sheet ────────────
  const handleLoadPreviousIntoSheet = useCallback(
    (blockId: string, sheetId: string) => {
      if (!previousBlockOutput) return;
      updateSheetData(blockId, sheetId, previousBlockOutput);
      setBlockOutput(blockId, null); // reset old output preview
      setActivePreviewTab(sheetId);
      toast.success(
        `Loaded ${previousBlockOutput.data.length} rows from previous BigBlock`,
      );
    },
    [previousBlockOutput, updateSheetData, setBlockOutput],
  );

  // ─── Navigate to child block's editor ──────────────────────
  const openEditor = useCallback(
    (child: DeskBlockState) => {
      if (isGuest || isViewer) {
        toast.error("You don't have permission to edit this block's workflow");
        return;
      }
      const segments = pathname.split("/");
      const projectSlug = segments[1] || "dashboard";
      router.push(
        `/${projectSlug}/dash/${dashid}/desk/editor/${child.editorWorkflowId}`,
      );
    },
    [isGuest, pathname, dashid, router],
  );

  // ─── Delete a child tab ────────────────────────────────────
  const handleDeleteTab = useCallback(
    async (childId: string) => {
      if (isGuest || isViewer) return;
      const isLastTab = childBlocks.length <= 1;
      const confirmMsg = isLastTab
        ? "Deleting the last tab will also delete this BigBlock. Continue?"
        : "Delete this tab? This cannot be undone.";

      if (confirm(confirmMsg)) {
        setIsDeleting(true);
        try {
          await onDeleteTab(childId);
          const remaining = childBlocks.filter((c) => c.id !== childId);
          if (remaining.length > 0) setActiveChildId(remaining[0].id);
        } catch (err) {
          toast.error("Failed to delete tab");
        } finally {
          setIsDeleting(false);
        }
      }
    },
    [isGuest, childBlocks, onDeleteTab],
  );

  // Helper to safely render dataset into Syncfusion spreadsheet (with grid clearing fallback)
  const renderSpreadsheetData = useCallback(
    (ss: any, dataset: Dataset | null) => {
      if (!ss || !dataset || !dataset.columns || dataset.columns.length === 0)
        return;

      // 1. Try openSheetInSyncfusion first
      try {
        openSheetInSyncfusion(ss, dataset);
        return;
      } catch (e) {
        console.warn(
          "openSheetInSyncfusion failed, falling back to clean updateCell:",
          e,
        );
      }

      // 2. Clear & updateCell fallback
      if (typeof ss.updateCell === "function") {
        try {
          // Clear previous grid area (up to 200 rows x 50 cols)
          for (let r = 0; r < 200; r++) {
            for (let c = 0; c < 50; c++) {
              const addr = `${colLetter(c)}${r + 1}`;
              ss.updateCell({ value: "" }, addr);
            }
          }

          // Render header row
          dataset.columns.forEach((col, colIdx) => {
            const cellAddr = `${colLetter(colIdx)}1`;
            ss.updateCell(
              {
                value: String(col ?? ""),
                style: {
                  fontWeight: "bold",
                  backgroundColor: "#334155",
                  color: "#ffffff",
                },
              },
              cellAddr,
            );
          });

          // Render data rows
          (dataset.data || []).forEach((row, rowIdx) => {
            (row || []).forEach((cell: any, colIdx: number) => {
              const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`;
              ss.updateCell({ value: String(cell ?? "") }, cellAddr);
            });
          });
        } catch (err) {
          console.warn("Spreadsheet updateCell failed:", err);
        }
      }
    },
    [],
  );

  // Callback when Syncfusion spreadsheet inside DeskBlock is fully created
  const onSpreadsheetCreated = () => {
    if (previewData && spreadsheetRef.current) {
      renderSpreadsheetData(spreadsheetRef.current, previewData);
    }
  };

  // ─── Load preview data into Syncfusion ──────────────────
  useEffect(() => {
    if (!spreadsheetRef.current || !previewData) return;
    const timer = setTimeout(() => {
      const ss = spreadsheetRef.current;
      if (ss) {
        renderSpreadsheetData(ss, previewData);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [previewData, activeChildId, activePreviewTab, renderSpreadsheetData]);

  // ─── If no children exist yet, show empty state ────────────
  if (childBlocks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {blockIndex + 1}
            </div>
            <span className="text-sm font-semibold text-foreground">
              BigBlock {blockIndex + 1}
            </span>
          </div>
          {!isGuest && !isViewer && (
            <Button
              size="sm"
              onClick={handleAddTab}
              disabled={isAddingTab}
              className="h-7 text-xs gap-1"
            >
              {isAddingTab ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Create First Tab
            </Button>
          )}
        </div>
        <div className="p-8 text-center text-muted-foreground text-xs italic">
          No tabs yet. Click &quot;Create First Tab&quot; to add one.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ─── BigBlock Header ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            {blockIndex + 1}
          </div>
          <span className="text-sm font-semibold text-foreground">
            BigBlock {blockIndex + 1}
          </span>
          {activeChild?.isExecuting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">
                {serverRunId ? "Server Running" : "Local Running"}
              </span>
              {serverRun && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {serverRun.completedNodes}/{serverRun.totalNodes}
                </span>
              )}
            </div>
          )}
          {serverRun && !activeChild?.isExecuting && (
            <Badge variant="outline" className="text-[10px] font-mono gap-1">
              {serverRun.completedNodes}/{serverRun.totalNodes} •{" "}
              <span className={serverRun.status === "completed" ? "text-emerald-500" : serverRun.status === "error" ? "text-red-500" : "text-blue-500"}>
                {serverRun.status}
              </span>
            </Badge>
          )}
          {currentError && (
            <Badge
              variant="destructive"
              className="text-[10px] cursor-pointer hover:bg-red-600 transition flex items-center gap-1 font-mono shadow-sm"
              onClick={() => setActivePreviewTab("errors")}
              title="Click to view error in Errors tab"
            >
              <AlertCircle className="size-3" />
              {currentError.code || "Error"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {activeChild && (
            <>
              {/* ── Execution Button Group ── */}
              <div className="flex items-center rounded-lg border border-border overflow-hidden shadow-sm">
                {/* Local Execute */}
                <button
                  onClick={() => onExecute(activeChild.id)}
                  disabled={activeChild.isExecuting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    activeChild.isExecuting && !serverRunId
                      ? "bg-blue-500/15 text-blue-400 cursor-wait"
                      : activeChild.isExecuting
                        ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-muted/50 text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {activeChild.isExecuting && !serverRunId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 fill-current" />
                  )}
                  {activeChild.isExecuting && !serverRunId ? "Running..." : "Local"}
                </button>

                {/* Divider */}
                <div className="w-px h-5 bg-border" />

                {/* Server Execute / Running / Cancel */}
                {serverRunId ? (
                  <div className="flex items-center">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400 select-none cursor-default"
                      title="Server execution running"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Zap className="size-3.5 fill-current" />
                      <span>Running</span>
                    </div>

                    {onCancelServerRun && (
                      <>
                        <div className="w-px h-5 bg-border" />
                        <button
                          type="button"
                          onClick={() => onCancelServerRun(activeChild.id || block.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-colors cursor-pointer"
                          title="Stop server execution"
                        >
                          <span className="text-[10px] leading-none">⏹</span>
                          <span>Stop</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : onServerExecute ? (
                  <button
                    onClick={() => onServerExecute(activeChild.id)}
                    disabled={activeChild.isExecuting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      activeChild.isExecuting
                        ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-muted/50 text-emerald-500 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <Zap className="size-3.5" />
                    Server
                  </button>
                ) : null}
              </div>

              {/* ── Settings Dropdown ── */}
              {!isGuest && !isViewer && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Settings className="size-3.5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => openEditor(activeChild)}
                      className="cursor-pointer text-xs"
                    >
                      <Edit2 className="mr-2 size-3.5" />
                      Open Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        startRename(activeChild.id, activeChild.name)
                      }
                      className="cursor-pointer text-xs"
                    >
                      <Pencil className="mr-2 size-3.5" />
                      Rename Tab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTab(activeChild.id)}
                      className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Delete Tab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this BigBlock and all its tabs?",
                          )
                        ) {
                          setIsDeleting(true);
                          try {
                            if (onDeleteBigBlock) {
                              await onDeleteBigBlock(block.id);
                            } else {
                              for (const child of childBlocks) {
                                await onDeleteTab(child.id);
                              }
                            }
                          } catch (e) {
                            toast.error("Failed to delete BigBlock");
                          } finally {
                            setIsDeleting(false);
                          }
                        }
                      }}
                      className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950 border-t border-border"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Delete BigBlock
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Tab Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {childBlocks.map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveChildId(child.id)}
              onDoubleClick={() =>
                !isGuest && !isViewer && startRename(child.id, child.name)
              }
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                activeChildId === child.id
                  ? "bg-secondary text-secondary-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
              }`}
            >
              {renamingTabId === child.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingTabId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none outline-none text-xs w-20 text-foreground"
                />
              ) : (
                child.name
              )}
            </button>
          ))}
        </div>
        {!isGuest && !isViewer && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTab}
            disabled={isAddingTab}
            className="h-7 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground hover:bg-muted font-medium cursor-pointer shrink-0"
          >
            {isAddingTab ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add Tab
          </Button>
        )}
      </div>

      {/* ─── Active Tab Content ────────────────────────────── */}
      {activeChild && (
        <div>
          {/* Split View: Inputs | Preview */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[280px]">
            {/* ── Left Panel: Inputs ── */}
            <ResizablePanel defaultSize={35} minSize={20}>
              <div className="h-full overflow-y-auto">
                {/* Previous BigBlock output as input */}
                {blockIndex > 0 && previousBlockOutput && (
                  <div className="p-3 border-b">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ChevronDown className="size-3" />
                      Input from BigBlock {blockIndex}
                    </h4>
                    <div className="text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-foreground font-medium">
                        {previousBlockOutput.data.length} rows ×{" "}
                        {previousBlockOutput.columns.length} cols
                      </span>
                      {/* Load into sheet dropdown */}
                      {activeChild.sheets.length > 0 && !isGuest && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[10px] px-1.5 gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Download className="size-3" />
                              Load into sheet
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {activeChild.sheets.map((sheet) => (
                              <DropdownMenuItem
                                key={sheet.id}
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  handleLoadPreviousIntoSheet(
                                    activeChild.id,
                                    sheet.id,
                                  )
                                }
                              >
                                📊 {sheet.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )}

                {/* Incoming Datasets from Other Tabs */}
                {incomingDatasets.length > 0 && (
                  <div className="p-3 border-b bg-muted/20">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2 text-foreground">
                      <Inbox className="size-3.5 text-primary" />
                      Received from Tabs
                      <Badge variant="secondary" className="text-[9px]">
                        {incomingDatasets.length}
                      </Badge>
                    </h4>
                    <div className="space-y-1.5">
                      {incomingDatasets.map(
                        (item: IncomingTabData, i: number) => (
                          <div
                            key={`${item.id}-${i}`}
                            className={`rounded-lg border p-2 bg-background space-y-1.5 cursor-pointer transition-all ${
                              activePreviewTab === `incoming_${item.id}`
                                ? "ring-1 ring-ring border-border shadow-sm"
                                : "border-border hover:border-ring/50"
                            }`}
                            onClick={() =>
                              setActivePreviewTab(`incoming_${item.id}`)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-xs font-semibold text-foreground truncate max-w-[140px]"
                                title={item.name}
                              >
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1">
                                {activeChild.sheets.length > 0 && !isGuest && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[10px] px-1.5 gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download className="size-2.5" />
                                        Load
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {activeChild.sheets.map((sheet) => (
                                        <DropdownMenuItem
                                          key={sheet.id}
                                          className="cursor-pointer text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateSheetData(
                                              activeChild.id,
                                              sheet.id,
                                              item.data,
                                            );
                                            setBlockOutput(
                                              activeChild.id,
                                              null,
                                            );
                                            setActivePreviewTab(sheet.id);
                                            toast.success(
                                              `Loaded "${item.name}" into "${sheet.name}"`,
                                            );
                                          }}
                                        >
                                          📊 {sheet.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {!isGuest && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      useDeskStore
                                        .getState()
                                        .clearIncomingDataForTab(
                                          activeChild.id,
                                          item.id,
                                        );
                                      useDeskStore
                                        .getState()
                                        .clearIncomingDataForTab(
                                          activeChild.name,
                                          item.id,
                                        );
                                      toast.info("Removed incoming dataset");
                                    }}
                                    className="text-muted-foreground hover:text-red-500 p-0.5 rounded transition"
                                    title="Clear dataset"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>
                                From:{" "}
                                <strong className="text-foreground">
                                  {item.fromTabName}
                                </strong>
                              </span>
                              <span>
                                {item.data.data.length}r ×{" "}
                                {item.data.columns.length}c
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Text Inputs Section */}
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                    📝 Text Inputs
                    <Badge variant="secondary" className="text-[9px]">
                      {activeChild.textInputs.length}
                    </Badge>
                  </h4>
                  <div className="space-y-1.5">
                    {activeChild.textInputs.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                        No text inputs. Add via editor workflow.
                      </p>
                    ) : (
                      activeChild.textInputs.map((input) => (
                        <div
                          key={input.id}
                          className="rounded-lg border p-2 bg-background space-y-1"
                        >
                          <input
                            value={input.placeholder}
                            onChange={(e) =>
                              updateTextInputPlaceholder(
                                activeChild.id,
                                input.id,
                                e.target.value,
                              )
                            }
                            className="w-full text-[10px] font-medium text-muted-foreground bg-transparent border-none focus:outline-none"
                            placeholder="Label..."
                            readOnly
                          />
                          <Input
                            placeholder={input.placeholder}
                            value={input.value}
                            onChange={(e) =>
                              updateTextInputValue(
                                activeChild.id,
                                input.id,
                                e.target.value,
                              )
                            }
                            className="h-7 text-xs"
                            disabled={isGuest}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sheets Section */}
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                    📊 Sheets
                    <Badge variant="secondary" className="text-[9px]">
                      {activeChild.sheets.length}
                    </Badge>
                  </h4>
                  <div className="space-y-1.5">
                    {activeChild.sheets.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                        No sheets. Add via editor workflow.
                      </p>
                    ) : (
                      activeChild.sheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className={`rounded-lg border p-2 bg-muted space-y-1.5 cursor-pointer transition-all ${
                            activePreviewTab === sheet.id
                              ? "ring-1 ring-ring border-border shadow-sm"
                              : "border-border hover:border-ring/50"
                          }`}
                          onClick={() => setActivePreviewTab(sheet.id)}
                        >
                          <input
                            value={sheet.name}
                            onChange={(e) =>
                              updateSheetName(
                                activeChild.id,
                                sheet.id,
                                e.target.value,
                              )
                            }
                            className="text-xs font-medium bg-transparent border-none focus:outline-none w-full text-foreground"
                            placeholder="Sheet name..."
                            onClick={(e) => e.stopPropagation()}
                          />
                          {sheet.data ? (
                            <div className="text-[10px] space-y-1 relative group">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground font-medium">
                                  ✓ {sheet.data.data.length} rows ×{" "}
                                  {sheet.data.columns.length} cols
                                </span>
                                {!isGuest && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenUploadModal(
                                          sheet.id,
                                          sheet.name,
                                        );
                                      }}
                                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      title="Replace / import data"
                                    >
                                      <FileUp className="size-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        useDeskStore
                                          .getState()
                                          .clearSheetData(
                                            activeChild.id,
                                            sheet.id,
                                          );
                                      }}
                                      className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                      title="Clear data"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-0.5">
                                {sheet.data.columns
                                  .slice(0, 5)
                                  .map((col, i) => (
                                    <span
                                      key={i}
                                      className="text-[8px] px-1 py-0.5 rounded bg-background text-foreground border border-border font-mono"
                                    >
                                      {col}
                                    </span>
                                  ))}
                                {sheet.data.columns.length > 5 && (
                                  <span className="text-[8px] text-muted-foreground">
                                    +{sheet.data.columns.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenUploadModal(sheet.id, sheet.name)
                              }
                              disabled={isGuest}
                              className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FileUp className="size-3" />
                              Upload CSV
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Checkbox Fields Section */}
                {activeChild.checkboxFields.length > 0 && (
                  <div className="p-3">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                      <CheckSquare className="size-3" />
                      Toggles
                      <Badge variant="secondary" className="text-[9px]">
                        {activeChild.checkboxFields.length}
                      </Badge>
                    </h4>
                    <div className="space-y-1">
                      {activeChild.checkboxFields.map((field) => (
                        <label
                          key={field.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition"
                        >
                          <input
                            type="checkbox"
                            checked={field.checked}
                            onChange={() =>
                              toggleCheckbox(activeChild.id, field.id)
                            }
                            disabled={isGuest}
                            className="rounded border-border accent-primary"
                          />
                          <span className="text-xs">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── Right Panel: Sheet Preview (Syncfusion) ── */}
            <ResizablePanel defaultSize={65}>
              <div className="h-full flex flex-col">
                {/* Sheet / Output preview tabs header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 overflow-x-auto bg-muted/30">
                  <Eye className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium shrink-0 text-foreground">
                    Preview
                  </span>

                  <div className="flex items-center gap-1.5 ml-2 overflow-x-auto">
                    {/* Output Preview Tab */}
                    <button
                      onClick={() => setActivePreviewTab("output_preview")}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium whitespace-nowrap ${
                        activePreviewTab === "output_preview"
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <Eye className="size-3" />
                      Output Preview
                      {outputPreviewData && outputPreviewData.data && (
                        <span className="ml-0.5 opacity-90">
                          ({outputPreviewData.data.length}r)
                        </span>
                      )}
                    </button>

                    {/* Input Sheet Tabs */}
                    {activeChild.sheets.map((sheet) => (
                      <button
                        key={sheet.id}
                        onClick={() => setActivePreviewTab(sheet.id)}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                          activePreviewTab === sheet.id
                            ? "bg-secondary text-secondary-foreground border border-border shadow-sm"
                            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                        }`}
                      >
                        {sheet.name}
                        {sheet.data && (
                          <span className="ml-1 opacity-60">
                            ({sheet.data.data.length}r)
                          </span>
                        )}
                      </button>
                    ))}

                    {/* Incoming Tab Datasets */}
                    {incomingDatasets.map(
                      (item: IncomingTabData, i: number) => (
                        <button
                          key={`${item.id}-${i}`}
                          onClick={() =>
                            setActivePreviewTab(`incoming_${item.id}`)
                          }
                          className={`text-[10px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium flex items-center gap-1 ${
                            activePreviewTab === `incoming_${item.id}`
                              ? "bg-secondary text-secondary-foreground border border-border shadow-sm font-semibold"
                              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                          }`}
                        >
                          <Inbox className="size-2.5" />
                          {item.name || item.fromTabName}
                          <span className="ml-0.5 opacity-60">
                            ({item.data.data.length}r)
                          </span>
                        </button>
                      ),
                    )}

                    {/* Errors Tab */}
                    <button
                      onClick={() => setActivePreviewTab("errors")}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium flex items-center gap-1.5 ${
                        activePreviewTab === "errors"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-semibold shadow-sm"
                          : currentError
                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 animate-pulse font-semibold"
                            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <AlertCircle className={`size-3 ${currentError ? "text-red-500" : "text-muted-foreground"}`} />
                      Errors
                      {currentError && (
                        <span className="px-1 py-0 text-[8px] rounded bg-red-500 text-white font-bold leading-tight">
                          1
                        </span>
                      )}
                    </button>

                    {/* Pushed Files Tab */}
                    <button
                      onClick={() => setActivePreviewTab("pushed_files")}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium flex items-center gap-1.5 ${
                        activePreviewTab === "pushed_files"
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold shadow-sm"
                          : allPushedFiles.length > 0
                            ? "bg-background text-foreground hover:bg-muted border border-border"
                            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <FileUp className="size-3 text-purple-500" />
                      Pushed Files
                      {allPushedFiles.length > 0 && (
                        <span className="px-1 py-0 text-[8px] rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-bold">
                          {allPushedFiles.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {previewData && previewData.columns && (
                    <Badge
                      variant="outline"
                      className="text-[9px] ml-auto shrink-0 font-mono"
                    >
                      {previewData.data.length} rows ×{" "}
                      {previewData.columns.length} cols
                    </Badge>
                  )}
                </div>

                {activePreviewTab === "errors" ? (
                  /* ─── Errors Tab Content ─── */
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {currentError ? (
                      <div className="space-y-3">
                        {/* Error Card */}
                        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                                <AlertCircle className="size-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-red-600 dark:text-red-400">
                                  Workflow Execution Error
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {currentError.timestamp
                                    ? new Date(currentError.timestamp).toLocaleTimeString()
                                    : "Just now"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="destructive" className="text-[10px] font-mono px-2 py-0.5">
                                {currentError.code || "INTERNAL_ERROR"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-red-500/15"
                                onClick={() => {
                                  if (activeChild) {
                                    useDeskStore.getState().clearBlockError(activeChild.id);
                                  }
                                  useDeskStore.getState().clearBlockError(block.id);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-foreground bg-background/80 rounded-md p-2.5 border border-red-500/20 font-mono">
                            {currentError.message}
                          </div>

                          {(currentError.nodeId || currentError.nodeType) && (
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              {currentError.nodeType && (
                                <span>
                                  Node Type: <strong className="text-foreground">{currentError.nodeType}</strong>
                                </span>
                              )}
                              {currentError.nodeId && (
                                <span>
                                  Node ID: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{currentError.nodeId}</code>
                                </span>
                              )}
                            </div>
                          )}

                          {currentError.details && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  Diagnostic Details:
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-[9px] gap-1"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      typeof currentError.details === "string"
                                        ? currentError.details
                                        : JSON.stringify(currentError.details, null, 2)
                                    );
                                    toast.success("Error details copied to clipboard");
                                  }}
                                >
                                  <Copy className="size-2.5" />
                                  Copy
                                </Button>
                              </div>
                              <div className="rounded-md border border-border/80 bg-zinc-950 p-2.5 text-zinc-300 font-mono text-[10px] max-h-48 overflow-auto">
                                <pre className="whitespace-pre-wrap word-break-all">
                                  {typeof currentError.details === "string"
                                    ? currentError.details
                                    : JSON.stringify(currentError.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Quick Actions in Error View */}
                          <div className="pt-2 border-t border-red-500/20 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              Modify nodes in editor or retry:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] gap-1 font-semibold"
                                onClick={() => onExecute(activeChild.id)}
                                disabled={activeChild.isExecuting}
                              >
                                <Play className="size-2.5" />
                                Retry Local
                              </Button>
                              {onServerExecute && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 font-semibold border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                  onClick={() => onServerExecute(activeChild.id)}
                                  disabled={activeChild.isExecuting}
                                >
                                  ⚡ Retry Server
                                </Button>
                              )}
                              {!isGuest && !isViewer && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 font-semibold"
                                  onClick={() => openEditor(activeChild)}
                                >
                                  <Edit2 className="size-2.5" />
                                  Open Editor
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Clean Empty State */
                      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-muted-foreground gap-3 text-center">
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          <CheckSquare className="size-7" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <p className="text-xs font-semibold text-foreground">
                            No Execution Errors
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            No issues encountered. All workflow executions for this block have run cleanly.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : activePreviewTab === "pushed_files" ? (
                  /* ─── Pushed Files History Content ─── */
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                          <FileUp className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            Pushed Files History
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            Datasets pushed to active server workflow instances
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {serverRunId && (
                          <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 bg-emerald-500/10 font-mono">
                            ⚡ Hot Server Instance Active
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {allPushedFiles.length} file{allPushedFiles.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>

                    {allPushedFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-muted-foreground gap-3 text-center p-6">
                        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                          <FileUp className="size-7" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <p className="text-xs font-semibold text-foreground">
                            No Pushed Files Yet
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            When an execution is running on the server and you upload or drop a new dataset into any sheet, you can push it directly to the live instance. All processed files and their execution status (success / failed) will appear here.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allPushedFiles.map((record) => (
                          <div
                            key={record.id}
                            className="p-3 rounded-xl border border-border bg-card hover:border-border/80 transition-all shadow-sm space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-muted text-foreground shrink-0">
                                  <Table2 className="size-4 text-purple-500" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground truncate" title={record.fileName}>
                                      {record.fileName}
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                                      📊 {record.sheetName}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {record.pushedAt
                                      ? new Date(record.pushedAt).toLocaleString()
                                      : "Recently"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {record.status === "processing" ? (
                                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] gap-1 font-mono">
                                    <Loader2 className="size-3 animate-spin" />
                                    Processing
                                  </Badge>
                                ) : record.status === "success" ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] gap-1 font-mono">
                                    <Check className="size-3" />
                                    Success
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px] gap-1 font-mono">
                                    <AlertCircle className="size-3" />
                                    Failed
                                  </Badge>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                  onClick={() => setActivePreviewTab(record.sheetId)}
                                  title="View sheet data in preview"
                                >
                                  View Sheet
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                              <span>
                                Dimensions: <strong className="text-foreground">{record.rowCount} rows</strong> × <strong className="text-foreground">{record.columnCount} cols</strong>
                              </span>
                              {record.error && (
                                <span className="text-red-500 text-[10px] font-mono truncate max-w-xs" title={record.error}>
                                  Reason: {record.error}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ─── Spreadsheet / Data Preview View ─── */
                  <div className="flex-1 min-h-0 overflow-hidden relative">
                    <ErrorBoundary
                      fallback={
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                          Loading spreadsheet view...
                        </div>
                      }
                    >
                      <div
                        className={`w-full h-full ${previewData && previewData.columns && previewData.columns.length > 0 ? "block" : "hidden"}`}
                      >
                        <SpreadsheetComponent
                          key={spreadsheetKey}
                          ref={spreadsheetRef}
                          created={onSpreadsheetCreated}
                          className="w-full h-full"
                          height="100%"
                          width="100%"
                          allowEditing={false}
                          showRibbon={false}
                          allowOpen={true}
                          allowSave={false}
                          sheets={[{ name: "Sheet1", showGridLines: true }]}
                        />
                      </div>
                    </ErrorBoundary>

                    {(!previewData ||
                      !previewData.columns ||
                      previewData.columns.length === 0) && (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6 text-center">
                        <div className="p-3.5 rounded-2xl bg-muted border border-border text-muted-foreground">
                          <Table2 className="size-7 opacity-70" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            {activePreviewTab === "output_preview"
                              ? "No Output Preview Data Yet"
                              : "No Sheet Data to Preview"}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {activePreviewTab === "output_preview"
                              ? "Run the block workflow to generate and view preview data from your Output Preview nodes."
                              : "Upload a CSV file to a sheet on the left panel, or load data from the previous BigBlock."}
                          </p>
                        </div>
                        {activePreviewTab === "output_preview" && (
                          <Button
                            size="sm"
                            onClick={() => onExecute(activeChild.id)}
                            disabled={activeChild.isExecuting}
                            className="h-7 text-xs gap-1.5 font-semibold shadow-sm"
                          >
                            {activeChild.isExecuting ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Play className="size-3 fill-current" />
                            )}
                            Execute Workflow
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* ─── Sheet Data Upload Modal ─── */}
      {uploadModalTarget && activeChild && (
        <SheetDataUploadModal
          open={uploadModalTarget !== null}
          onOpenChange={(open) => {
            if (!open) setUploadModalTarget(null);
          }}
          dashid={dashid}
          userId={userId}
          sheetName={uploadModalTarget.sheetName}
          onSelectDataset={handleDatasetLoaded}
        />
      )}

      {/* ─── Push File to Running Server Confirmation Dialog ─── */}
      {pendingPushData && (
        <Dialog
          open={pendingPushData !== null}
          onOpenChange={(open) => {
            if (!open) setPendingPushData(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  <FileUp className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Push File to Running Server Instance?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    This block has an active workflow execution running on the server.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dataset File:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]" title={pendingPushData.file.name}>
                    {pendingPushData.file.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Target Sheet:</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    📊 {pendingPushData.sheetName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {pendingPushData.dataset.data.length} rows × {pendingPushData.dataset.columns.length} columns
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-800 dark:text-purple-300 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Zap className="size-3.5 fill-current text-purple-500" />
                  Live Server Execution Mode
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Confirming will immediately send this dataset into the workflow running on your backend server. The file will be logged in this block&apos;s <strong>Pushed Files</strong> history tab with its execution status.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingPushData(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmPush}
                className="text-xs gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md"
              >
                <FileUp className="size-3.5" />
                Confirm &amp; Push to Server
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
