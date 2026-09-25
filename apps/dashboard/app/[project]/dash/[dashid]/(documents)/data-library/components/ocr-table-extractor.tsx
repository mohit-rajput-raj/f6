"use client";

import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  Sparkles,
  ScanText,
  Upload,
  FileSpreadsheet,
  Braces,
  Save,
  Check,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Table as TableIcon,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  Layers,
  Settings2,
  KeyRound,
  ArrowRight,
  Replace,
  RefreshCw,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@repo/ui/components/ui/tabs";
import { toast } from "sonner";
import Spreadsheet from "react-spreadsheet";
import { scanTableImageAction, type ReplacementRule } from "../ocr-actions";
import { createDataLibraryFile } from "../actions";
import {
  saveEncryptedOcrDraft,
  loadEncryptedOcrDraft,
  clearEncryptedOcrDraft,
} from "../lib/secure-ocr-storage";
import { TiledOcrManager } from "./tiled-ocr-manager";
import { OcrColumnTools } from "./ocr-column-tools";

// ── Types ──────────────────────────────────────────────────

interface OcrSettings {
  /** Free-form extra LLM prompt appended to the extraction prompt */
  customPrompt: string;
  /** Core LLM-level toggles */
  leaveUnclearBlank: boolean;
  handleCrossOuts: boolean;
  parseMultiTierDates: boolean;
  includeBottomNotes: boolean;
  /** User-defined find→replace rules applied AFTER extraction */
  replacementRules: ReplacementRule[];
}

const DEFAULT_OCR_SETTINGS: OcrSettings = {
  customPrompt: "",
  leaveUnclearBlank: true,
  handleCrossOuts: true,
  parseMultiTierDates: false,
  includeBottomNotes: true,
  replacementRules: [
    // Default rule: dots → A
    { find: ".", replace: "A", exactMatch: true, caseSensitive: true },
    { find: "•", replace: "A", exactMatch: true, caseSensitive: true },
    { find: "·", replace: "A", exactMatch: true, caseSensitive: true },
  ],
};

const SETTINGS_STORAGE_KEY = "ocr-extractor-settings-v2";

function loadSettings(): OcrSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_OCR_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_OCR_SETTINGS };
}

