"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Columns,
  Rows,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Type,
  ListFilter,
  Plus,
  Play,
} from "lucide-react";
import {
  getCurrentDateColumnName,
  getIncrementedColumnName,
  getDecrementedColumnName,
  detectKeyColumnIndex,
  getStoredSlideshow,
  clearStoredSlideshow,
  SlideshowSession,
} from "../lib/dataset-helpers";

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    data?: any;
    metadata?: any;
  } | null;
  columns: string[];
  rows: any[][];
  onAddRow: (newRow: string[]) => Promise<void>;
  onStartSlideshow: (config: {
    columnName: string;
    inputType: "options" | "text" | "number";
    optionsList: string[];
    keyColIndex: number;
    resumeSession?: SlideshowSession;
  }) => void;
}

type AddMode = "select" | "column" | "row";
type ColumnInputType = "options" | "text" | "number";

const PRESET_OPTIONS = [
  { id: "pa", label: "P / A", options: ["P", "A"], description: "Present / Absent" },
  { id: "truefalse", label: "True / False", options: ["True", "False"], description: "Boolean" },
  { id: "yesno", label: "Yes / No / Maybe", options: ["Yes", "No", "Maybe"], description: "Decisions" },
  { id: "passfail", label: "Pass / Fail", options: ["Pass", "Fail"], description: "Evaluation" },
  { id: "custom", label: "Custom", options: [], description: "Custom values" },
];

