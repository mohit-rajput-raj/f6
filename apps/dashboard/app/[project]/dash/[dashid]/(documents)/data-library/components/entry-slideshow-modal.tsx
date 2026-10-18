"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  CheckCircle2,
  HardDrive,
  Database,
  Sparkles,
  ArrowRight,
  SkipForward,
  Loader2,
  KeyRound,
  BarChart3,
  TrendingUp,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Star,
  Sliders,
  Palette,
  Check,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import {
  saveStoredSlideshow,
  clearStoredSlideshow,
  serializeDataset,
  type SlideshowInputType,
} from "../lib/dataset-helpers";
import { updateDataLibraryFile } from "../actions";
import { CellDatePicker } from "./cell-date-picker";
import { CellImageUploader } from "./cell-image-uploader";

interface EntrySlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    metadata?: any;
  } | null;
  columns: string[];
  rows: any[][];
  columnName: string;
  inputType: SlideshowInputType;
  columnType?: string;
  optionsList: string[];
  keyColIndex: number;
  initialAnswers?: Record<number, string>;
  initialIndex?: number;
  userId: string;
  onCompleted: () => void;
}

const EMPTY_ANSWERS: Record<number, string> = {};

export const EntrySlideshowModal: React.FC<EntrySlideshowModalProps> = ({
  isOpen,
  onClose,
  file,
  columns,
  rows,
  columnName,
  inputType,
  columnType,
  optionsList,
  keyColIndex,
  initialAnswers = EMPTY_ANSWERS,
  initialIndex = 0,
  userId,
  onCompleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers] =
    useState<Record<number, string>>(initialAnswers);
  const [textValue, setTextValue] = useState("");
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState<"row" | "session">(
    "row",
  );
  const [showGraphDetails, setShowGraphDetails] = useState(false);

  // Stopwatch state for Time capture
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [resetAfterCatch, setResetAfterCatch] = useState(false);
  const stopwatchStartTimeRef = useRef<number>(0);
  const stopwatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchStartTimeRef.current = Date.now() - stopwatchMs;
      stopwatchTimerRef.current = setInterval(() => {
        setStopwatchMs(Date.now() - stopwatchStartTimeRef.current);
      }, 50);
    } else {
      if (stopwatchTimerRef.current) {
        clearInterval(stopwatchTimerRef.current);
        stopwatchTimerRef.current = null;
      }
    }
    return () => {
      if (stopwatchTimerRef.current) {
        clearInterval(stopwatchTimerRef.current);
      }
    };
  }, [stopwatchRunning]);

  // Clean formatted stopwatch display: MM:SS.ss
  const formatStopwatchDisplay = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hundredths = Math.floor((ms % 1000) / 10);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) {
      const remMins = mins % 60;
      return `${String(hrs).padStart(2, "0")}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  };

  const getCleanTimeValue = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) {
      const remMins = mins % 60;
      return `${String(hrs).padStart(2, "0")}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCatchStopwatchTime = (autoAdvance = true) => {
    const val = getCleanTimeValue(stopwatchMs);
    setTextValue(val);
    if (resetAfterCatch) {
      setStopwatchMs(0);
    }
    if (autoAdvance) {
      handleAnswer(val);
    }
  };

  const handleCatchCurrentClockTime = (autoAdvance = true) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    setTextValue(timeStr);
    if (autoAdvance) {
      handleAnswer(timeStr);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenSessionRef = useRef<{ isOpen: boolean; columnName: string }>({
    isOpen: false,
    columnName: "",
  });

  const totalRows = rows.length;
  const currentRow = rows[currentIndex] || [];
  const keyColumnName = columns[keyColIndex] || "Key ID";
  const currentKeyId =
    currentRow[keyColIndex] !== undefined && currentRow[keyColIndex] !== ""
      ? String(currentRow[keyColIndex])
      : `Row #${currentIndex + 1}`;

  // Smart detect secondary identifier column (e.g. Student Name, Employee Name, Label)
  const secondaryColIndex = useMemo(() => {
    const nameKeywords = [
      "name",
      "student",
      "employee",
      "person",
      "title",
      "label",
      "user",
    ];
    return columns.findIndex((col, idx) => {
      if (idx === keyColIndex) return false;
      const lower = col.toLowerCase().replace(/[^a-z]/g, "");
      return nameKeywords.some((kw) => lower.includes(kw));
    });
  }, [columns, keyColIndex]);

  const secondaryValue =
    secondaryColIndex !== -1
      ? String(currentRow[secondaryColIndex] ?? "").trim()
      : "";

  // 1. Graph Tab 1: Counts of values for THIS current row across past columns
  // Filter out numeric metadata columns (e.g. Class No, Roll, Reg, Phone)
  const rowHistoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    const metadataKeywords = [
      "class",
      "roll",
      "reg",
      "phone",
      "email",
      "id",
      "code",
      "no.",
      "number",
    ];

    columns.forEach((col, idx) => {
      if (idx === keyColIndex || idx === secondaryColIndex) return;

      const colLower = col.toLowerCase().trim();
      if (
        metadataKeywords.some(
          (kw) =>
            colLower === kw || colLower.startsWith(kw) || colLower.endsWith(kw),
        )
      ) {
        return;
      }

      const val = String(currentRow[idx] ?? "").trim();
      if (!val) return;

      // If optionsList is defined, only count values that match the options
      if (optionsList.length > 0) {
        const matched = optionsList.find(
          (opt) => opt.toLowerCase() === val.toLowerCase(),
        );
        if (!matched) return;
        counts[matched] = (counts[matched] || 0) + 1;
        total++;
      } else {
        counts[val] = (counts[val] || 0) + 1;
        total++;
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { list: sorted, total };
  }, [columns, currentRow, keyColIndex, secondaryColIndex, optionsList]);

  // 2. Graph Tab 2: Live session counts across all rows for this new column
  const liveSessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let answered = 0;

    Object.values(answers).forEach((val) => {
      const trimmed = String(val).trim();
      if (trimmed) {
        counts[trimmed] = (counts[trimmed] || 0) + 1;
        answered++;
      }
    });

    const pending = Math.max(0, totalRows - answered);

    const list: { label: string; count: number; pct: number }[] = [];

    if (optionsList.length > 0) {
      optionsList.forEach((opt) => {
        const c = counts[opt] || 0;
        const pct = totalRows > 0 ? Math.round((c / totalRows) * 100) : 0;
        list.push({ label: opt, count: c, pct });
      });
    } else {
      Object.entries(counts).forEach(([k, c]) => {
        const pct = totalRows > 0 ? Math.round((c / totalRows) * 100) : 0;
        list.push({ label: k, count: c, pct });
      });
    }

    const answeredPct =
      totalRows > 0 ? Math.round((answered / totalRows) * 100) : 0;
    const pendingPct =
      totalRows > 0 ? Math.round((pending / totalRows) * 100) : 0;

    return {
      list,
      answered,
      answeredPct,
      pending,
      pendingPct,
      total: totalRows,
    };
  }, [answers, totalRows, optionsList]);

  // Keep text field synced with existing answer if revisiting a row
  const currentAnswer = answers[currentIndex];
  useEffect(() => {
    if (currentAnswer !== undefined) {
      setTextValue(currentAnswer);
    } else {
      setTextValue("");
    }
  }, [currentIndex, currentAnswer]);

  // Focus input automatically for text or number type
  useEffect(() => {
    if (isOpen && (inputType === "text" || inputType === "number")) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, currentIndex, inputType]);

  // Reset or initialize only when modal opens or column changes
  useEffect(() => {
    const wasOpen = prevOpenSessionRef.current.isOpen;
    const prevCol = prevOpenSessionRef.current.columnName;
    const isNewSession =
      (isOpen && !wasOpen) || (isOpen && columnName !== prevCol);

    if (isNewSession) {
      setCurrentIndex(initialIndex);
      setAnswers(initialAnswers);
      setJustCompleted(false);
      setIsSaving(false);
    }
    prevOpenSessionRef.current = { isOpen, columnName };
  }, [isOpen, columnName, initialIndex, initialAnswers]);

  // Save progress to local storage whenever answers or index change
  const persistToLocalStorage = useCallback(
    (newAnswers: Record<number, string>, nextIndex: number) => {
      if (!file?.id) return;
      saveStoredSlideshow({
        fileId: file.id,
        columnName,
        inputType,
        optionsList,
        keyColIndex,
        answers: newAnswers,
        currentIndex: nextIndex,
        totalRows,
        updatedAt: Date.now(),
      });
    },
    [file?.id, columnName, inputType, optionsList, keyColIndex, totalRows],
  );

  // Finalize and save to Database when the last key is completed
  const handleFinalSave = async (finalAnswers: Record<number, string>) => {
    if (!file?.id || !userId) return;
    setIsSaving(true);
    setJustCompleted(true);

    try {
      const colIdx = columns.indexOf(columnName);
      let updatedColumns: string[];
      let updatedRows: any[][];

      if (colIdx !== -1) {
        // Column already exists (pre-created or updating in-place): update existing column
        updatedColumns = [...columns];
        updatedRows = rows.map((row, idx) => {
          const rowVal =
            finalAnswers[idx] !== undefined
              ? finalAnswers[idx]
              : (row[colIdx] ?? "");
          const copy = [...row];
          copy[colIdx] = rowVal;
          return copy;
        });
      } else {
        // Brand new column: append it
        updatedColumns = [...columns, columnName];
        updatedRows = rows.map((row, idx) => {
          const rowVal =
            finalAnswers[idx] !== undefined ? finalAnswers[idx] : "";
          return [...row, rowVal];
        });
      }

      const payload = serializeDataset(updatedColumns, updatedRows);
      const targetType =
        columnType || (inputType === "options" ? "options" : inputType);

      await updateDataLibraryFile(file.id, userId, {
        data: payload,
        metadata: {
          ...(file.metadata || {}),
          rowCount: updatedRows.length,
          colCount: updatedColumns.length,
          columnTypes: {
            ...(file.metadata?.columnTypes || {}),
            [columnName]: targetType,
          },
        },
      });

      clearStoredSlideshow(file.id);

      toast.success(`Column "${columnName}" successfully saved to database!`);

      onCompleted();

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to save slideshow dataset to DB:", err);
      toast.error(
        "Failed to save changes to database. Your progress remains saved locally.",
      );
      setIsSaving(false);
      setJustCompleted(false);
    }
  };

  // Submit an answer for the current row
  const handleAnswer = useCallback(
    async (value: string) => {
      const updatedAnswers = {
        ...answers,
        [currentIndex]: value,
      };
      setAnswers(updatedAnswers);

      if (currentIndex >= totalRows - 1) {
        await handleFinalSave(updatedAnswers);
      } else {
        const nextIndex = currentIndex + 1;
        setSlideDirection(1);
        setCurrentIndex(nextIndex);
        persistToLocalStorage(updatedAnswers, nextIndex);
      }
    },
    [answers, currentIndex, totalRows, persistToLocalStorage],
  );

  // Navigate to previous slide
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection(-1);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      persistToLocalStorage(answers, prevIndex);
    }
  }, [currentIndex, answers, persistToLocalStorage]);

  // Skip current slide (leave empty)
  const handleSkip = useCallback(() => {
    handleAnswer("");
  }, [handleAnswer]);

  // Keyboard navigation & quick shortcuts
  useEffect(() => {
    if (!isOpen || isSaving || justCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAnswer(textValue);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSkip();
        return;
      }

      // Time stopwatch shortcut: Space toggles, 'c' catches elapsed time
      if (inputType === "time") {
        if (e.key === " ") {
          e.preventDefault();
          setStopwatchRunning((prev) => !prev);
          return;
        }
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          handleCatchStopwatchTime(true);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleAnswer(textValue || getCleanTimeValue(stopwatchMs));
          return;
        }
      }

      // Boolean shortcuts: 1/T/Y for True, 2/F/N for False
      if (inputType === "boolean") {
        const k = e.key.toLowerCase();
        if (k === "1" || k === "t" || k === "y") {
          e.preventDefault();
          handleAnswer("True");
          return;
        }
        if (k === "2" || k === "f" || k === "n") {
          e.preventDefault();
          handleAnswer("False");
          return;
        }
      }

      // Rating shortcuts: 1 - 5
      if (inputType === "rating") {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          e.preventDefault();
          handleAnswer(String(num));
          return;
        }
      }

      // Slider / number shortcut: Enter
      if (
        inputType === "slider" ||
        inputType === "number" ||
        inputType === "text"
      ) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAnswer(textValue || "0");
          return;
        }
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= optionsList.length) {
        e.preventDefault();
        handleAnswer(optionsList[num - 1]);
        return;
      }

      const pressedChar = e.key.toUpperCase();
      const matched = optionsList.find(
        (opt) =>
          opt.trim().toUpperCase() === pressedChar ||
          opt.trim().toUpperCase().startsWith(pressedChar),
      );
      if (matched) {
        e.preventDefault();
        handleAnswer(matched);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    isSaving,
    justCompleted,
    inputType,
    textValue,
    optionsList,
    handleAnswer,
    handlePrev,
    handleSkip,
  ]);

  if (!isOpen) return null;

  const progressPct =
    totalRows > 0 ? Math.round((currentIndex / totalRows) * 100) : 0;

  // Clean, professional theme-adaptive styling for Light Mode and Dark Mode
  const getValueStyles = (val: string) => {
    const upper = val.trim().toUpperCase();
    if (
      upper === "P" ||
      upper === "PRESENT" ||
      upper === "TRUE" ||
      upper === "YES" ||
      upper === "PASS"
    ) {
      return {
        badge:
          "bg-emerald-100 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        bar: "bg-emerald-500 dark:bg-emerald-400",
        btn: "bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-900 border-emerald-200/90 hover:border-emerald-300 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-800/60 shadow-xs hover:shadow-sm",
        btnLetter: "text-emerald-700 dark:text-emerald-300",
        btnHint: "text-emerald-600/75 dark:text-emerald-400/75",
      };
    }
    if (
      upper === "A" ||
      upper === "ABSENT" ||
      upper === "FALSE" ||
      upper === "NO" ||
      upper === "FAIL"
    ) {
      return {
        badge:
          "bg-rose-100 text-rose-800 border-rose-300/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
        bar: "bg-rose-500 dark:bg-rose-400",
        btn: "bg-rose-50/70 hover:bg-rose-100/90 text-rose-900 border-rose-200/90 hover:border-rose-300 dark:bg-rose-950/25 dark:hover:bg-rose-950/45 dark:text-rose-300 dark:border-rose-800/60 shadow-xs hover:shadow-sm",
        btnLetter: "text-rose-700 dark:text-rose-300",
        btnHint: "text-rose-600/75 dark:text-rose-400/75",
      };
    }
    if (upper === "MAYBE" || upper === "PENDING") {
      return {
        badge:
          "bg-amber-100 text-amber-800 border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
        bar: "bg-amber-500 dark:bg-amber-400",
        btn: "bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 border-amber-200/90 hover:border-amber-300 dark:bg-amber-950/25 dark:hover:bg-amber-950/45 dark:text-amber-300 dark:border-amber-800/60 shadow-xs hover:shadow-sm",
        btnLetter: "text-amber-700 dark:text-amber-300",
        btnHint: "text-amber-600/75 dark:text-amber-400/75",
      };
    }
    return {
      badge: "bg-primary/10 text-primary border-primary/20",
      bar: "bg-primary",
      btn: "bg-muted/50 hover:bg-muted text-foreground border-border/80 hover:border-border shadow-xs",
      btnLetter: "text-foreground",
      btnHint: "text-muted-foreground",
    };
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 pb-12 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Theme-Adaptive Card Shell (Works in Light & Dark Mode) */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh] sm:max-h-[92vh] ring-1 ring-black/5 dark:ring-white/10">
        {/* Top Header */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-border/80 flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Sparkles className="size-3.5" />
            </div>
            <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap">
              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                Column:{" "}
                <span className="text-primary font-bold">{columnName}</span>
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] uppercase px-1.5 py-0 border-border bg-background text-muted-foreground font-mono shrink-0"
              >
                {inputType}
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate hidden xs:inline">
                • {file?.name || "Library File"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <HardDrive className="size-2.5" />
              <span>Auto-saved</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => {
                toast.info("Progress saved locally. You can resume anytime!");
                onClose();
              }}
              title="Close and pause (Saved locally)"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted/60 h-1 relative overflow-hidden shrink-0">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: `${progressPct}%` }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Subheader info: Row counter & keyboard shortcuts */}
        <div className="px-3.5 py-1 sm:px-4 sm:py-1.5 bg-muted/20 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-foreground font-semibold">
              #{currentIndex + 1}
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span>{totalRows}</span>
            <span className="text-[10px] text-muted-foreground/80">
              ({progressPct}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline font-mono">
              {inputType === "time"
                ? "Shortcuts: [Space] Timer • [C] Catch Time • [←] Back • [→] Skip"
                : inputType === "boolean"
                  ? "Shortcuts: [T/F] or [1/2] • [←] Back • [→] Skip"
                  : inputType === "rating"
                    ? "Shortcuts: [1] - [5] Stars • [←] Back • [→] Skip"
                    : inputType === "options"
                      ? `Shortcuts: [1-${Math.min(9, optionsList.length)}] or Letters • [←] Back • [→] Skip`
                      : "Shortcuts: [Enter] Submit • [←] Back • [→] Skip"}
            </span>
            <span className="text-[10px] text-muted-foreground sm:hidden font-mono">
              {inputType === "time"
                ? "[Space] Timer • [C] Catch"
                : "Quick Entry"}
            </span>
          </div>
        </div>

        {/* Slide Content Area - Single view without scrolling */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center min-h-0 relative overflow-hidden">
          {justCompleted || isSaving ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
              <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-base font-bold text-foreground">
                  All {totalRows} Entries Completed!
                </h4>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Database className="size-3 text-primary animate-pulse" />
                  Saving to database and clearing local cache...
                </p>
              </div>
              <Loader2 className="size-4 text-primary animate-spin mt-1" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{
                  x: slideDirection > 0 ? 25 : -25,
                  opacity: 0,
                  scale: 0.98,
                }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{
                  x: slideDirection > 0 ? -25 : 25,
                  opacity: 0,
                  scale: 0.98,
                }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="space-y-2.5"
              >
                {/* Main Slide Card: Compact Identity & Live Stats Bar */}
                <div className="p-2.5 sm:p-3 rounded-xl border border-border/80 bg-muted/30 shadow-2xs space-y-1.5">
                  {/* Clean Identity Display (Key ID + Name + Row badge) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <KeyRound className="size-2.5" />
                        {keyColumnName}:
                      </span>
                      <h2
                        className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono truncate"
                        title={currentKeyId}
                      >
                        {currentKeyId}
                      </h2>
                      {secondaryValue && (
                        <span className="text-xs sm:text-sm font-semibold text-foreground/85 truncate max-w-[160px] sm:max-w-[240px]">
                          ({secondaryValue})
                        </span>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] font-mono text-muted-foreground border-border bg-background shrink-0"
                    >
                      Row #{currentIndex + 1}
                    </Badge>
                  </div>

                  {/* Compact Live Session & Options Summary Row */}
                  <div className="pt-1 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-3 shrink-0" />
                        <span>
                          {liveSessionCounts.answered}/{totalRows} done
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({liveSessionCounts.answeredPct}%)
                        </span>
                      </span>

                      {/* Compact live counts for options (e.g. P: 0, A: 0, Pending: 10) */}
                      <div className="flex items-center gap-1 text-[10px]">
                        {liveSessionCounts.list.slice(0, 4).map((item) => {
                          const styles = getValueStyles(item.label);
                          return (
                            <span
                              key={item.label}
                              className="px-1.5 py-0.2 rounded border border-border/80 bg-background font-mono flex items-center gap-1"
                            >
                              <span className="font-bold text-foreground">
                                {item.label}:
                              </span>
                              <span className="text-muted-foreground font-medium">
                                {item.count}
                              </span>
                            </span>
                          );
                        })}
                        {liveSessionCounts.pending > 0 && (
                          <span className="px-1.5 py-0.2 rounded border border-border/80 bg-background/60 font-mono text-muted-foreground text-[10px]">
                            Pending: {liveSessionCounts.pending}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle to expand full graph bars if user desires */}
                    <button
                      type="button"
                      onClick={() => setShowGraphDetails(!showGraphDetails)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer font-medium hover:underline shrink-0"
                    >
                      <BarChart3 className="size-2.5 text-primary" />
                      <span>{showGraphDetails ? "Hide Chart" : "Chart ▾"}</span>
                    </button>
                  </div>

                  {/* Collapsible Full Graph Breakdown */}
                  {showGraphDetails && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5 animate-in fade-in duration-150">
                      <div className="p-0.5 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveGraphTab("row")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            activeGraphTab === "row"
                              ? "bg-card text-foreground font-semibold shadow-2xs border border-border/80"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <BarChart3 className="size-2.5 text-primary" />
                          <span>Record History</span>
                          {rowHistoryCounts.total > 0 && (
                            <span className="text-[9px] px-1 py-0 rounded-full bg-muted font-mono">
                              {rowHistoryCounts.total}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveGraphTab("session")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            activeGraphTab === "session"
                              ? "bg-card text-foreground font-semibold shadow-2xs border border-border/80"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <TrendingUp className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Live Session</span>
                          <span className="text-[9px] px-1 py-0 rounded-full bg-muted font-mono">
                            {liveSessionCounts.answered}/{totalRows}
                          </span>
                        </button>
                      </div>

                      {activeGraphTab === "row" ? (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {rowHistoryCounts.list.length === 0 ? (
                            <div className="py-1 text-center text-[10px] text-muted-foreground italic">
                              No previous entries recorded for this row
                            </div>
                          ) : (
                            rowHistoryCounts.list.map(([val, count]) => {
                              const pct =
                                rowHistoryCounts.total > 0
                                  ? Math.round(
                                      (count / rowHistoryCounts.total) * 100,
                                    )
                                  : 0;
                              const styles = getValueStyles(val);
                              return (
                                <div key={val} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-medium text-foreground">
                                      {val}
                                    </span>
                                    <span className="text-muted-foreground font-mono text-[9px]">
                                      {count} times • {pct}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${styles.bar}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {liveSessionCounts.list.map((item) => {
                            const styles = getValueStyles(item.label);
                            return (
                              <div key={item.label} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-medium text-foreground">
                                    {item.label}
                                  </span>
                                  <span className="text-muted-foreground font-mono text-[9px]">
                                    {item.count}/{totalRows} • {item.pct}%
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${styles.bar}`}
                                    style={{ width: `${item.pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tactile Option Buttons & Value Controls */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-foreground text-[11px] sm:text-xs">
                      Value for{" "}
                      <span className="text-primary font-bold">
                        {columnName}
                      </span>
                      :
                    </label>
                    {answers[currentIndex] !== undefined && (
                      <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3" />
                        Selected:{" "}
                        <strong className="font-bold">
                          {answers[currentIndex]}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* 1. Time / Stopwatch Input View */}
                  {inputType === "time" && (
                    <div className="space-y-2">
                      {/* Live Digital Stopwatch Card */}
                      <div className="p-2 sm:p-2.5 rounded-xl border border-border/90 bg-muted/40 shadow-2xs space-y-1.5">
                        {/* Stopwatch Top Bar: Label & Checkbox */}
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <Timer className="size-3 text-primary" />
                            <span>Stopwatch Timer</span>
                            {stopwatchRunning && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                                <span className="size-1 rounded-full bg-emerald-500 animate-ping" />
                                Active
                              </span>
                            )}
                          </div>

                          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={resetAfterCatch}
                              onChange={(e) =>
                                setResetAfterCatch(e.target.checked)
                              }
                              className="rounded accent-primary size-3"
                            />
                            <span>Reset on catch</span>
                          </label>
                        </div>

                        {/* Digital Timer Display & Primary Actions in One Responsive Row */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                          {/* Monospace Digital Timer Display */}
                          <div className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-foreground bg-background px-3 py-0.5 rounded-lg border border-border shadow-inner select-none">
                            {formatStopwatchDisplay(stopwatchMs)}
                          </div>

                          {/* Controls: Start/Pause, Reset, Catch */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setStopwatchRunning(!stopwatchRunning)
                              }
                              className={`h-7.5 px-3 font-semibold text-xs cursor-pointer shadow-xs gap-1 ${
                                stopwatchRunning
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {stopwatchRunning ? (
                                <>
                                  <Pause className="size-3" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="size-3 fill-current" />
                                  <span>Start</span>
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStopwatchRunning(false);
                                setStopwatchMs(0);
                              }}
                              className="h-7.5 px-2 text-xs border-border bg-background cursor-pointer"
                              title="Reset stopwatch to 00:00"
                            >
                              <RotateCcw className="size-3" />
                              <span className="hidden xs:inline">Reset</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleCatchStopwatchTime(true)}
                              className="h-7.5 px-3 bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-xs gap-1.5"
                            >
                              <Timer className="size-3" />
                              <span>Catch Time & Next</span>
                            </Button>
                          </div>
                        </div>

                        {/* Presets & Real Clock Time Row */}
                        <div className="flex items-center justify-between gap-1 text-[10px] w-full overflow-x-auto no-scrollbar pt-1 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => handleCatchCurrentClockTime(true)}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Clock className="size-3" />
                            <span>Real Time (Now)</span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
                            <span className="text-muted-foreground text-[10px]">
                              Presets:
                            </span>
                            {[
                              "09:00 AM",
                              "10:00 AM",
                              "12:00 PM",
                              "02:00 PM",
                              "05:00 PM",
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setTextValue(preset);
                                  handleAnswer(preset);
                                }}
                                className="px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted font-mono cursor-pointer shrink-0 text-foreground transition text-[10px]"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Manual Time Input (Optional inline fallback) */}
                      <div className="flex items-center gap-1.5">
                        <Input
                          ref={inputRef}
                          value={textValue}
                          onChange={(e) => setTextValue(e.target.value)}
                          placeholder="Or type manual time (e.g. 09:30 AM)..."
                          className="h-7.5 text-xs bg-background border-border flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            handleAnswer(
                              textValue || getCleanTimeValue(stopwatchMs),
                            )
                          }
                          className="h-7.5 px-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold cursor-pointer text-xs shrink-0"
                        >
                          <span>Save & Next</span>
                          <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 2. Boolean (True / False) View */}
                  {inputType === "boolean" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleAnswer("True")}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 active:scale-[0.98] ${
                          answers[currentIndex] === "True"
                            ? "ring-2 ring-emerald-500 font-bold"
                            : ""
                        }`}
                      >
                        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-base sm:text-lg font-bold tracking-tight">
                          True / Yes
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600/80">
                          [1] or [T]
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnswer("False")}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 active:scale-[0.98] ${
                          answers[currentIndex] === "False"
                            ? "ring-2 ring-rose-500 font-bold"
                            : ""
                        }`}
                      >
                        <X className="size-5 text-rose-600 dark:text-rose-400" />
                        <span className="text-base sm:text-lg font-bold tracking-tight">
                          False / No
                        </span>
                        <span className="text-[9px] font-mono text-rose-600/80">
                          [2] or [F]
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 3. Rating Control View (1 - 5 Stars) */}
                  {inputType === "rating" && (
                    <div className="p-2 sm:p-2.5 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const strStar = String(star);
                          const isSelected = answers[currentIndex] === strStar;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleAnswer(strStar)}
                              className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500 text-amber-500 ring-2 ring-amber-500/40 font-bold"
                                  : "bg-background border-border text-muted-foreground hover:text-amber-500 hover:border-amber-400 hover:bg-amber-500/5"
                              }`}
                            >
                              <Star
                                className={`size-5 sm:size-6 ${
                                  isSelected
                                    ? "fill-amber-500 text-amber-500"
                                    : "fill-none"
                                }`}
                              />
                              <span className="text-[11px] font-bold mt-0.5">
                                {star}★
                              </span>
                              <span className="text-[8px] font-mono opacity-70">
                                [{star}]
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Interactive Slider & Progress Bar View */}
                  {inputType === "slider" && (
                    <div className="space-y-2 p-2.5 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Percentage / Progress
                        </span>
                        <span className="text-xl font-extrabold font-mono text-primary">
                          {textValue || "50"}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={parseFloat(textValue || "50") || 50}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                      />

                      {/* Quick Presets */}
                      <div className="flex items-center justify-between gap-1">
                        {[0, 25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setTextValue(String(preset));
                              handleAnswer(String(preset));
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold border border-border bg-background hover:bg-muted font-mono cursor-pointer transition"
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>

                      <div className="pt-0.5 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAnswer(textValue || "50")}
                          className="h-7.5 px-3 bg-primary text-primary-foreground font-semibold text-xs cursor-pointer gap-1"
                        >
                          <span>Confirm & Next</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 5. Color Picker View */}
                  {inputType === "color" && (
                    <div className="space-y-2 p-2.5 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Select Swatch:
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {textValue || "#3b82f6"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          "#ef4444",
                          "#f97316",
                          "#f59e0b",
                          "#10b981",
                          "#06b6d4",
                          "#3b82f6",
                          "#8b5cf6",
                          "#ec4899",
                          "#64748b",
                        ].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setTextValue(hex);
                              handleAnswer(hex);
                            }}
                            style={{ backgroundColor: hex }}
                            className={`size-7 rounded-lg border transition-transform cursor-pointer hover:scale-110 ${
                              textValue === hex
                                ? "border-foreground scale-110 shadow-sm ring-2 ring-primary"
                                : "border-white/40"
                            }`}
                            title={hex}
                          />
                        ))}

                        <label className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-border bg-background cursor-pointer text-xs">
                          <input
                            type="color"
                            value={textValue || "#3b82f6"}
                            onChange={(e) => setTextValue(e.target.value)}
                            className="size-4.5 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <span className="text-[10px] font-mono">Custom</span>
                        </label>
                      </div>

                      <div className="pt-0.5 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAnswer(textValue || "#3b82f6")}
                          className="h-7.5 px-3 bg-primary text-primary-foreground font-semibold text-xs cursor-pointer gap-1"
                        >
                          <span>Confirm & Next</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 6. Options Input View */}
                  {inputType === "options" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {optionsList.map((option, idx) => {
                        const isCurrentSelection =
                          answers[currentIndex] === option;
                        const shortcutKey = option
                          .trim()
                          .charAt(0)
                          .toUpperCase();
                        const styles = getValueStyles(option);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAnswer(option)}
                            className={`p-2.5 sm:p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] ${styles.btn} ${
                              isCurrentSelection
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-card font-bold shadow-xs"
                                : ""
                            }`}
                          >
                            <span
                              className={`text-xl sm:text-2xl font-bold tracking-tight ${styles.btnLetter}`}
                            >
                              {option}
                            </span>
                            <span
                              className={`text-[9px] font-mono ${styles.btnHint}`}
                            >
                              [{shortcutKey}] or [{idx + 1}]
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 7. Text or Number Input View */}
                  {(inputType === "text" || inputType === "number") && (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        type={inputType === "number" ? "number" : "text"}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        placeholder={`Enter ${columnName}...`}
                        className="h-8.5 text-xs px-3 bg-background border-border flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAnswer(textValue)}
                        className="h-8.5 px-4 bg-primary text-primary-foreground font-semibold cursor-pointer text-xs shrink-0 gap-1"
                      >
                        <span>Save & Next</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* 8. Date Input View */}
                  {inputType === "date" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <CellDatePicker
                            value={textValue}
                            onChange={(val) => {
                              setTextValue(val);
                              if (val) {
                                handleAnswer(val);
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            handleAnswer(
                              textValue ||
                                new Date().toISOString().split("T")[0],
                            )
                          }
                          className="h-8.5 px-3 bg-primary text-primary-foreground font-semibold cursor-pointer text-xs shrink-0"
                        >
                          <span>Save & Next</span>
                          <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-muted-foreground font-medium">
                          Quick:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date()
                              .toISOString()
                              .split("T")[0];
                            setTextValue(today);
                            handleAnswer(today);
                          }}
                          className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted cursor-pointer transition text-foreground"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            const tom = d.toISOString().split("T")[0];
                            setTextValue(tom);
                            handleAnswer(tom);
                          }}
                          className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted cursor-pointer transition text-foreground"
                        >
                          Tomorrow
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            const yest = d.toISOString().split("T")[0];
                            setTextValue(yest);
                            handleAnswer(yest);
                          }}
                          className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted cursor-pointer transition text-foreground"
                        >
                          Yesterday
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 9. Image Input with CellImageUploader */}
                  {inputType === "image" && (
                    <div className="space-y-1.5">
                      <CellImageUploader
                        value={textValue}
                        onChange={(url) => {
                          setTextValue(url);
                          if (url) {
                            handleAnswer(url);
                          }
                        }}
                      />
                      {textValue && (
                        <div className="flex justify-end pt-0.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7.5 px-3.5 bg-primary text-primary-foreground font-semibold cursor-pointer text-xs gap-1"
                            onClick={() => handleAnswer(textValue)}
                          >
                            <span>Next Slide</span>
                            <ArrowRight className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 border-t border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0 || isSaving || justCompleted}
            className="cursor-pointer text-xs gap-1 h-7.5 sm:h-8 px-3 rounded-lg border-border bg-card hover:bg-muted ml-8 sm:ml-0"
          >
            <ChevronLeft className="size-3.5" />
            <span>Prev</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isSaving || justCompleted}
            className="cursor-pointer text-xs gap-1 text-muted-foreground hover:text-foreground h-7.5 sm:h-8 px-3 rounded-lg hover:bg-muted"
          >
            <SkipForward className="size-3" />
            <span>Skip</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
