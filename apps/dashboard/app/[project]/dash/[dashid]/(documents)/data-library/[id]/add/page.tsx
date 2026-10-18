"use client";

import React, { useState, useMemo } from "react";
import { useDataset } from "../dataset-context";
import {
  COLUMN_CATEGORIES,
  COLUMN_TOOLS,
  type ColumnCategory,
  type ColumnToolDefinition,
} from "../../lib/column-tools-catalog";
import {
  getCurrentDateColumnName,
  getIncrementedColumnName,
  getDecrementedColumnName,
  detectKeyColumnIndex,
  getStoredSlideshow,
  clearStoredSlideshow,
  SlideshowSession,
  getColumnType,
  type SlideshowInputType,
} from "../../lib/dataset-helpers";
import { CellDatePicker } from "../../components/cell-date-picker";
import { CellImageUploader } from "../../components/cell-image-uploader";
import { EntrySlideshowModal } from "../../components/entry-slideshow-modal";
import {
  Plus,
  Columns,
  Rows,
  Play,
  Search,
  ChevronDown,
  CheckCircle,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sliders,
  Sparkles,
  KeyRound,
  Info,
  Lock,
  Cpu,
  Layers,
  Table2,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  Timer,
  Star,
  Palette,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

export default function DatasetAddPage() {
  const {
    file,
    columns,
    rows,
    loading,
    isSaving,
    project,
    dashid,
    id,
    userId,
    activeIntegrationMode,
    setActiveIntegrationMode,
    addColumn,
    appendRow,
    refreshFile,
  } = useDataset();

  // Sub-tabs in Add workspace: "columns" | "row" | "slideshow"
  const [activeTab, setActiveTab] = useState<"columns" | "row" | "slideshow">(
    "columns",
  );

  // Column Catalog state
  const [selectedCategory, setSelectedCategory] = useState<
    ColumnCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<ColumnToolDefinition>(
    COLUMN_TOOLS[0],
  );

  // Column setup state
  const [columnName, setColumnName] = useState("");
  const [columnDefaultValue, setColumnDefaultValue] = useState("");
  const [customOptionsText, setCustomOptionsText] = useState(
    "Option 1, Option 2, Option 3",
  );
  const [selectedCurrency, setSelectedCurrency] = useState("₹");
  const [keyColIndex, setKeyColIndex] = useState(0);

  // Tab 3 Slideshow Launcher specific state
  const [slideshowLauncherType, setSlideshowLauncherType] =
    useState<SlideshowInputType>("options");
  const [isCreatingNewColumn, setIsCreatingNewColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Row setup state
  const [rowValues, setRowValues] = useState<Record<string, string>>({});
  const [isSubmittingRow, setIsSubmittingRow] = useState(false);

  // Slideshow modal state
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowConfig, setSlideshowConfig] = useState<{
    columnName: string;
    inputType: SlideshowInputType;
    columnType?: string;
    optionsList: string[];
    keyColIndex: number;
    initialAnswers?: Record<number, string>;
    initialIndex?: number;
  } | null>(null);

  // Key column detection
  const detectedKeyIndex = useMemo(
    () => detectKeyColumnIndex(columns),
    [columns],
  );

  // Initialize column name and keyColIndex when tool changes
  const handleSelectTool = (tool: ColumnToolDefinition) => {
    setSelectedTool(tool);
    setColumnName(tool.defaultColName);
    if (tool.defaultOptions && tool.defaultOptions.length > 0) {
      setCustomOptionsText(tool.defaultOptions.join(", "));
    }
    setKeyColIndex(detectedKeyIndex);
  };

  // Filter tools based on category & search query
  const filteredTools = useMemo(() => {
    return COLUMN_TOOLS.filter((tool) => {
      // If tool is automated, show only when category is automated
      if (tool.isAutomated && selectedCategory !== "automated") {
        return false;
      }
      if (selectedCategory !== "all" && tool.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const lastColumn = columns.length > 0 ? columns[columns.length - 1] : "";

  // Parse options for options-based tools
  const currentOptionsList = useMemo(() => {
    if (
      selectedTool.inputType !== "options" &&
      selectedTool.inputType !== "rating"
    ) {
      return [];
    }
    return customOptionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedTool, customOptionsText]);

  // Add column handler
  const handleAddColumnOnly = async () => {
    const trimmed = columnName.trim();
    if (!trimmed) {
      toast.error("Please enter a valid column name");
      return;
    }
    try {
      const toolType =
        selectedTool.id === "progress_bar"
          ? "progressbar"
          : selectedTool.inputType;
      await addColumn(trimmed, columnDefaultValue, toolType);
      setColumnDefaultValue("");
    } catch {
      // error handled in context
    }
  };

  // Add column and launch slideshow
  const handleAddColumnAndSlideshow = () => {
    const trimmed = columnName.trim();
    if (!trimmed) {
      toast.error("Please enter a valid column name");
      return;
    }
    if (rows.length === 0) {
      toast.error("Dataset has no rows to populate yet. Add rows first.");
      return;
    }

    try {
      const toolType =
        selectedTool.id === "progress_bar"
          ? "progressbar"
          : selectedTool.inputType;

      const isTimeTool =
        selectedTool.id === "time_only" ||
        selectedTool.id === "duration_hours_mins" ||
        selectedTool.id === "checkin_checkout" ||
        (selectedTool.category === "datetime" &&
          (selectedTool.name.toLowerCase().includes("time") ||
            selectedTool.name.toLowerCase().includes("duration")));

      let resolvedInputType: SlideshowInputType = "text";
      let resolvedOptions: string[] = [];

      if (isTimeTool) {
        resolvedInputType = "time";
      } else if (selectedTool.inputType === "options") {
        resolvedInputType = "options";
        resolvedOptions =
          currentOptionsList.length > 0 ? currentOptionsList : ["P", "A"];
      } else if (selectedTool.inputType === "boolean") {
        resolvedInputType = "boolean";
        resolvedOptions = ["True", "False"];
      } else if (selectedTool.inputType === "rating") {
        resolvedInputType = "rating";
        resolvedOptions = ["1", "2", "3", "4", "5"];
      } else if (
        selectedTool.inputType === "slider" ||
        selectedTool.id === "progress_bar" ||
        selectedTool.id === "percentage"
      ) {
        resolvedInputType = "slider";
      } else if (selectedTool.inputType === "color") {
        resolvedInputType = "color";
      } else if (selectedTool.inputType === "date") {
        resolvedInputType = "date";
      } else if (selectedTool.inputType === "image") {
        resolvedInputType = "image";
      } else if (selectedTool.inputType === "number") {
        resolvedInputType = "number";
      } else {
        resolvedInputType = "text";
      }

      setSlideshowConfig({
        columnName: trimmed,
        inputType: resolvedInputType,
        columnType: toolType,
        optionsList:
          resolvedOptions.length > 0
            ? resolvedOptions
            : currentOptionsList.length > 0
              ? currentOptionsList
              : ["P", "A"],
        keyColIndex:
          keyColIndex >= 0 && keyColIndex < columns.length ? keyColIndex : 0,
      });
      setIsSlideshowOpen(true);
    } catch {
      // error handled in context
    }
  };

  // Add Row handler
  const handleAppendRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (columns.length === 0) {
      toast.error("Dataset needs at least one column before adding rows.");
      return;
    }

    setIsSubmittingRow(true);
    try {
      const newRow = columns.map((col) => rowValues[col] ?? "");
      await appendRow(newRow);
      setRowValues({});
      toast.success("New row record added!");
    } finally {
      setIsSubmittingRow(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header & Operation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Add Data Workspace</span>
            <Badge
              variant="outline"
              className="text-[10px] font-normal border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
            >
              Manual Integration
            </Badge>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Add structured columns from 72 tools, append individual row records,
            or launch rapid batch slideshows.
          </p>
        </div>

        {/* Tab Selector: Columns / Row / Slideshow */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("columns")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              activeTab === "columns"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Columns className="size-3.5 text-primary" />
            <span>Add Column Tool</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("row")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              activeTab === "row"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Rows className="size-3.5 text-primary" />
            <span>Add Row Record</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("slideshow")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              activeTab === "slideshow"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Play className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Rapid Slideshow</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          TAB 1: ADD COLUMN (72 Tools Catalog + Configuration Panel)
      ============================================================ */}
      {activeTab === "columns" && (
        <div className="space-y-6">
          {/* Top Categories Filter & Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer shrink-0 transition-colors ${
                    selectedCategory === "all"
                      ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                      : "bg-background text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  All Tools (72)
                </button>

                {COLUMN_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isAutomatedCat = cat.id === "automated";
                  const isFilesCat = cat.id === "files";
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer shrink-0 transition-colors ${
                        isAutomatedCat
                          ? "opacity-60 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:opacity-100"
                          : isFilesCat
                            ? selectedCategory === cat.id
                              ? "bg-amber-500/15 border-amber-500/60 text-amber-600 dark:text-amber-400 font-semibold shadow-xs"
                              : "border-amber-500/30 text-amber-700 dark:text-amber-400/90 bg-amber-500/5 hover:bg-amber-500/10"
                            : selectedCategory === cat.id
                              ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                              : "bg-background text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <Icon className="size-3" />
                      <span>{cat.label}</span>
                      {isAutomatedCat && (
                        <Lock className="size-2.5 text-amber-500" />
                      )}
                      {isFilesCat && (
                        <span className="flex items-center gap-0.5 ml-0.5">
                          <Lock className="size-2.5 text-amber-500" />
                          <span className="text-[8px] font-extrabold px-1 py-0 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            PRO
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 72 column tools..."
                  className="pl-8 h-8 text-xs bg-background border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Main 2-Column Layout: Left = Tool Grid, Right = Configuration Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Tool Selection Grid (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span>
                  Showing {filteredTools.length} tool
                  {filteredTools.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[11px]">Click any tool to configure</span>
              </div>

              {/* Locked Category Banner for Files & Media */}
              {selectedCategory === "files" && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Lock className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Files &amp; Media is a Premium Feature
                        </h4>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          PRO PLAN
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 mt-0.5 line-clamp-1">
                        High-res image uploads, document attachments, and media
                        files are locked initially for Pro members.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  const isSelected = selectedTool.id === tool.id;
                  const isAuto = !!tool.isAutomated;
                  const isFilesTool = tool.category === "files";

                  return (
                    <div
                      key={tool.id}
                      onClick={() => !isAuto && handleSelectTool(tool)}
                      className={`relative p-3 rounded-xl border text-left transition-all ${
                        isAuto
                          ? "opacity-50 blur-[0.4px] border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 cursor-not-allowed select-none"
                          : isFilesTool
                            ? isSelected
                              ? "border-amber-500/60 bg-amber-500/10 dark:bg-amber-950/20 ring-1 ring-amber-500/40 shadow-xs cursor-pointer"
                              : "border-amber-500/25 bg-card hover:bg-amber-500/5 hover:border-amber-500/40 cursor-pointer shadow-2xs"
                            : isSelected
                              ? "border-primary/60 bg-zinc-50/90 dark:bg-zinc-900/80 ring-1 ring-primary/40 shadow-xs cursor-pointer"
                              : "border-zinc-200/80 dark:border-zinc-800/80 bg-card hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isFilesTool
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : isSelected
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>

                        <div className="flex items-center gap-1">
                          {isFilesTool && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-0.5"
                            >
                              <Lock className="size-2" />
                              <span>PRO</span>
                            </Badge>
                          )}
                          {tool.badge && !isFilesTool && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-4 font-normal ${
                                isAuto
                                  ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {tool.badge}
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="size-2.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate mb-0.5">
                        {tool.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tool Configuration Panel (5 cols on lg) */}
            <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 sm:p-5 shadow-xs space-y-4 sticky top-20">
              {/* Active Tool Header */}
              <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    {React.createElement(selectedTool.icon, {
                      className: "size-4.5",
                    })}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                      {selectedTool.categoryLabel}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedTool.name}
                    </h3>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase font-mono px-2 py-0.5 shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  {selectedTool.inputType}
                </Badge>
              </div>

              {/* 1. Column Name Input & Smart Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>Column Name</span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    Shown in table header
                  </span>
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setColumnName(getCurrentDateColumnName("iso"))
                    }
                    className="h-6 text-[10px] px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarIcon className="size-2.5 text-primary" />
                    <span>Today ({getCurrentDateColumnName("iso")})</span>
                  </button>

                  {lastColumn && (
                    <button
                      type="button"
                      onClick={() =>
                        setColumnName(getIncrementedColumnName(lastColumn))
                      }
                      className="h-6 text-[10px] px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                      title={`Next sequence after "${lastColumn}"`}
                    >
                      <TrendingUp className="size-2.5 text-emerald-500" />
                      <span>Next: {getIncrementedColumnName(lastColumn)}</span>
                    </button>
                  )}
                </div>

                <Input
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Enter column name..."
                  className="h-8.5 text-xs bg-background border-zinc-200 dark:border-zinc-800"
                />
              </div>

              {/* 2. Tool-Specific Parameters */}
              {/* A. Options Type (Selection, P/A, Status) */}
              {(selectedTool.inputType === "options" ||
                selectedTool.inputType === "rating") && (
                <div className="space-y-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>Choice Options</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      Comma-separated buttons
                    </span>
                  </label>

                  <Input
                    value={customOptionsText}
                    onChange={(e) => setCustomOptionsText(e.target.value)}
                    placeholder="e.g. Present, Absent or High, Medium, Low"
                    className="h-8 text-xs bg-background border-zinc-200 dark:border-zinc-800"
                  />

                  {/* Badges preview */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[10px] text-zinc-400 mr-1">
                      Preview buttons:
                    </span>
                    {currentOptionsList.map((opt, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[10px] font-medium px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                      >
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* B. Date Type: Preview with interactive Calendar */}
              {selectedTool.inputType === "date" && (
                <div className="space-y-1.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>Default Date Value (Optional)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      Calendar picker
                    </span>
                  </label>
                  <CellDatePicker
                    value={columnDefaultValue}
                    onChange={(val) => setColumnDefaultValue(val)}
                    placeholder="Click to pick calendar date..."
                  />
                  <p className="text-[10px] text-zinc-500">
                    If set, all existing rows will receive this date as default.
                  </p>
                </div>
              )}

              {/* C. Image / File Preview & Upload */}
              {selectedTool.inputType === "image" && (
                <div className="space-y-1.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Image Upload Support
                  </label>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-1.5">
                    Images uploaded via browser picker or camera will be stored
                    and their link saved directly in each cell.
                  </p>
                  <CellImageUploader
                    value={columnDefaultValue}
                    onChange={(val) => setColumnDefaultValue(val)}
                  />
                </div>
              )}

              {/* D. Number Currency Tool */}
              {selectedTool.id === "currency" && (
                <div className="space-y-1.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Currency Symbol
                  </label>
                  <div className="flex items-center gap-1.5">
                    {["₹", "$", "€", "£", "¥"].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setSelectedCurrency(sym)}
                        className={`size-8 rounded-md border text-xs font-semibold cursor-pointer transition ${
                          selectedCurrency === sym
                            ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                            : "bg-background text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Primary Key Label Column Selection (for slideshow) */}
              {columns.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>Key Identifier Column</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      Shown on rapid slides
                    </span>
                  </label>
                  <select
                    value={keyColIndex}
                    onChange={(e) => setKeyColIndex(Number(e.target.value))}
                    className="w-full h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
                  >
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Col {idx + 1}: {col || `(Column ${idx + 1})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                {selectedTool.category === "files" ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lock className="size-3 text-amber-600 dark:text-amber-400" />
                        <span>Premium Pro Feature</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400/90">
                        Files &amp; Media tools are locked initially for Pro
                        members. Upgrade your plan to attach images, files, and
                        documents directly.
                      </p>
                    </div>

                    <Button
                      type="button"
                      disabled
                      className="w-full h-8.5 text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold cursor-not-allowed justify-center gap-1.5 opacity-80"
                    >
                      <Lock className="size-3.5" />
                      <span>Files &amp; Media Locked (Pro Feature)</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={handleAddColumnOnly}
                      disabled={isSaving || !columnName.trim()}
                      className="w-full h-8.5 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold cursor-pointer justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Column to Dataset</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddColumnAndSlideshow}
                      disabled={
                        isSaving || !columnName.trim() || rows.length === 0
                      }
                      className="w-full h-8.5 text-xs border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer justify-center gap-1.5"
                    >
                      <Play className="size-3 text-primary" />
                      <span>Add Column & Launch Rapid Slideshow</span>
                      <ArrowRight className="size-3 text-zinc-400" />
                    </Button>
                  </>
                )}

                {rows.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
                    Note: Dataset currently has 0 rows. Use &quot;Add Row
                    Record&quot; to create rows first.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: ADD ROW RECORD (Form for appending a row)
      ============================================================ */}
      {activeTab === "row" && (
        <div className="max-w-2xl mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Rows className="size-4 text-primary" />
              <span>Append New Row Record</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Enter values for each column. Dates use an interactive calendar
              and media fields support direct image uploads.
            </p>
          </div>

          {columns.length === 0 ? (
            <div className="py-8 text-center space-y-2 text-zinc-500">
              <p className="text-xs">This dataset has no columns yet.</p>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab("columns")}
                className="text-xs h-7.5"
              >
                Add First Column
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAppendRow} className="space-y-4">
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {columns.map((col, idx) => {
                  const colType = getColumnType(
                    col,
                    idx,
                    file?.metadata?.columnTypes,
                    rows.map((r) => r[idx]),
                  );
                  const isDateField = colType === "date";
                  const isImageField = colType === "image";
                  const isAttendanceField = colType === "options";
                  const isProgressBarField = colType === "progressbar";

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <span className="size-4 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span>{col || `Column ${idx + 1}`}</span>
                        </label>
                        <span className="text-[10px] text-zinc-400">
                          {isProgressBarField
                            ? "Progress Bar (0-100%)"
                            : isDateField
                              ? "Calendar Date"
                              : isImageField
                                ? "Image Uploader"
                                : isAttendanceField
                                  ? "Attendance Status"
                                  : "Text"}
                        </span>
                      </div>

                      {/* Render Interactive Slider for Progress Bar columns */}
                      {isProgressBarField ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={parseFloat(rowValues[col] || "0") || 0}
                              onChange={(e) =>
                                setRowValues((prev) => ({
                                  ...prev,
                                  [col]: e.target.value,
                                }))
                              }
                              className="flex-1 accent-emerald-600"
                            />
                            <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 w-10 text-right">
                              {parseFloat(rowValues[col] || "0") || 0}%
                            </span>
                          </div>
                        </div>
                      ) : isDateField ? (
                        /* Render Calendar Picker for Date columns */
                        <CellDatePicker
                          value={rowValues[col] || ""}
                          onChange={(val) =>
                            setRowValues((prev) => ({ ...prev, [col]: val }))
                          }
                          placeholder={`Pick date for ${col}...`}
                        />
                      ) : isImageField ? (
                        /* Render Image Uploader for Media columns */
                        <CellImageUploader
                          value={rowValues[col] || ""}
                          onChange={(url) =>
                            setRowValues((prev) => ({ ...prev, [col]: url }))
                          }
                          placeholder={`Upload image for ${col}...`}
                        />
                      ) : isAttendanceField ? (
                        /* Render P/A quick radio buttons for attendance */
                        <div className="flex items-center gap-2">
                          {["P", "A", "L", "H"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setRowValues((prev) => ({
                                  ...prev,
                                  [col]: opt,
                                }))
                              }
                              className={`size-8 rounded-md border text-xs font-bold cursor-pointer transition ${
                                rowValues[col] === opt
                                  ? opt === "P"
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : opt === "A"
                                      ? "bg-rose-600 text-white border-rose-600"
                                      : "bg-primary text-white border-primary"
                                  : "border-zinc-200 dark:border-zinc-800 bg-background text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                          <Input
                            value={rowValues[col] || ""}
                            onChange={(e) =>
                              setRowValues((prev) => ({
                                ...prev,
                                [col]: e.target.value,
                              }))
                            }
                            placeholder="or custom..."
                            className="h-8 text-xs flex-1 bg-background"
                          />
                        </div>
                      ) : (
                        <Input
                          value={rowValues[col] || ""}
                          onChange={(e) =>
                            setRowValues((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                          placeholder={`Enter value for ${col}...`}
                          className="h-8 text-xs bg-background border-zinc-200 dark:border-zinc-800"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowValues({})}
                  className="text-xs h-8 text-zinc-500"
                >
                  Clear Form
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmittingRow}
                  className="h-8.5 px-4 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold cursor-pointer gap-1.5 shadow-2xs"
                >
                  {isSubmittingRow ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  <span>Append Row Record</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: RAPID SLIDESHOW LAUNCHER
      ============================================================ */}
      {activeTab === "slideshow" && (
        <div className="max-w-xl mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Play className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Rapid Entry Slideshow</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cycle sequentially through all {rows.length} rows with tactile
              single-key shortcuts, calendar pickers, and live progress charts.
            </p>
          </div>

          {columns.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              Add columns first to launch the slideshow.
            </p>
          ) : (
            <div className="space-y-3.5">
              {/* Select Target Column */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Columns className="size-3.5 text-primary" />
                    <span>Target Column to Populate</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCreatingNewColumn;
                      setIsCreatingNewColumn(next);
                      if (!next) {
                        setNewColumnName("");
                      }
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition"
                  >
                    {isCreatingNewColumn ? (
                      <>
                        <ChevronDown className="size-3" />
                        <span>Choose Existing</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        <span>+ New Column</span>
                      </>
                    )}
                  </button>
                </div>

                {isCreatingNewColumn ? (
                  <div className="space-y-1.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          autoFocus
                          value={newColumnName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewColumnName(val);
                            const lower = val.toLowerCase();
                            if (
                              lower.includes("time") ||
                              lower.includes("stopwatch") ||
                              lower.includes("duration")
                            ) {
                              setSlideshowLauncherType("time");
                            } else if (
                              lower.includes("date") ||
                              lower.includes("day")
                            ) {
                              setSlideshowLauncherType("date");
                            } else if (
                              lower.includes("rating") ||
                              lower.includes("star")
                            ) {
                              setSlideshowLauncherType("rating");
                            } else if (
                              lower.includes("pass") ||
                              lower.includes("attend") ||
                              lower.includes("status")
                            ) {
                              setSlideshowLauncherType("options");
                            }
                          }}
                          placeholder="Type new column name (e.g. Total Marks, Attendance, Time)..."
                          className="h-8.5 text-xs bg-background border-emerald-500/40 focus-visible:ring-emerald-500/30 pr-16"
                        />
                        <Badge
                          variant="outline"
                          className="absolute right-2 top-2 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                        >
                          New Column
                        </Badge>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCreatingNewColumn(false);
                          setNewColumnName("");
                        }}
                        className="h-8.5 text-xs text-muted-foreground px-2.5 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      A brand new column will be created and added to your
                      dataset as you cycle through the slideshow.
                    </p>
                  </div>
                ) : (
                  <select
                    value={columnName}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_COLUMN__") {
                        setIsCreatingNewColumn(true);
                        setNewColumnName("");
                        return;
                      }
                      const newCol = e.target.value;
                      setColumnName(newCol);
                      const colIdx = columns.indexOf(newCol);
                      if (colIdx !== -1) {
                        const detected = getColumnType(
                          newCol,
                          colIdx,
                          file?.metadata?.columnTypes,
                          rows.map((r) => r[colIdx]),
                        );
                        const lower = newCol.toLowerCase();
                        if (
                          lower.includes("time") ||
                          lower.includes("stopwatch") ||
                          lower.includes("duration")
                        ) {
                          setSlideshowLauncherType("time");
                        } else if (detected === "progressbar") {
                          setSlideshowLauncherType("slider");
                        } else if (detected === "date") {
                          setSlideshowLauncherType("date");
                        } else if (detected === "image") {
                          setSlideshowLauncherType("image");
                        } else if (detected === "rating") {
                          setSlideshowLauncherType("rating");
                        } else if (detected === "boolean") {
                          setSlideshowLauncherType("boolean");
                        } else if (detected === "options") {
                          setSlideshowLauncherType("options");
                        }
                      }
                    }}
                    className="w-full h-8.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
                  >
                    {columns.map((c, i) => (
                      <option key={i} value={c}>
                        {c || `Column ${i + 1}`}
                      </option>
                    ))}
                    <option
                      value="__NEW_COLUMN__"
                      className="text-emerald-600 font-bold"
                    >
                      ➕ + New Column (Create custom)...
                    </option>
                  </select>
                )}
              </div>

              {/* Select Input Type for this slideshow */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span>Input Control Type</span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    Adaptive rapid control
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    {
                      id: "options",
                      label: "P/A & Options",
                      icon: CheckCircle,
                    },
                    { id: "time", label: "Stopwatch / Time", icon: Timer },
                    { id: "date", label: "Calendar Date", icon: CalendarIcon },
                    { id: "boolean", label: "True / False", icon: Check },
                    { id: "rating", label: "5-Star Rating", icon: Star },
                    { id: "slider", label: "Progress Slider", icon: Sliders },
                    { id: "color", label: "Color Swatch", icon: Palette },
                    { id: "number", label: "# Number", icon: Sliders },
                    { id: "text", label: "Text Typing", icon: Columns },
                    { id: "image", label: "Image Upload", icon: Table2 },
                  ].map((t) => {
                    const TIcon = t.icon;
                    const isActive = slideshowLauncherType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSlideshowLauncherType(t.id as SlideshowInputType)
                        }
                        className={`p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                            : "border-zinc-200 dark:border-zinc-800 bg-background text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <TIcon className="size-3.5" />
                        <span className="text-[11px] truncate w-full">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If options: custom list */}
              {slideshowLauncherType === "options" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Buttons (Comma-separated)
                  </label>
                  <Input
                    value={customOptionsText}
                    onChange={(e) => setCustomOptionsText(e.target.value)}
                    placeholder="P, A, L, H or Yes, No"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              )}

              {/* Key identifier column */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Primary Label Column (Shown on each card)
                </label>
                <select
                  value={keyColIndex}
                  onChange={(e) => setKeyColIndex(Number(e.target.value))}
                  className="w-full h-8.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
                >
                  {columns.map((c, i) => (
                    <option key={i} value={i}>
                      {c || `Col ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                onClick={() => {
                  const targetCol = isCreatingNewColumn
                    ? newColumnName.trim()
                    : columnName.trim() || columns[0] || "New Column";

                  if (isCreatingNewColumn && !targetCol) {
                    toast.error("Please enter a name for the new column");
                    return;
                  }

                  setColumnName(targetCol);

                  let resolvedOptions: string[] = [];
                  if (slideshowLauncherType === "boolean") {
                    resolvedOptions = ["True", "False"];
                  } else if (slideshowLauncherType === "rating") {
                    resolvedOptions = ["1", "2", "3", "4", "5"];
                  } else if (slideshowLauncherType === "options") {
                    resolvedOptions =
                      currentOptionsList.length > 0
                        ? currentOptionsList
                        : ["P", "A"];
                  }

                  setSlideshowConfig({
                    columnName: targetCol,
                    inputType: slideshowLauncherType,
                    optionsList:
                      resolvedOptions.length > 0
                        ? resolvedOptions
                        : currentOptionsList.length > 0
                          ? currentOptionsList
                          : ["P", "A"],
                    keyColIndex:
                      keyColIndex >= 0 && keyColIndex < columns.length
                        ? keyColIndex
                        : 0,
                  });
                  setIsSlideshowOpen(true);
                }}
                disabled={rows.length === 0}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer gap-2 justify-center shadow-xs mt-2"
              >
                <Play className="size-3.5 fill-current" />
                <span>Launch Rapid Slideshow Session</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          LIVE DATASET PREVIEW TABLE (Recent rows for quick context)
      ============================================================ */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="size-3.5 text-zinc-500" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Live Dataset Preview
            </h4>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-zinc-300 dark:border-zinc-700 font-normal"
            >
              {rows.length} row{rows.length !== 1 ? "s" : ""} • {columns.length}{" "}
              col{columns.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Link
            href={`/${project}/dash/${dashid}/data-library/${id}/edit`}
            className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            <span>Open full editor</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {columns.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No columns yet. Pick any tool above to add your first column!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400 font-medium">
                  <th className="px-3 py-2 w-12 text-center text-[10px] text-zinc-400 font-mono">
                    #
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      {col || `Col ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-6 text-center text-xs text-zinc-400 italic"
                    >
                      No records in this dataset. Click "Add Row Record" above
                      to append data.
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, 6).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-mono text-[10px] text-zinc-400">
                        {rIdx + 1}
                      </td>
                      {columns.map((col, cIdx) => {
                        const cellVal = row[cIdx] ?? "";
                        const colType = getColumnType(
                          col,
                          cIdx,
                          file?.metadata?.columnTypes,
                          rows.map((r) => r[cIdx]),
                        );

                        const isImgCol = colType === "image";
                        const hasValidImgUrl =
                          typeof cellVal === "string" &&
                          cellVal.trim() !== "" &&
                          (isImgCol ||
                            ((cellVal.startsWith("http") ||
                              cellVal.startsWith("data:image/")) &&
                              /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(
                                cellVal,
                              )));

                        const isProgressBar = colType === "progressbar";

                        return (
                          <td
                            key={cIdx}
                            className="px-3 py-2 min-w-[120px] max-w-[240px]"
                          >
                            {hasValidImgUrl ? (
                              <img
                                src={cellVal}
                                alt="thumb"
                                className="size-6 rounded object-cover border border-zinc-200 dark:border-zinc-700"
                              />
                            ) : isImgCol ? (
                              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] italic flex items-center gap-1">
                                <span className="size-5 rounded border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 not-italic">
                                  🖼️
                                </span>
                                <span>No image</span>
                              </span>
                            ) : isProgressBar ? (
                              (() => {
                                const num = Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    parseFloat(
                                      String(cellVal).replace(/[^0-9.-]/g, ""),
                                    ) || 0,
                                  ),
                                );
                                return (
                                  <div className="flex items-center gap-2 w-full max-w-[150px]">
                                    <div className="flex-1 h-2 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${num}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 shrink-0 w-8 text-right">
                                      {num}%
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-zinc-800 dark:text-zinc-200 text-xs">
                                {cellVal !== "" ? String(cellVal) : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry Slideshow Modal Overlay */}
      {slideshowConfig && file && (
        <EntrySlideshowModal
          isOpen={isSlideshowOpen}
          onClose={() => setIsSlideshowOpen(false)}
          file={file}
          columns={columns}
          rows={rows}
          columnName={slideshowConfig.columnName}
          inputType={slideshowConfig.inputType}
          columnType={slideshowConfig.columnType}
          optionsList={slideshowConfig.optionsList}
          keyColIndex={slideshowConfig.keyColIndex}
          initialAnswers={slideshowConfig.initialAnswers}
          initialIndex={slideshowConfig.initialIndex}
          userId={userId || ""}
          onCompleted={() => {
            refreshFile();
            setIsSlideshowOpen(false);
            setSlideshowConfig(null);
            toast.success("Slideshow completed and dataset updated!");
          }}
        />
      )}
    </div>
  );
}