export const AddDataModal: React.FC<AddDataModalProps> = ({
  isOpen,
  onClose,
  file,
  columns,
  rows,
  onAddRow,
  onStartSlideshow,
}) => {
  const [mode, setMode] = useState<AddMode>("select");
  const [existingSession, setExistingSession] = useState<SlideshowSession | null>(null);

  // Column mode state
  const [columnName, setColumnName] = useState("");
  const [inputType, setInputType] = useState<ColumnInputType>("options");
  const [selectedPreset, setSelectedPreset] = useState("pa");
  const [customOptionsText, setCustomOptionsText] = useState("High, Medium, Low");
  const [keyColIndex, setKeyColIndex] = useState(0);

  // Row mode state
  const [newRowValues, setNewRowValues] = useState<Record<string, string>>({});
  const [isSubmittingRow, setIsSubmittingRow] = useState(false);

  // Check for in-progress local session when opening
  useEffect(() => {
    if (isOpen && file?.id) {
      const stored = getStoredSlideshow(file.id);
      setExistingSession(stored);

      // Auto-detect key column
      const detectedKey = detectKeyColumnIndex(columns);
      setKeyColIndex(detectedKey);

      // Suggest default column name as current date
      setColumnName(getCurrentDateColumnName("iso"));
      setMode("select");
    }
  }, [isOpen, file?.id, columns]);

  const lastColumn = useMemo(() => {
    return columns.length > 0 ? columns[columns.length - 1] : "";
  }, [columns]);

  const currentOptionsList = useMemo(() => {
    if (selectedPreset === "custom") {
      return customOptionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const found = PRESET_OPTIONS.find((p) => p.id === selectedPreset);
    return found ? found.options : ["P", "A"];
  }, [selectedPreset, customOptionsText]);

  const handleStartColumnEntry = () => {
    if (!columnName.trim()) return;

    onStartSlideshow({
      columnName: columnName.trim(),
      inputType,
      optionsList: inputType === "options" ? currentOptionsList : [],
      keyColIndex,
    });
    onClose();
  };

  const handleResumeStoredSession = () => {
    if (!existingSession) return;
    onStartSlideshow({
      columnName: existingSession.columnName,
      inputType: existingSession.inputType,
      optionsList: existingSession.optionsList,
      keyColIndex: existingSession.keyColIndex,
      resumeSession: existingSession,
    });
    onClose();
  };

  const handleDiscardStoredSession = () => {
    if (file?.id) {
      clearStoredSlideshow(file.id);
      setExistingSession(null);
    }
  };

  const handleSubmitRow = async () => {
    setIsSubmittingRow(true);
    try {
      const rowData = columns.map((col) => newRowValues[col] ?? "");
      await onAddRow(rowData);
      setNewRowValues({});
      onClose();
    } finally {
      setIsSubmittingRow(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] sm:max-w-[540px] max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-xl sm:rounded-2xl bg-card border shadow-2xl">
        {/* Header with safe padding for close X */}
        <DialogHeader className="pb-2.5 sm:pb-3 border-b pr-8 sm:pr-0 shrink-0">
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-foreground truncate">
            <Plus className="size-4 text-primary shrink-0" />
            <span className="truncate">Add to {file?.name || "Dataset"}</span>
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            {mode === "select"
              ? "Choose whether to add a column or a new row record"
              : mode === "column"
              ? "Configure column details and launch the rapid entry slideshow"
              : "Enter row values to append a record to this dataset"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-1">
          {/* In-progress saved session alert */}
          {existingSession && (
            <div className="p-3 rounded-lg sm:rounded-xl border border-primary/30 bg-primary/5 flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2 min-w-0">
                <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    Saved Session in Local Storage
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <strong>{existingSession.columnName}</strong>:{" "}
                    {Object.keys(existingSession.answers || {}).length} of{" "}
                    {existingSession.totalRows} completed.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6.5 text-[10px] px-2 cursor-pointer"
                  onClick={handleDiscardStoredSession}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="h-6.5 text-[10px] px-2.5 bg-primary text-primary-foreground cursor-pointer flex items-center gap-1"
                  onClick={handleResumeStoredSession}
                >
                  <Play className="size-2.5" />
                  Resume
                </Button>
              </div>
            </div>
          )}

          {/* Mode Selector Screen */}
          {mode === "select" && (
            <div className="py-2 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Add Column Option */}
                <button
                  type="button"
                  onClick={() => setMode("column")}
                  className="p-3.5 sm:p-4 rounded-xl border-2 border-border/80 hover:border-primary/80 hover:bg-primary/5 transition-all flex flex-col items-center text-center group cursor-pointer"
                >
                  <div className="size-10 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Columns className="size-5 sm:size-6" />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1">
                    Add Column
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2">
                    Date, attendance, score or tags with rapid slideshow input
                  </p>
                  <Badge variant="outline" className="mt-2.5 text-[9px] sm:text-[10px] bg-background">
                    Interactive Slideshow
                  </Badge>
                </button>

                {/* Add Row Option */}
                <button
                  type="button"
                  onClick={() => setMode("row")}
                  className="p-3.5 sm:p-4 rounded-xl border-2 border-border/80 hover:border-primary/80 hover:bg-primary/5 transition-all flex flex-col items-center text-center group cursor-pointer"
                >
                  <div className="size-10 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Rows className="size-5 sm:size-6" />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1">
                    Add Row
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2">
                    Append a new student or entry for all existing columns
                  </p>
                  <Badge variant="outline" className="mt-2.5 text-[9px] sm:text-[10px] bg-background">
                    Direct Form Entry
                  </Badge>
                </button>
              </div>
            </div>
          )}

          {/* Mode: Column Setup */}
          {mode === "column" && (
            <div className="space-y-4 py-1">
              {/* 1. Column Name with smart presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Column Name</span>
                  <span className="text-[10px] text-muted-foreground">
                    Preset or custom
                  </span>
                </label>

                {/* Quick suggestion presets */}
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setColumnName(getCurrentDateColumnName("iso"))}
                    className="h-6 text-[10px] px-2 py-0 cursor-pointer gap-1"
                  >
                    <Calendar className="size-2.5 text-primary" />
                    Today ({getCurrentDateColumnName("iso")})
                  </Button>

                  {lastColumn && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setColumnName(getIncrementedColumnName(lastColumn))}
                        className="h-6 text-[10px] px-2 py-0 cursor-pointer gap-1"
                        title={`Increment from "${lastColumn}"`}
                      >
                        <TrendingUp className="size-2.5 text-emerald-500" />
                        Next (+1): {getIncrementedColumnName(lastColumn)}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setColumnName(getDecrementedColumnName(lastColumn))}
                        className="h-6 text-[10px] px-2 py-0 cursor-pointer gap-1"
                        title={`Decrement from "${lastColumn}"`}
                      >
                        <TrendingDown className="size-2.5 text-amber-500" />
                        Prev (-1): {getDecrementedColumnName(lastColumn)}
                      </Button>
                    </>
                  )}
                </div>

                <Input
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g. 2026-10-16, Attendance, Score, Status"
                  className="h-8.5 text-xs sm:text-sm bg-background"
                  autoFocus
                />
              </div>

              {/* 2. Column Input Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Column Input Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setInputType("options")}
                    className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer transition flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 ${
                      inputType === "options"
                        ? "border-primary bg-primary/10 text-foreground font-medium shadow-xs"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <ListFilter className="size-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Options Type</div>
                      <div className="text-[10px] text-muted-foreground">
                        P/A, Yes/No, or custom buttons
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputType("text")}
                    className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer transition flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 ${
                      inputType === "text"
                        ? "border-primary bg-primary/10 text-foreground font-medium shadow-xs"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Type className="size-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Text Input</div>
                      <div className="text-[10px] text-muted-foreground">
                        Free text typing per entry
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputType("number")}
                    className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer transition flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 ${
                      inputType === "number"
                        ? "border-primary bg-primary/10 text-foreground font-medium shadow-xs"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <TrendingUp className="size-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Number Input</div>
                      <div className="text-[10px] text-muted-foreground">
                        Numeric scores or counts
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. If Options Type: Choose or customize options */}
              {inputType === "options" && (
                <div className="space-y-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-muted/20">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Choice Options</span>
                    <span className="text-[10px] text-muted-foreground">
                      Buttons for each slide
                    </span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PRESET_OPTIONS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`px-2 py-1.5 rounded-md sm:rounded-lg border text-left cursor-pointer transition text-xs ${
                          selectedPreset === preset.id
                            ? "border-primary bg-background shadow-xs text-foreground font-semibold"
                            : "border-border/60 bg-card hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div className="font-semibold text-xs">{preset.label}</div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {preset.options.length > 0
                            ? preset.options.join(" • ")
                            : "Custom"}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedPreset === "custom" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] text-muted-foreground">
                        Comma-separated values:
                      </label>
                      <Input
                        value={customOptionsText}
                        onChange={(e) => setCustomOptionsText(e.target.value)}
                        placeholder="e.g. Low, Medium, High"
                        className="h-7.5 text-xs bg-background"
                      />
                    </div>
                  )}

                  {/* Preview of buttons */}
                  <div className="pt-0.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground mr-1">Preview:</span>
                    {currentOptionsList.map((opt, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="px-1.5 py-0.5 text-[10px] font-semibold border"
                      >
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Select Key ID Column */}
              {columns.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Primary Key / Label Column</span>
                    <span className="text-[10px] text-muted-foreground">
                      Shown on each slide
                    </span>
                  </label>
                  <select
                    value={keyColIndex}
                    onChange={(e) => setKeyColIndex(Number(e.target.value))}
                    className="w-full h-8 sm:h-8.5 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Col {idx + 1}: {col || `(Col ${idx + 1})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                    Using <strong>{columns[keyColIndex] || "Column 1"}</strong> as primary label.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mode: Row Input */}
          {mode === "row" && (
            <div className="space-y-3 py-1">
              <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {columns.map((col, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <label className="text-[11px] font-medium text-foreground">
                      {col || `Column ${idx + 1}`}
                    </label>
                    <Input
                      value={newRowValues[col] || ""}
                      onChange={(e) =>
                        setNewRowValues((prev) => ({
                          ...prev,
                          [col]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${col || "value"}...`}
                      className="h-7.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions - ALWAYS VISIBLE */}
        <div className="shrink-0 pt-2.5 sm:pt-3 border-t bg-card flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (mode === "select" ? onClose() : setMode("select"))}
            className="cursor-pointer text-xs h-7.5 sm:h-8"
          >
            {mode === "select" ? "Cancel" : "Back"}
          </Button>

          {mode === "column" && (
            <Button
              type="button"
              size="sm"
              disabled={!columnName.trim() || rows.length === 0}
              onClick={handleStartColumnEntry}
              className="cursor-pointer bg-primary text-primary-foreground text-xs gap-1.5 h-7.5 sm:h-8 shadow-xs"
            >
              <span>Done & Start Slideshow</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}

          {mode === "row" && (
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingRow}
              onClick={handleSubmitRow}
              className="cursor-pointer bg-primary text-primary-foreground text-xs gap-1.5 h-7.5 sm:h-8 shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>{isSubmittingRow ? "Adding Row..." : "Append Row"}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
