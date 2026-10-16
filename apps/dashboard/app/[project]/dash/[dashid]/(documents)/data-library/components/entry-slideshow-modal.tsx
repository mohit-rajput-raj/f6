"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import {
  saveStoredSlideshow,
  clearStoredSlideshow,
  serializeDataset,
} from "../lib/dataset-helpers";
import { updateDataLibraryFile } from "../actions";

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
  inputType: "options" | "text" | "number";
  optionsList: string[];
  keyColIndex: number;
  initialAnswers?: Record<number, string>;
  initialIndex?: number;
  userId: string;
  onCompleted: () => void;
}

export const EntrySlideshowModal: React.FC<EntrySlideshowModalProps> = ({
  isOpen,
  onClose,
  file,
  columns,
  rows,
  columnName,
  inputType,
  optionsList,
  keyColIndex,
  initialAnswers = {},
  initialIndex = 0,
  userId,
  onCompleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers);
  const [textValue, setTextValue] = useState("");
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState<"row" | "session">("row");

  const inputRef = useRef<HTMLInputElement>(null);

  const totalRows = rows.length;
  const currentRow = rows[currentIndex] || [];
  const keyColumnName = columns[keyColIndex] || "Key ID";
  const currentKeyId =
    currentRow[keyColIndex] !== undefined && currentRow[keyColIndex] !== ""
      ? String(currentRow[keyColIndex])
      : `Row #${currentIndex + 1}`;

  // Smart detect secondary identifier column (e.g. Student Name, Employee Name, Label)
  const secondaryColIndex = useMemo(() => {
    const nameKeywords = ["name", "student", "employee", "person", "title", "label", "user"];
    return columns.findIndex((col, idx) => {
      if (idx === keyColIndex) return false;
      const lower = col.toLowerCase().replace(/[^a-z]/g, "");
      return nameKeywords.some((kw) => lower.includes(kw));
    });
  }, [columns, keyColIndex]);

  const secondaryValue =
    secondaryColIndex !== -1 ? String(currentRow[secondaryColIndex] ?? "").trim() : "";

  // 1. Graph Tab 1: Counts of values for THIS current row across past columns
  // Filter out numeric metadata columns (e.g. Class No, Roll, Reg, Phone)
  const rowHistoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    const metadataKeywords = ["class", "roll", "reg", "phone", "email", "id", "code", "no.", "number"];

    columns.forEach((col, idx) => {
      if (idx === keyColIndex || idx === secondaryColIndex) return;

      const colLower = col.toLowerCase().trim();
      if (metadataKeywords.some((kw) => colLower === kw || colLower.startsWith(kw) || colLower.endsWith(kw))) {
        return;
      }

      const val = String(currentRow[idx] ?? "").trim();
      if (!val) return;

      // If optionsList is defined, only count values that match the options
      if (optionsList.length > 0) {
        const matched = optionsList.find(
          (opt) => opt.toLowerCase() === val.toLowerCase()
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

    const pendingPct = totalRows > 0 ? Math.round((pending / totalRows) * 100) : 0;

    return {
      list,
      answered,
      pending,
      pendingPct,
      total: totalRows,
    };
  }, [answers, totalRows, optionsList]);

  // Keep text field synced with existing answer if revisiting a row
  useEffect(() => {
    if (answers[currentIndex] !== undefined) {
      setTextValue(answers[currentIndex]);
    } else {
      setTextValue("");
    }
  }, [currentIndex, answers]);

  // Focus input automatically for text or number type
  useEffect(() => {
    if (isOpen && (inputType === "text" || inputType === "number")) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, currentIndex, inputType]);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setAnswers(initialAnswers);
      setJustCompleted(false);
      setIsSaving(false);
    }
  }, [isOpen, initialIndex, initialAnswers]);

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
    [file?.id, columnName, inputType, optionsList, keyColIndex, totalRows]
  );

  // Finalize and save to Database when the last key is completed
  const handleFinalSave = async (finalAnswers: Record<number, string>) => {
    if (!file?.id || !userId) return;
    setIsSaving(true);
    setJustCompleted(true);

    try {
      const updatedColumns = [...columns, columnName];

      const updatedRows = rows.map((row, idx) => {
        const rowVal = finalAnswers[idx] !== undefined ? finalAnswers[idx] : "";
        return [...row, rowVal];
      });

      const payload = serializeDataset(updatedColumns, updatedRows);

      await updateDataLibraryFile(file.id, userId, {
        data: payload,
        metadata: {
          ...(file.metadata || {}),
          rowCount: updatedRows.length,
          colCount: updatedColumns.length,
        },
      });

      clearStoredSlideshow(file.id);

      toast.success(
        `Column "${columnName}" successfully created and saved to database!`
      );

      onCompleted();

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to save slideshow dataset to DB:", err);
      toast.error("Failed to save changes to database. Your progress remains saved locally.");
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
    [answers, currentIndex, totalRows, persistToLocalStorage]
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
      if (inputType === "text" || inputType === "number") {
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

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= optionsList.length) {
        e.preventDefault();
        handleAnswer(optionsList[num - 1]);
        return;
      }

      const pressedChar = e.key.toUpperCase();
      const matched = optionsList.find(
        (opt) => opt.trim().toUpperCase() === pressedChar || opt.trim().toUpperCase().startsWith(pressedChar)
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

  const progressPct = totalRows > 0 ? Math.round(((currentIndex) / totalRows) * 100) : 0;

  // Clean, professional theme-adaptive styling for Light Mode and Dark Mode
  const getValueStyles = (val: string) => {
    const upper = val.trim().toUpperCase();
    if (upper === "P" || upper === "PRESENT" || upper === "TRUE" || upper === "YES" || upper === "PASS") {
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        bar: "bg-emerald-500 dark:bg-emerald-400",
        btn: "bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-900 border-emerald-200/90 hover:border-emerald-300 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-800/60 shadow-xs hover:shadow-sm",
        btnLetter: "text-emerald-700 dark:text-emerald-300",
        btnHint: "text-emerald-600/75 dark:text-emerald-400/75",
      };
    }
    if (upper === "A" || upper === "ABSENT" || upper === "FALSE" || upper === "NO" || upper === "FAIL") {
      return {
        badge: "bg-rose-100 text-rose-800 border-rose-300/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
        bar: "bg-rose-500 dark:bg-rose-400",
        btn: "bg-rose-50/70 hover:bg-rose-100/90 text-rose-900 border-rose-200/90 hover:border-rose-300 dark:bg-rose-950/25 dark:hover:bg-rose-950/45 dark:text-rose-300 dark:border-rose-800/60 shadow-xs hover:shadow-sm",
        btnLetter: "text-rose-700 dark:text-rose-300",
        btnHint: "text-rose-600/75 dark:text-rose-400/75",
      };
    }
    if (upper === "MAYBE" || upper === "PENDING") {
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Theme-Adaptive Card Shell (Works in Light & Dark Mode) */}
      <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[94vh] ring-1 ring-black/5 dark:ring-white/10">
        {/* Top Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/80 flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                  Column: <span className="text-primary font-bold">{columnName}</span>
                </h3>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase px-1.5 py-0 border-border bg-background text-muted-foreground font-mono"
                >
                  {inputType}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {file?.name || "Library File"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xs:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <HardDrive className="size-2.5" />
              <span>Auto-saved</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 sm:size-8 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
        <div className="w-full bg-muted/60 h-1 relative overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: `${progressPct}%` }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Subheader info: Row counter & keyboard shortcuts */}
        <div className="px-4 py-2 sm:px-5 sm:py-2 bg-muted/20 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-foreground font-semibold">#{currentIndex + 1}</span>
            <span className="text-muted-foreground/60">/</span>
            <span>{totalRows}</span>
            <span className="text-[10px] text-muted-foreground/80">({progressPct}%)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Shortcuts: [P/A] or [1/2] • [←] Back • [→] Skip
            </span>
          </div>
        </div>

        {/* Slide Content Area */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center min-h-[300px] relative overflow-y-auto">
          {justCompleted || isSaving ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="size-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="size-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-foreground">
                  All {totalRows} Entries Completed!
                </h4>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Database className="size-3 text-primary animate-pulse" />
                  Saving to database and clearing local cache...
                </p>
              </div>
              <Loader2 className="size-5 text-primary animate-spin mt-1" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{
                  x: slideDirection > 0 ? 30 : -30,
                  opacity: 0,
                  scale: 0.98,
                }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{
                  x: slideDirection > 0 ? -30 : 30,
                  opacity: 0,
                  scale: 0.98,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Main Slide Card */}
                <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border/80 bg-muted/30 shadow-xs space-y-3.5">
                  {/* Clean Identity Display (Key ID + Name) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                        <KeyRound className="size-3" />
                        <span>{keyColumnName}</span>
                      </div>
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <h2
                          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono"
                          title={currentKeyId}
                        >
                          {currentKeyId}
                        </h2>
                        {secondaryValue && (
                          <span className="text-sm sm:text-base font-semibold text-foreground/90 tracking-tight truncate max-w-[280px]">
                            {secondaryValue}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="px-2 py-0.5 text-[10px] font-mono text-muted-foreground border-border bg-background shrink-0"
                    >
                      Row #{currentIndex + 1}
                    </Badge>
                  </div>

                  {/* 2 Tabs of Graphs */}
                  <div className="pt-2 border-t border-border/60 space-y-2.5">
                    {/* Tab Switcher */}
                    <div className="p-1 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveGraphTab("row")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          activeGraphTab === "row"
                            ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BarChart3 className="size-3 text-primary" />
                        <span>Record History</span>
                        {rowHistoryCounts.total > 0 && (
                          <span className="text-[9px] px-1.5 py-0 rounded-full bg-muted font-mono border border-border/60">
                            {rowHistoryCounts.total}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveGraphTab("session")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          activeGraphTab === "session"
                            ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Live Session</span>
                        <span className="text-[9px] px-1.5 py-0 rounded-full bg-muted font-mono border border-border/60">
                          {liveSessionCounts.answered}/{totalRows}
                        </span>
                      </button>
                    </div>

                    {/* Tab 1: Row History Breakdown (Past columns for this row) */}
                    {activeGraphTab === "row" && (
                      <div className="space-y-2 pt-0.5">
                        {rowHistoryCounts.list.length === 0 ? (
                          <div className="py-3 text-center text-[11px] text-muted-foreground italic">
                            No previous column entries recorded for this row
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {rowHistoryCounts.list.map(([val, count]) => {
                              const pct =
                                rowHistoryCounts.total > 0
                                  ? Math.round((count / rowHistoryCounts.total) * 100)
                                  : 0;
                              const styles = getValueStyles(val);

                              return (
                                <div key={val} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <span
                                        className={`size-4.5 rounded flex items-center justify-center text-[10px] font-bold border ${styles.badge}`}
                                      >
                                        {val}
                                      </span>
                                      <span className="text-foreground">{val}</span>
                                    </span>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                      {count} times • {pct}%
                                    </span>
                                  </div>

                                  {/* Bar Track */}
                                  <div className="h-2 rounded-full bg-muted/80 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.35, ease: "easeOut" }}
                                      className={`h-full rounded-full ${styles.bar}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Live Session Progress Breakdown */}
                    {activeGraphTab === "session" && (
                      <div className="space-y-2 pt-0.5">
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {liveSessionCounts.list.map((item) => {
                            const styles = getValueStyles(item.label);

                            return (
                              <div key={item.label} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span
                                      className={`size-4.5 rounded flex items-center justify-center text-[10px] font-bold border ${styles.badge}`}
                                    >
                                      {item.label}
                                    </span>
                                    <span className="text-foreground">{item.label}</span>
                                  </span>
                                  <span className="text-muted-foreground font-mono text-[10px]">
                                    {item.count} / {totalRows} • {item.pct}%
                                  </span>
                                </div>

                                <div className="h-2 rounded-full bg-muted/80 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.pct}%` }}
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                    className={`h-full rounded-full ${styles.bar}`}
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* Pending bar */}
                          {liveSessionCounts.pending > 0 && (
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                  <span className="size-4.5 rounded flex items-center justify-center text-[10px] font-bold border border-border bg-muted text-muted-foreground">
                                    ⏳
                                  </span>
                                  <span>Pending</span>
                                </span>
                                <span className="text-muted-foreground/80 font-mono text-[10px]">
                                  {liveSessionCounts.pending} remaining • {liveSessionCounts.pendingPct}%
                                </span>
                              </div>

                              <div className="h-2 rounded-full bg-muted/80 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${liveSessionCounts.pendingPct}%` }}
                                  transition={{ duration: 0.35, ease: "easeOut" }}
                                  className="h-full rounded-full bg-muted-foreground/30"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tactile Option Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-foreground text-[11px] sm:text-xs">
                      Value for <span className="text-primary font-bold">{columnName}</span>:
                    </label>
                    {answers[currentIndex] !== undefined && (
                      <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3" />
                        Selected: <strong className="font-bold">{answers[currentIndex]}</strong>
                      </span>
                    )}
                  </div>

                  {/* Options Input View */}
                  {inputType === "options" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {optionsList.map((option, idx) => {
                        const isCurrentSelection = answers[currentIndex] === option;
                        const shortcutKey = option.trim().charAt(0).toUpperCase();
                        const styles = getValueStyles(option);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAnswer(option)}
                            className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] ${styles.btn} ${
                              isCurrentSelection
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-card font-bold shadow-md"
                                : ""
                            }`}
                          >
                            <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${styles.btnLetter}`}>
                              {option}
                            </span>
                            <span className={`text-[10px] font-mono ${styles.btnHint}`}>
                              [{shortcutKey}] or [{idx + 1}]
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text or Number Input View */}
                  {(inputType === "text" || inputType === "number") && (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        type={inputType === "number" ? "number" : "text"}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        placeholder={`Enter ${columnName}...`}
                        className="h-10 text-sm px-3.5 bg-background border-border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 px-4.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs gap-1.5 shrink-0 text-xs"
                        onClick={() => handleAnswer(textValue)}
                      >
                        <span>{currentIndex === totalRows - 1 ? "Finish" : "Next"}</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0 || isSaving || justCompleted}
            className="cursor-pointer text-xs gap-1 h-7.5 sm:h-8 px-3 rounded-lg border-border bg-card hover:bg-muted"
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
