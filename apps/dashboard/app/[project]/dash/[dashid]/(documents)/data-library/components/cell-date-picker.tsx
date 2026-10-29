"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@repo/ui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/ui/popover";
import { Button } from "@repo/ui/components/ui/button";

function parseDateString(val?: string): Date | undefined {
  if (!val || !val.trim()) return undefined;
  const trimmed = val.trim();
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // ISO: YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    } else {
      // Indian: DD-MM-YYYY
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const fallback = new Date(trimmed);
  return !isNaN(fallback.getTime()) ? fallback : undefined;
}

function formatDateString(date: Date, format: "indian" | "iso" = "indian"): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (format === "indian") {
    return `${d}-${m}-${y}`;
  }
  return `${y}-${m}-${d}`;
}

interface CellDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  compact?: boolean;
  format?: "indian" | "iso";
}

export const CellDatePicker: React.FC<CellDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Pick a date...",
  compact = false,
  format = "indian",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const parsedDate = parseDateString(value);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange("");
    } else {
      onChange(formatDateString(selectedDate, format));
    }
    setIsOpen(false);
  };

  const setRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    onChange(formatDateString(d, format));
    setIsOpen(false);
  };

  const displayText = parsedDate ? formatDateString(parsedDate, format) : value || placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative flex items-center w-full">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start text-left font-normal border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 ${
              compact ? "h-7 text-xs px-2" : "h-8 text-xs px-2.5"
            } ${!value ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}
          >
            <CalendarIcon className="size-3.5 mr-2 text-zinc-500 shrink-0" />
            <span className="truncate">{displayText}</span>
          </Button>
        </PopoverTrigger>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute right-2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            title="Clear date"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <PopoverContent className="w-auto p-0 border-zinc-200 dark:border-zinc-800 shadow-xl" align="start">
        {/* Quick select presets */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRelativeDate(-1)}
            className="h-6 text-[10px] px-2 py-0 text-zinc-600 dark:text-zinc-400"
          >
            Yesterday
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRelativeDate(0)}
            className="h-6 text-[10px] px-2 py-0 font-semibold text-primary"
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRelativeDate(1)}
            className="h-6 text-[10px] px-2 py-0 text-zinc-600 dark:text-zinc-400"
          >
            Tomorrow
          </Button>
        </div>

        {/* Interactive Calendar widget */}
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          initialFocus
          className="p-2.5"
        />
      </PopoverContent>
    </Popover>
  );
};