function saveSettings(settings: OcrSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

// ── Component ──────────────────────────────────────────────

interface OcrTableExtractorProps {
  dashid: string;
  userId: string;
  onSaveSuccess: () => Promise<void> | void;
  onCloseDrawer?: () => void;
  isInDrawer?: boolean;
}

export const OcrTableExtractor: React.FC<OcrTableExtractorProps> = ({
  dashid,
  userId,
  onSaveSuccess,
  onCloseDrawer,
  isInDrawer = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Extracted data state
  const [datasetName, setDatasetName] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [spreadsheetCells, setSpreadsheetCells] = useState<
    { value: string }[][]
  >([]);
  const [jsonFormat, setJsonFormat] = useState<"columns_data" | "records">(
    "columns_data",
  );
  const [copied, setCopied] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [ocrMode, setOcrMode] = useState<"single" | "tiled">("single");
  const [tiledSourceInfo, setTiledSourceInfo] = useState<string | null>(null);

  // Settings — loaded from localStorage on mount
  const [settings, setSettings] = useState<OcrSettings>(DEFAULT_OCR_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);

  // Rule editor state
  const [newRuleFind, setNewRuleFind] = useState("");
  const [newRuleReplace, setNewRuleReplace] = useState("");
  const [newRuleExact, setNewRuleExact] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Persist settings whenever they change (after initial load)
  const settingsLoadedRef = useRef(false);
  useEffect(() => {
    if (!settingsLoadedRef.current) {
      settingsLoadedRef.current = true;
      return;
    }
    saveSettings(settings);
  }, [settings]);

  // Restore encrypted draft from localStorage on mount
  useEffect(() => {
    if (!dashid) return;
    try {
      const draft = loadEncryptedOcrDraft(dashid);
      if (draft && (draft.columns?.length > 0 || draft.imagePreview)) {
        setDatasetName(draft.datasetName || "");
        setFileName(draft.fileName || "");
        setImagePreview(draft.imagePreview || null);
        setColumns(draft.columns || []);
        setSpreadsheetCells(draft.spreadsheetCells || []);
        setHasRestoredDraft(true);
      }
    } catch (err) {
      console.warn("Could not restore OCR draft:", err);
    }
  }, [dashid]);

  // Persist encrypted draft automatically to localStorage
  useEffect(() => {
    if (!dashid) return;
    if (columns.length === 0 && !imagePreview) return;

    const timer = setTimeout(() => {
      saveEncryptedOcrDraft(dashid, {
        datasetName,
        fileName,
        imagePreview,
        columns,
        spreadsheetCells,
        updatedAt: Date.now(),
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [dashid, datasetName, fileName, imagePreview, columns, spreadsheetCells]);

  // Blank cells counter
  const blankCellsCount = useMemo(() => {
    let count = 0;
    spreadsheetCells.forEach((row) => {
      row.forEach((cell) => {
        if (!cell || !cell.value || cell.value.trim() === "") {
          count++;
        }
      });
    });
    return count;
  }, [spreadsheetCells]);

  // ── Replacement Rules Management ────────────────────────

  const addReplacementRule = () => {
    if (!newRuleFind.trim()) {
      toast.error("Enter what to find");
      return;
    }
    const newRule: ReplacementRule = {
      find: newRuleFind,
      replace: newRuleReplace,
      exactMatch: newRuleExact,
      caseSensitive: true,
    };
    setSettings((prev) => ({
      ...prev,
      replacementRules: [...prev.replacementRules, newRule],
    }));
    setNewRuleFind("");
    setNewRuleReplace("");
    toast.success(`Rule added: "${newRule.find}" → "${newRule.replace}"`);
  };

  const removeReplacementRule = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      replacementRules: prev.replacementRules.filter((_, i) => i !== index),
    }));
  };

  // Apply replacement rules to existing extracted data (post-extraction batch apply)
  const applyRulesToExistingData = () => {
    if (settings.replacementRules.length === 0) {
      toast.info("No replacement rules configured");
      return;
    }
    if (spreadsheetCells.length === 0) {
      toast.error("No data to process");
      return;
    }

    let totalReplacements = 0;
    const updated = spreadsheetCells.map((row) =>
      row.map((cell) => {
        if (!cell?.value) return cell;
        let val = cell.value;

        for (const rule of settings.replacementRules) {
          if (rule.exactMatch !== false) {
            if (val === rule.find) {
              val = rule.replace;
              totalReplacements++;
            }
          } else {
            const before = val;
            val = val.split(rule.find).join(rule.replace);
            if (val !== before) totalReplacements++;
          }
        }

        return { value: val };
      }),
    );

    setSpreadsheetCells(updated);
    toast.success(`Applied rules: ${totalReplacements} cell(s) updated`);
  };

  // ── File Handling ───────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WEBP)");
      return;
    }

    setFileName(file.name);
    const defaultName =
      file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") ||
      "OCR Extracted Table";
    setDatasetName(defaultName);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcrScan(base64, defaultName);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file (PNG, JPG, WEBP)");
      return;
    }

    setFileName(file.name);
    const defaultName =
      file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") ||
      "OCR Extracted Table";
    setDatasetName(defaultName);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcrScan(base64, defaultName);
    };
    reader.readAsDataURL(file);
  };

  // ── Scan trigger ────────────────────────────────────────

  const triggerOcrScan = async (base64Image: string, fallbackName: string) => {
    setIsScanning(true);
    try {
      const res = await scanTableImageAction(base64Image, {
        customPrompt: settings.customPrompt,
        dotToA: settings.replacementRules.some((r) => r.find === "." && r.replace === "A"),
        leaveUnclearBlank: settings.leaveUnclearBlank,
        handleCrossOuts: settings.handleCrossOuts,
        parseMultiTierDates: settings.parseMultiTierDates,
        includeBottomNotes: settings.includeBottomNotes,
        replacementRules: settings.replacementRules,
        userId,
      });

      // If the API says we need a key, show the popup
      if (res.needsApiKey) {
        setShowApiKeyPopup(true);
        setIsScanning(false);
        return;
      }

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to extract table data");
      }

      const extractedCols = res.data.columns || [];
      const extractedRows = res.data.data || [];

      if (extractedCols.length === 0 && extractedRows.length === 0) {
        toast.error(
          "No table structure detected in the image. Please try a clearer image.",
        );
        return;
      }

      setColumns(extractedCols);
      const formatted = extractedRows.map((row) =>
        extractedCols.map((_, colIdx) => ({
          value:
            row[colIdx] !== null && row[colIdx] !== undefined
              ? String(row[colIdx])
              : "",
        })),
      );
      setSpreadsheetCells(formatted);
      setDatasetName(
        fallbackName || `OCR Table - ${new Date().toLocaleDateString()}`,
      );
      setHasRestoredDraft(false);

      toast.success(
        `Extracted ${extractedCols.length} columns & ${extractedRows.length} rows (${res.source === "pyp" ? "AI Server" : "Gemini Vision"})`,
      );
    } catch (err: any) {
      console.error("OCR Error:", err);
      toast.error(err.message || "Error processing OCR");
    } finally {
      setIsScanning(false);
    }
  };

  // ── Cell / Table Manipulation ───────────────────────────

  const handleSpreadsheetChange = useCallback(
    (newData: ({ value: string } | undefined)[][]) => {
      const normalized = newData.map((row) =>
        (row || []).map((cell) => ({ value: cell?.value ?? "" })),
      );
      setSpreadsheetCells(normalized);
    },
    [],
  );

  const handleAddRow = () => {
    if (columns.length === 0) {
      setColumns(["Column 1"]);
      setSpreadsheetCells([[{ value: "" }]]);
      return;
    }
    const newRow = columns.map(() => ({ value: "" }));
    setSpreadsheetCells((prev) => [...prev, newRow]);
  };

  const handleAddColumn = () => {
    const newColName = `Column ${columns.length + 1}`;
    setColumns((prev) => [...prev, newColName]);
    setSpreadsheetCells((prev) => prev.map((row) => [...row, { value: "" }]));
  };

  const handleRemoveColumn = (colIndex: number) => {
    if (columns.length <= 1) {
      toast.error("At least one column is required");
      return;
    }
    setColumns((prev) => prev.filter((_, idx) => idx !== colIndex));
    setSpreadsheetCells((prev) =>
      prev.map((row) => row.filter((_, idx) => idx !== colIndex)),
    );
  };

  const handleColumnNameChange = (index: number, newName: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[index] = newName;
      return next;
    });
  };

  const rawDataRows = useMemo(() => {
    return spreadsheetCells.map((row) =>
      columns.map((_, i) =>
        row[i]?.value !== undefined ? String(row[i].value) : "",
      ),
    );
  }, [spreadsheetCells, columns]);

  const jsonPreviewString = useMemo(() => {
    if (jsonFormat === "columns_data") {
      return JSON.stringify(
        {
          columns,
          data: rawDataRows,
        },
        null,
        2,
      );
    } else {
      const records = rawDataRows.map((row) => {
        const obj: Record<string, string> = {};
        columns.forEach((col, idx) => {
          obj[col || `col_${idx + 1}`] = row[idx] ?? "";
        });
        return obj;
      });
      return JSON.stringify(records, null, 2);
    }
  }, [columns, rawDataRows, jsonFormat]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonPreviewString);
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearPreviousData = () => {
    setImagePreview(null);
    setFileName("");
    setColumns([]);
    setSpreadsheetCells([]);
    setDatasetName("");
    setTiledSourceInfo(null);
    setHasRestoredDraft(false);
    clearEncryptedOcrDraft(dashid);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Previous extraction data cleared");
  };

  const handleTiledStitchComplete = ({
    columns: stitchedCols,
    data: stitchedData,
    datasetNameSuggestion,
  }: {
    columns: string[];
    data: (string | null)[][];
    datasetNameSuggestion: string;
  }) => {
    setColumns(stitchedCols);
    const formatted = stitchedData.map((row) =>
      stitchedCols.map((_, colIdx) => ({
        value:
          row[colIdx] !== null && row[colIdx] !== undefined
            ? String(row[colIdx])
            : "",
      })),
    );
    setSpreadsheetCells(formatted);
    setDatasetName(datasetNameSuggestion);
    setFileName("Multi-Photo Tiled OCR");
    setTiledSourceInfo(
      `Stitched from multi-photo tiled grid (${stitchedCols.length} cols × ${stitchedData.length} rows)`,
    );
    setHasRestoredDraft(false);
    toast.success("Spreadsheet reconstructed from tiles! You can now edit cells or save to library.");
  };

  const handleSaveToLibrary = async () => {
    if (!userId) {
      toast.error("You must be logged in to save");
      return;
    }
    if (columns.length === 0) {
      toast.error("No table data to save");
      return;
    }

    const title = datasetName.trim() || "OCR Extracted Table";
    setIsSaving(true);
    try {
      await createDataLibraryFile({
        userId,
        name: title,
        description: `Extracted via OCR from ${fileName || "table image"} (${columns.length} cols × ${rawDataRows.length} rows)`,
        fileType: "json",
        data: {
          columns,
          data: rawDataRows,
        },
        metadata: {
          rowCount: rawDataRows.length,
          colCount: columns.length,
          source: "ocr",
          originalFileName: fileName,
          extractedAt: new Date().toISOString(),
        },
        workflowId: dashid,
      });

      toast.success(`"${title}" saved to Data Library successfully!`);
      clearEncryptedOcrDraft(dashid);
      setImagePreview(null);
      setFileName("");
      setColumns([]);
      setSpreadsheetCells([]);
      setDatasetName("");
      setHasRestoredDraft(false);

      await onSaveSuccess();
      if (onCloseDrawer) {
        onCloseDrawer();
      }
    } catch (err: any) {
      console.error("Failed to save to library:", err);
      toast.error(err?.message || "Failed to save dataset");
    } finally {
      setIsSaving(false);
    }
  };

  const hasData = columns.length > 0;

  // ── Render ──────────────────────────────────────────────

  return (
    <div
      className={`w-full h-full flex flex-col transition-all duration-300 ${
        isInDrawer
          ? "space-y-4"
          : "rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden"
      }`}
    >
      {/* ── API Key Missing Popup/Overlay ─────────────── */}
      {showApiKeyPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                <KeyRound className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Gemini API Key Required
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A valid Gemini API key is needed for OCR extraction
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-800 dark:text-amber-200 space-y-2">
              <p className="font-medium">How to get your Gemini API key:</p>
              <ol className="list-decimal list-inside text-xs space-y-1 text-amber-700 dark:text-amber-300">
                <li>
                  Go to{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 font-medium"
                  >
                    aistudio.google.com/apikey
                  </a>
                </li>
                <li>Create or copy an API key (starts with <code className="bg-amber-500/20 px-1 rounded text-[11px]">AIza...</code>)</li>
                <li>Add it in your Profile &rarr; Settings &rarr; API Keys</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowApiKeyPopup(false)}
                className="flex-1 cursor-pointer"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowApiKeyPopup(false);
                  // Navigate to settings — user can add key there
                  window.open("/settings", "_blank");
                }}
                className="flex-1 cursor-pointer gap-1.5"
              >
                <KeyRound className="size-3.5" />
                Go to Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner / Header (when rendered standalone) */}
      {!isInDrawer && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm shadow-purple-500/20">
              <ScanText className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  AI Table OCR & Extraction
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-purple-300 text-purple-600 dark:border-purple-800 dark:text-purple-300 px-1.5 py-0"
                >
                  <Sparkles className="size-2.5 mr-1" /> Vision Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Extract printed or digital tables from images into editable
                spreadsheets and JSON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(imagePreview || hasData) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPreviousData}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                title="Clear previous extraction data and saved draft"
              >
                <Trash2 className="size-3.5" /> Clear Data
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-8 w-8 p-0"
              title={isOpen ? "Collapse OCR section" : "Expand OCR section"}
            >
              {isOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Persistence and Actions Bar inside Drawer */}
      {isInDrawer && (
        <div className="flex items-center justify-between pb-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] gap-1 border-primary/20 bg-primary/5 text-primary"
            >
              <Lock className="size-3" />
              <span>Encrypted Auto-Save Active</span>
            </Badge>
            {hasRestoredDraft && (
              <Badge
                variant="secondary"
                className="text-[11px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
              >
                <ShieldCheck className="size-3" />
                <span>Restored unsaved draft</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(imagePreview || hasData) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearPreviousData}
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Clear Previous Data</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {(isOpen || isInDrawer) && (
        <div
          className={`flex flex-col flex-1 ${isInDrawer ? "space-y-4" : "p-5 space-y-4"}`}
        >
          {/* Mode Switcher when no active table data is being viewed */}
          {!columns.length && !isScanning && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
              <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setOcrMode("single")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    ocrMode === "single"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ScanText className="size-3.5 text-primary" />
                  <span>Single Image OCR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOcrMode("tiled")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    ocrMode === "tiled"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="size-3.5 text-purple-600" />
                  <span>Multi-Photo Tiled OCR</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold border-purple-400 text-purple-600 dark:border-purple-600 dark:text-purple-300 px-1 py-0 ml-0.5"
                  >
                    Chunking
                  </Badge>
                </button>
              </div>

              <span className="text-xs text-muted-foreground">
                {ocrMode === "single"
                  ? "Standard single photo or full-table screenshot extraction"
                  : "Stitch 2, 4, 9, or more photos into a unified spreadsheet by X/Y coordinates"}
              </span>
            </div>
          )}

          {/* ── Mode 1: Single Image Mode ─────────────── */}
          {!columns.length && !isScanning && ocrMode === "single" && (
            <div className="space-y-3">
              {/* ── OCR Settings Panel (collapsible) ── */}
              <div className="rounded-xl border bg-muted/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs cursor-pointer hover:bg-muted/30 transition"
                >
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Settings2 className="size-3.5 text-primary" />
                    <span>OCR Settings & Replacement Rules</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-semibold border-primary/30 text-primary ml-1"
                    >
                      {settings.replacementRules.length} rule{settings.replacementRules.length !== 1 ? "s" : ""}
                    </Badge>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      Settings auto-saved to browser
                    </span>
                    {showSettings ? (
                      <ChevronUp className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {showSettings && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t">
                    {/* LLM Prompt Toggles */}
                    <div className="pt-3 space-y-2">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        AI Vision Extraction Rules
                      </span>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {[
                          {
                            key: "leaveUnclearBlank" as const,
                            label: "Leave unclear/illegible cells blank",
                            desc: "AI returns empty string instead of guessing",
                          },
                          {
                            key: "handleCrossOuts" as const,
                            label: "Handle handwritten cross-outs",
                            desc: "Extract corrected text from crossed-out entries",
                          },
                          {
                            key: "parseMultiTierDates" as const,
                            label: "Merge multi-tier date headers",
                            desc: "Combine day+month headers (e.g. 06/Aug)",
                          },
                          {
                            key: "includeBottomNotes" as const,
                            label: "Capture bottom appended rows",
                            desc: "Include handwritten rows below the table grid",
                          },
                        ].map((toggle) => (
                          <label
                            key={toggle.key}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer select-none"
                            title={toggle.desc}
                          >
                            <input
                              type="checkbox"
                              checked={settings[toggle.key]}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  [toggle.key]: e.target.checked,
                                }))
                              }
                              className="rounded text-primary size-3.5"
                            />
                            <span className="font-medium text-foreground text-[11px]">
                              {toggle.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Custom Prompt */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Custom LLM Prompt (optional)
                      </span>
                      <Input
                        value={settings.customPrompt}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            customPrompt: e.target.value,
                          }))
                        }
                        placeholder="e.g. 'Ignore last 2 rows they are totals', 'Column headers are in Devanagari script'"
                        className="h-8 text-xs font-mono bg-background"
                      />
                    </div>

                    {/* ── Dynamic Replacement Rules ── */}
                    <div className="space-y-2 pt-1 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Replace className="size-3 text-primary" />
                          Post-Extraction Replacement Rules
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Applied after AI extraction — choose what to find & replace
                        </span>
                      </div>

                      {/* Current rules list */}
                      {settings.replacementRules.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {settings.replacementRules.map((rule, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-background text-[11px] group"
                            >
                              <code className="font-mono px-1 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300">
                                {rule.find === " " ? "⎵" : rule.find || '""'}
                              </code>
                              <ArrowRight className="size-2.5 text-muted-foreground" />
                              <code className="font-mono px-1 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-300">
                                {rule.replace || '""'}
                              </code>
                              {rule.exactMatch === false && (
                                <span className="text-[9px] text-muted-foreground">(partial)</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeReplacementRule(idx)}
                                className="text-muted-foreground/40 hover:text-destructive transition cursor-pointer ml-0.5 opacity-0 group-hover:opacity-100"
                                title="Remove rule"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No replacement rules. Extracted data will be used as-is.
                        </p>
                      )}

                      {/* Add new rule */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Input
                          value={newRuleFind}
                          onChange={(e) => setNewRuleFind(e.target.value)}
                          placeholder="Find (e.g.  .  or  P  or  NA)"
                          className="h-7 w-32 text-xs font-mono"
                        />
                        <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                        <Input
                          value={newRuleReplace}
                          onChange={(e) => setNewRuleReplace(e.target.value)}
                          placeholder="Replace (e.g.  A  or  Present)"
                          className="h-7 w-32 text-xs font-mono"
                        />
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={newRuleExact}
                            onChange={(e) => setNewRuleExact(e.target.checked)}
                            className="size-3 rounded"
                          />
                          Exact match
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addReplacementRule}
                          className="h-7 text-xs gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="size-3" />
                          Add Rule
                        </Button>
                      </div>

                      {/* Quick presets for common rules */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Quick add:</span>
                        {[
                          { find: ".", replace: "A", label: ". → A" },
                          { find: "•", replace: "A", label: "• → A" },
                          { find: "P", replace: "Present", label: "P → Present" },
                          { find: "A", replace: "Absent", label: "A → Absent" },
                          { find: "-", replace: "", label: "- → (blank)" },
                          { find: "NA", replace: "", label: "NA → (blank)" },
                          { find: "N/A", replace: "", label: "N/A → (blank)" },
                        ].map((preset) => {
                          const alreadyExists = settings.replacementRules.some(
                            (r) => r.find === preset.find && r.replace === preset.replace,
                          );
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              disabled={alreadyExists}
                              onClick={() => {
                                setSettings((prev) => ({
                                  ...prev,
                                  replacementRules: [
                                    ...prev.replacementRules,
                                    {
                                      find: preset.find,
                                      replace: preset.replace,
                                      exactMatch: true,
                                      caseSensitive: true,
                                    },
                                  ],
                                }));
                                toast.success(`Added rule: ${preset.label}`);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition ${
                                alreadyExists
                                  ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through"
                                  : "bg-muted/60 hover:bg-muted text-foreground"
                              }`}
                            >
                              +{preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Reset to defaults */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSettings(DEFAULT_OCR_SETTINGS);
                            toast.info("Settings reset to defaults");
                          }}
                          className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer flex items-center gap-1 underline underline-offset-2"
                        >
                          <RotateCcw className="size-2.5" />
                          Reset all settings to defaults
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`min-h-[220px] border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="size-7" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                Drop table image here, or{" "}
                <span className="text-primary underline underline-offset-2">
                  browse files
                </span>
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Supports PNG, JPG, or WEBP. Works with attendance sheets,
                financial tables, invoices, voter lists, tour records, or any
                tabular image.
              </p>
            </div>
          </div>
        )}

          {/* Mode 2: Multi-Photo Tiled OCR Mode */}
          {!columns.length && !isScanning && ocrMode === "tiled" && (
            <TiledOcrManager
              userId={userId}
              onStitchComplete={handleTiledStitchComplete}
            />
          )}

          {/* Scanning Progress State */}
          {isScanning && (
            <div className="flex-1 min-h-[250px] border rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 bg-muted/10">
              <div className="relative">
                <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground animate-pulse shadow-md">
                  <ScanText className="size-7 animate-bounce" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-sm -z-10 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Processing Table Image
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  AI vision model is detecting table structure, headers, and all
                  cell values...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Extracting JSON & formatting spreadsheet</span>
              </div>
            </div>
          )}

          {/* Result Workbench (when table data is available) */}
          {columns.length > 0 && !isScanning && (
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative size-11 rounded-lg overflow-hidden border bg-background shrink-0 shadow-2xs">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Source Table"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-500/10 text-purple-600">
                        <Layers className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="Dataset Name"
                      className="h-9 text-sm font-semibold bg-background max-w-md"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {tiledSourceInfo && (
                    <Badge
                      variant="outline"
                      className="text-xs py-1 px-2 border-purple-400 bg-purple-500/10 text-purple-700 dark:text-purple-300 gap-1 font-medium"
                    >
                      <Layers className="size-3" />
                      <span>Tiled Reconstructed</span>
                    </Badge>
                  )}

                  <Badge
                    variant="secondary"
                    className="text-xs py-1 px-2.5 font-medium"
                  >
                    {columns.length} cols × {spreadsheetCells.length} rows
                  </Badge>

                  {blankCellsCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs py-1 px-2 border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-1"
                      title={`${blankCellsCount} cells were returned empty. Click on cells to edit them directly.`}
                    >
                      <AlertCircle className="size-3" />
                      {blankCellsCount} empty cell
                      {blankCellsCount > 1 ? "s" : ""}
                    </Badge>
                  )}

                  {/* Apply replacement rules to existing data */}
                  {settings.replacementRules.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyRulesToExistingData}
                      className="h-8 text-xs gap-1 cursor-pointer font-medium border-primary/30 text-primary hover:bg-primary/10"
                      title="Re-apply all replacement rules to the current data"
                    >
                      <RefreshCw className="size-3" />
                      <span>Apply Rules ({settings.replacementRules.length})</span>
                    </Button>
                  )}

                  {tiledSourceInfo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setColumns([]);
                        setSpreadsheetCells([]);
                        setOcrMode("tiled");
                      }}
                      className="h-8 text-xs gap-1 cursor-pointer font-medium"
                      title="Adjust tile coordinates, add more photos, and re-stitch"
                    >
                      <RotateCcw className="size-3" />
                      <span>Adjust Tiles</span>
                    </Button>
                  )}

                  <Button
                    onClick={handleClearPreviousData}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                    title="Clear previous data"
                  >
                    <Trash2 className="size-3" />
                    <span>Clear</span>
                  </Button>

                  <Button
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5 font-medium px-3.5"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>{isSaving ? "Saving..." : "Save to Library"}</span>
                  </Button>
                </div>
              </div>

              {/* Informational Banner */}
              {blankCellsCount > 0 && (
                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Some cells are empty because OCR couldn't clearly
                      recognize them. You can click and type in the spreadsheet
                      table below to edit or fill them before saving.
                    </span>
                  </div>
                </div>
              )}

              {/* Column Header Automation & Data Fixer Tools */}
              <OcrColumnTools
                columns={columns}
                spreadsheetCells={spreadsheetCells}
                onUpdateColumns={(newCols) => setColumns(newCols)}
                onUpdateCells={(newCells) => setSpreadsheetCells(newCells)}
              />

              {/* Dual Previews Tabs: Spreadsheet & JSON */}
              <Tabs defaultValue="spreadsheet" className="w-full">
                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                  <TabsList className="h-8 bg-muted/60 p-0.5">
                    <TabsTrigger
                      value="spreadsheet"
                      className="text-xs h-7 gap-1.5 px-3 font-medium"
                    >
                      <TableIcon className="size-3.5" />
                      Spreadsheet Editor
                    </TabsTrigger>
                    <TabsTrigger
                      value="json"
                      className="text-xs h-7 gap-1.5 px-3 font-medium"
                    >
                      <Braces className="size-3.5" />
                      JSON Preview
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Row
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Column
                    </Button>
                  </div>
                </div>

                {/* Spreadsheet View */}
                <TabsContent value="spreadsheet" className="mt-3">
                  <div className="border rounded-xl bg-background overflow-hidden shadow-2xs">
                    {/* Header Columns Editor */}
                    <div className="flex items-center gap-2 p-2.5 bg-muted/30 border-b overflow-x-auto text-xs">
                      <span className="font-semibold text-muted-foreground uppercase text-[10px] shrink-0 px-1">
                        Headers:
                      </span>
                      {columns.map((col, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-background border rounded-md px-2 py-0.5 shrink-0 shadow-2xs"
                        >
                          <input
                            type="text"
                            value={col}
                            onChange={(e) =>
                              handleColumnNameChange(idx, e.target.value)
                            }
                            className="bg-transparent border-none text-xs font-medium focus:outline-none w-24"
                            placeholder={`Col ${idx + 1}`}
                          />
                          {columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveColumn(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 cursor-pointer"
                              title="Delete column"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Interactive React Spreadsheet */}
                    <div className="max-h-[380px] overflow-auto p-2">
                      <Spreadsheet
                        data={spreadsheetCells}
                        onChange={handleSpreadsheetChange}
                        columnLabels={columns}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* JSON View */}
                <TabsContent value="json" className="mt-3">
                  <div className="border rounded-xl bg-background overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          Format:
                        </span>
                        <div className="flex rounded-lg border bg-background p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setJsonFormat("columns_data")}
                            className={`px-2.5 py-0.5 text-xs rounded-md transition cursor-pointer ${
                              jsonFormat === "columns_data"
                                ? "bg-muted font-semibold text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Columns & Rows
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonFormat("records")}
                            className={`px-2.5 py-0.5 text-xs rounded-md transition cursor-pointer ${
                              jsonFormat === "records"
                                ? "bg-muted font-semibold text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Object Records
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJson}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        {copied ? (
                          <Check className="size-3 text-primary" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>{copied ? "Copied" : "Copy JSON"}</span>
                      </Button>
                    </div>

                    <pre className="max-h-[380px] overflow-auto p-4 text-xs font-mono bg-muted/10 text-foreground">
                      {jsonPreviewString}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OcrTableExtractor;
