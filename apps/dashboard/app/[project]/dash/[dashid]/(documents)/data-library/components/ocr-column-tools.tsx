"use client";

import React, { useState } from "react";
import {
  Tag,
  Calendar,
  CheckSquare,
  Square,
  Wand2,
  Replace,
  ArrowRight,
  Sparkles,
  Type,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";

interface OcrColumnToolsProps {
  columns: string[];
  spreadsheetCells: { value: string }[][];
  onUpdateColumns: (newCols: string[]) => void;
  onUpdateCells: (newCells: { value: string }[][]) => void;
}

export const OcrColumnTools: React.FC<OcrColumnToolsProps> = ({
  columns,
  spreadsheetCells,
  onUpdateColumns,
  onUpdateCells,
}) => {
  const [selectedColIndices, setSelectedColIndices] = useState<number[]>([]);
  const [prefixValue, setPrefixValue] = useState("");
  const [suffixValue, setSuffixValue] = useState("");
  const [findText, setFindText] = useState(".");
  const [replaceText, setReplaceText] = useState("A");

  // Toggle selection of a column
  const toggleCol = (idx: number) => {
    setSelectedColIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  // Select all columns
  const selectAll = () => {
    setSelectedColIndices(columns.map((_, i) => i));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedColIndices([]);
  };

  // Select columns that look like dates or numbers (e.g. "06", "13", "20", "03", "16")
  const selectDateLikeColumns = () => {
    const indices: number[] = [];
    columns.forEach((col, idx) => {
      const trimmed = col.trim();
      // If numeric (like 06, 13, 20), or has date keywords (aug, sept, jul, date)
      if (
        /^\d{1,2}$/.test(trimmed) ||
        /\b(aug|sep|jul|jun|oct|nov|dec|date|day)\b/i.test(trimmed)
      ) {
        indices.push(idx);
      }
    });
    setSelectedColIndices(indices);
    toast.info(`Selected ${indices.length} date/numeric columns`);
  };

  // Apply Prefix
  const applyPrefix = (prefixToApply?: string) => {
    const p = prefixToApply ?? prefixValue;
    if (!p) {
      toast.error("Please enter a prefix first");
      return;
    }
    if (selectedColIndices.length === 0) {
      toast.error("Please select at least one column");
      return;
    }

    const updated = columns.map((col, idx) => {
      if (selectedColIndices.includes(idx)) {
        return `${p}${col.trim()}`;
      }
      return col;
    });

    onUpdateColumns(updated);
    toast.success(`Applied prefix "${p}" to ${selectedColIndices.length} columns`);
  };

  // Apply Suffix
  const applySuffix = (suffixToApply?: string) => {
    const s = suffixToApply ?? suffixValue;
    if (!s) {
      toast.error("Please enter a suffix first");
      return;
    }
    if (selectedColIndices.length === 0) {
      toast.error("Please select at least one column");
      return;
    }

    const updated = columns.map((col, idx) => {
      if (selectedColIndices.includes(idx)) {
        return `${col.trim()}${s}`;
      }
      return col;
    });

    onUpdateColumns(updated);
    toast.success(`Applied suffix "${s}" to ${selectedColIndices.length} columns`);
  };

  // Quick action: Replace all "." with "A" in entire spreadsheet
  const handleQuickDotToA = () => {
    let replacedCount = 0;
    const updated = spreadsheetCells.map((row) =>
      row.map((cell) => {
        const val = cell?.value?.trim() ?? "";
        if (val === "." || val === "•" || val === "-" || val === "·") {
          replacedCount++;
          return { value: "A" };
        }
        return cell;
      }),
    );

    onUpdateCells(updated);
    toast.success(`Replaced ${replacedCount} dot/bullet cell(s) with 'A' (Absent)!`);
  };

  // Find & Replace in all cells
  const handleFindAndReplace = () => {
    if (!findText) {
      toast.error("Enter text to find");
      return;
    }
    let count = 0;
    const updated = spreadsheetCells.map((row) =>
      row.map((cell) => {
        const val = cell?.value ?? "";
        if (val === findText) {
          count++;
          return { value: replaceText };
        }
        return cell;
      }),
    );

    onUpdateCells(updated);
    toast.success(`Replaced ${count} instance(s) of "${findText}" with "${replaceText}"`);
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Column Header & Data Value Automation Tools
          </h4>
          <Badge
            variant="outline"
            className="text-[10px] font-semibold border-primary/30 text-primary"
          >
            Batch Actions
          </Badge>
        </div>

        {/* Quick Data Fixer Button: Dot to A */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleQuickDotToA}
          className="h-7 text-xs gap-1.5 cursor-pointer border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 font-semibold"
          title="Quickly replace all stray dots (.) and bullet marks with 'A' (Absent) across all attendance cells"
        >
          <Sparkles className="size-3 text-amber-600" />
          <span>Quick Fix: Convert '.' dots → 'A'</span>
        </Button>
      </div>

      {/* Column Selector Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <span className="font-semibold text-foreground">
            Select Columns to Modify ({selectedColIndices.length}/{columns.length} selected):
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={selectDateLikeColumns}
              className="text-[11px] text-primary hover:underline cursor-pointer font-medium flex items-center gap-1"
            >
              <CalendarDays className="size-3" /> Select Dates/Numbers
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
            >
              Select All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Column Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap max-h-28 overflow-y-auto">
          {columns.map((col, idx) => {
            const isSelected = selectedColIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleCol(idx)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition cursor-pointer border shadow-2xs ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="size-3" />
                ) : (
                  <Square className="size-3 text-muted-foreground/60" />
                )}
                <span>{col}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Prefix & Suffix Tool */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t text-xs">
        {/* Add Prefix */}
        <div className="space-y-2">
          <label className="font-semibold text-foreground block">
            Add Prefix to Selected Columns (e.g. "Aug ", "Jul ", "2026-"):
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              value={prefixValue}
              onChange={(e) => setPrefixValue(e.target.value)}
              placeholder="e.g. Aug "
              className="h-8 text-xs font-mono"
            />
            <Button
              size="sm"
              onClick={() => applyPrefix()}
              className="h-8 text-xs shrink-0 cursor-pointer font-medium"
            >
              Apply Prefix
            </Button>
          </div>
          {/* Quick Prefix Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Presets:</span>
            {["Aug ", "Jul ", "Sept ", "2026-", "Wk "].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPrefixValue(p);
                  applyPrefix(p);
                }}
                className="px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-foreground border cursor-pointer"
              >
                +{p}
              </button>
            ))}
          </div>
        </div>

        {/* Add Suffix */}
        <div className="space-y-2">
          <label className="font-semibold text-foreground block">
            Add Suffix to Selected Columns (e.g. " / Aug", " (P/A)"):
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              value={suffixValue}
              onChange={(e) => setSuffixValue(e.target.value)}
              placeholder="e.g. /Aug"
              className="h-8 text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => applySuffix()}
              className="h-8 text-xs shrink-0 cursor-pointer font-medium"
            >
              Apply Suffix
            </Button>
          </div>
          {/* Quick Suffix Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Presets:</span>
            {[" / Aug", " / Sept", " (P/A)", " / 2026"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSuffixValue(s);
                  applySuffix(s);
                }}
                className="px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-foreground border cursor-pointer"
              >
                +{s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Find and Replace Bar */}
      <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Replace className="size-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">Find & Replace in Spreadsheet:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Input
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find (e.g. .)"
            className="h-7 w-24 text-xs font-mono"
          />
          <ArrowRight className="size-3 text-muted-foreground" />
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace (e.g. A)"
            className="h-7 w-24 text-xs font-mono"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleFindAndReplace}
            className="h-7 text-xs cursor-pointer font-medium"
          >
            Replace All
          </Button>
        </div>
      </div>
    </div>
  );
};
