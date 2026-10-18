"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
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
  FileSpreadsheet,
  Save,
  Loader2,
  Sparkles,
  RotateCcw,
  LayoutTemplate,
  ChevronDown,
  KeyRound,
  Info,
  Maximize2,
  Minimize2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/ui/popover";
import { Label } from "@repo/ui/components/ui/label";

const SpreadsheetComponent = dynamic(
  () =>
    import("@syncfusion/ej2-react-spreadsheet").then(
      (m) => m.SpreadsheetComponent,
    ),
  { ssr: false },
);

interface SyncfusionSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    columns: string[];
    data: any[][];
  }) => Promise<void>;
}

// Built-in starter templates matching user workflows & screenshot 2
const TEMPLATES: Record<
  string,
  {
    name: string;
    columns: string[];
    sampleKeys: string[];
    description: string;
  }
> = {
  default: {
    name: "Standard Dataset",
    columns: ["ID", "Name", "Category", "Status", "Date"],
    sampleKeys: ["EMP001", "EMP002", "EMP003", "EMP004", "EMP005"],
    description: "Matches Screenshot 2 with ID, Name, Category, Status, Date",
  },
  attendance: {
    name: "Attendance Roster",
    columns: ["Roll_No", "Student_Name", "Status", "Date", "Remarks"],
    sampleKeys: ["STU-101", "STU-102", "STU-103", "STU-104", "STU-105"],
    description: "Classroom or employee attendance tracker",
  },
  collegeAttendance: {
    name: "Attendance Roster",
    columns: ["Enrollment", "Name"],
    sampleKeys: [],
    description: "Classroom or employee attendance tracker",
  },
  numbered: {
    name: "Numeric Key Sequence",
    columns: ["Key", "Title", "Type", "Priority", "Assigned_To"],
    sampleKeys: ["1", "2", "3", "4", "5"],
    description: "Sequential numerical keys ready for drag-autofill",
  },
  blank: {
    name: "Blank Grid",
    columns: [],
    sampleKeys: [],
    description: "Fresh blank table ready for custom headers",
  },
};

function generateInitialSheet(templateKey: string) {
  const tpl = TEMPLATES[templateKey] || TEMPLATES.default;

  const headerCells = tpl.columns.map((col) => ({
    value: col,
    style: {
      fontWeight: "bold",
      backgroundColor: "#f1f5f9",
      color: "#0f172a",
      textAlign: "center" as const,
    },
  }));

  const rows = [
    { cells: headerCells },
    ...tpl.sampleKeys.map((key) => ({
      cells: [
        { value: key },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
      ],
    })),
  ];

  return [
    {
      name: "Sheet1",
      showGridLines: true,
      selectedRange: "A2:A2",
      columns: [
        { width: 110 },
        { width: 140 },
        { width: 130 },
        { width: 110 },
        { width: 120 },
      ],
      rows,
    },
  ];
}

export function SyncfusionSheetModal({
  isOpen,
  onClose,
  onSave,
}: SyncfusionSheetModalProps) {
  const [datasetName, setDatasetName] = useState(() => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `Custom_Dataset_${dateStr}.xlsx`;
  });

  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [showRibbon, setShowRibbon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [spreadsheetKey, setSpreadsheetKey] = useState(1);
  const [isKeyGenOpen, setIsKeyGenOpen] = useState(false);

  // Quick key sequence generator states
  const [keyPrefix, setKeyPrefix] = useState("EMP");
  const [keyPadDigits, setKeyPadDigits] = useState(3);
  const [keyStart, setKeyStart] = useState(1);
  const [keyCount, setKeyCount] = useState(10);

  const spreadsheetRef = useRef<any>(null);
  const ssInstanceRef = useRef<any>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Reset name when reopened
  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setDatasetName(`Custom_Dataset_${dateStr}.xlsx`);
    }
  }, [isOpen]);

  const onCreated = () => {
    const raw = spreadsheetRef.current;
    const ss = raw?.ej2Instances?.[0] || raw;
    if (ss) {
      ssInstanceRef.current = ss;
    }
  };

  const getSs = () => {
    const raw = ssInstanceRef.current || spreadsheetRef.current;
    if (!raw) return null;
    return raw?.ej2Instances?.[0] || raw;
  };

  // Helper to extract rows from Syncfusion
  const extractGrid = useCallback((): { columns: string[]; data: any[][] } => {
    const ss = getSs();
    if (!ss) return { columns: [], data: [] };

    try {
      const activeSheet =
        (typeof ss.getActiveSheet === "function"
          ? ss.getActiveSheet()
          : null) ||
        (Array.isArray(ss.sheets) ? ss.sheets[ss.activeSheetIndex || 0] : null);

      const rows = activeSheet?.rows || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        return { columns: [], data: [] };
      }

      const rawGrid: string[][] = [];
      let maxCols = 0;

      rows.forEach((r: any) => {
        const rowCells: string[] = [];
        const cells = r?.cells;
        if (cells) {
          const cellList = Array.isArray(cells) ? cells : Object.values(cells);
          cellList.forEach((c: any, cIdx: number) => {
            const val =
              c?.value !== undefined && c?.value !== null
                ? String(c.value)
                : c?.formula
                  ? String(c.formula)
                  : "";
            rowCells[cIdx] = val;
          });
        }
        maxCols = Math.max(maxCols, rowCells.length);
        rawGrid.push(rowCells);
      });

      // Fill ragged rows
      rawGrid.forEach((row) => {
        while (row.length < maxCols) row.push("");
      });

      // Trim trailing blank rows
      while (rawGrid.length > 1) {
        const lastRow = rawGrid[rawGrid.length - 1];
        const isBlank = lastRow.every((val) => !val || val.trim() === "");
        if (isBlank) {
          rawGrid.pop();
        } else {
          break;
        }
      }

      if (rawGrid.length === 0) return { columns: [], data: [] };

      const headerRow = rawGrid[0] || [];

      // Trim trailing blank columns
      let colCount = headerRow.length;
      while (colCount > 1) {
        const colIdx = colCount - 1;
        const isHeaderEmpty =
          !headerRow[colIdx] || headerRow[colIdx].trim() === "";
        const isDataEmpty = rawGrid
          .slice(1)
          .every((r) => !r[colIdx] || r[colIdx].trim() === "");
        if (isHeaderEmpty && isDataEmpty) {
          colCount--;
        } else {
          break;
        }
      }

      const columns = Array.from({ length: colCount }).map((_, i) => {
        const h = headerRow[i];
        return h && h.trim() !== "" ? h.trim() : `Column_${i + 1}`;
      });

      const data = rawGrid
        .slice(1)
        .map((row) =>
          Array.from({ length: colCount }).map((_, i) => row[i] ?? ""),
        );

      return { columns, data };
    } catch (err) {
      console.warn("Failed to extract grid:", err);
      return { columns: [], data: [] };
    }
  }, []);

  // Handle template switch
  const handleSelectTemplate = (tplKey: string) => {
    setSelectedTemplate(tplKey);
    setSpreadsheetKey((prev) => prev + 1);
    toast.info(`Loaded ${TEMPLATES[tplKey]?.name || "template"}`);
  };

  // Programmatic Key Autofill helper for Column A
  const handleApplyKeyAutofill = () => {
    const ss = getSs();
    if (!ss) {
      toast.error("Spreadsheet is not ready yet");
      return;
    }

    try {
      let appliedCount = 0;
      for (let i = 0; i < keyCount; i++) {
        const num = keyStart + i;
        const formattedNum =
          keyPadDigits > 0
            ? String(num).padStart(keyPadDigits, "0")
            : String(num);
        const keyValue = keyPrefix
          ? `${keyPrefix}${formattedNum}`
          : formattedNum;

        // Row index in Excel (Row 1 is headers, Row 2 is index 1 -> A2, A3, etc.)
        const rowIndex = i + 2;
        const cellAddr = `A${rowIndex}`;

        if (typeof ss.updateCell === "function") {
          ss.updateCell({ value: keyValue }, cellAddr);
          appliedCount++;
        }
      }

      toast.success(
        `Generated ${appliedCount} keys in Column A (${keyPrefix}${String(keyStart).padStart(keyPadDigits, "0")} → ...)`,
      );
      setIsKeyGenOpen(false);
    } catch (err) {
      console.error("Auto-fill keys error:", err);
      toast.error("Failed to generate keys");
    }
  };

  // Save to Data Library
  const handleSave = async () => {
    const cleanedName = datasetName.trim();
    if (!cleanedName) {
      toast.error("Please enter a valid file name");
      return;
    }

    setIsSaving(true);
    try {
      const extracted = extractGrid();

      if (extracted.columns.length === 0) {
        toast.error(
          "The spreadsheet is empty. Please enter some headers or data.",
        );
        setIsSaving(false);
        return;
      }

      await onSave({
        name: cleanedName.endsWith(".xlsx")
          ? cleanedName
          : `${cleanedName}.xlsx`,
        columns: extracted.columns,
        data: extracted.data,
      });

      toast.success(`Dataset "${cleanedName}" saved successfully!`);
      onClose();
    } catch (err) {
      console.error("Save spreadsheet error:", err);
      toast.error("Failed to save dataset");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={dialogContentRef}
        showCloseButton={false}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          // Prevent closing if click is inside dialog content, sheet grid, or any dropdown/popover menu
          if (
            dialogContentRef.current?.contains(target) ||
            target.closest?.(
              "[data-slot='dialog-content'], .e-spreadsheet, .e-control, .e-sheet, .e-ribbon, .e-scroller, [data-slot='dropdown-menu-content'], [data-slot='popover-content']",
            )
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (
            dialogContentRef.current?.contains(target) ||
            target.closest?.(
              "[data-slot='dialog-content'], .e-spreadsheet, .e-control, .e-sheet, .e-ribbon, .e-scroller, [data-slot='dropdown-menu-content'], [data-slot='popover-content']",
            )
          ) {
            e.preventDefault();
          }
        }}
        className={`w-[98vw] max-w-[98vw] ${
          isExpanded
            ? "sm:w-[94vw] sm:max-w-[94vw]"
            : "sm:w-[70vw] sm:max-w-[70vw]"
        } h-[96vh] sm:h-[88vh] max-h-[96vh] sm:max-h-[920px] p-0 flex flex-col bg-card border border-border shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Customize with Syncfusion Spreadsheet</DialogTitle>
          <DialogDescription>
            Create and edit datasets using spreadsheet tools and autofill keys.
          </DialogDescription>
        </DialogHeader>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-muted/40 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="size-7 sm:size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="size-4 sm:size-4.5" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="flex items-center bg-background border border-border/80 rounded-md px-2 py-0.5 shadow-2xs min-w-0 flex-1 max-w-[190px] sm:max-w-[260px]">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mr-1 shrink-0">
                  File:
                </span>
                <Input
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Dataset.xlsx"
                  className="h-6 text-xs border-none bg-transparent p-0 focus-visible:ring-0 focus-visible:outline-none font-medium truncate"
                />
              </div>
              <Badge
                variant="outline"
                className="hidden md:inline-flex text-[9px] uppercase px-1 py-0 font-medium bg-background text-muted-foreground shrink-0"
              >
                Syncfusion
              </Badge>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 sm:h-8 px-2.5 sm:px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-xs cursor-pointer gap-1 sm:gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>Save</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="hidden sm:inline-flex h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title={
                isExpanded ? "Collapse to 70% width" : "Expand to 94% width"
              }
            >
              {isExpanded ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4 sm:hidden" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          </div>
        </div>

        {/* Secondary Toolbar: Template Chooser, Auto-fill Keys Helper, Ribbon Toggle */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-background border-b text-xs shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Template Selector */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1.5 border-border/70 hover:bg-muted/50 text-foreground cursor-pointer"
                >
                  <LayoutTemplate className="size-3.5 text-primary" />
                  <span>Template: {TEMPLATES[selectedTemplate]?.name}</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                  Select a starter schema:
                </DropdownMenuLabel>
                {Object.entries(TEMPLATES).map(([key, item]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleSelectTemplate(key)}
                    className="flex flex-col items-start gap-0.5 p-2 cursor-pointer rounded-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-xs text-foreground">
                        {item.name}
                      </span>
                      {selectedTemplate === key && (
                        <Check className="size-3.5 text-primary" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.columns.join(", ")}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Auto-fill Keys Popover */}
            <Popover
              modal={false}
              open={isKeyGenOpen}
              onOpenChange={setIsKeyGenOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1.5 border-primary/30 hover:bg-primary/5 text-foreground cursor-pointer font-medium"
                  title="Generate or autofill sequence of keys in Column A"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Auto-fill Keys Tool</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <KeyRound className="size-3.5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-foreground">
                      Auto-fill Column A Keys
                    </h5>
                    <p className="text-[10px] text-muted-foreground">
                      Batch generate sequence keys into Column A
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Key Prefix:
                    </Label>
                    <Input
                      value={keyPrefix}
                      onChange={(e) => setKeyPrefix(e.target.value)}
                      placeholder="EMP-, ID-, or blank"
                      className="h-7 text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Start No:
                      </Label>
                      <Input
                        type="number"
                        value={keyStart}
                        onChange={(e) =>
                          setKeyStart(parseInt(e.target.value) || 1)
                        }
                        className="h-7 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Count:
                      </Label>
                      <Input
                        type="number"
                        value={keyCount}
                        onChange={(e) =>
                          setKeyCount(
                            Math.min(
                              100,
                              Math.max(1, parseInt(e.target.value) || 10),
                            ),
                          )
                        }
                        className="h-7 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Digit Padding:
                    </Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      {[0, 2, 3, 4].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setKeyPadDigits(d)}
                          className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                            keyPadDigits === d
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 hover:bg-muted border-border text-foreground"
                          }`}
                        >
                          {d === 0
                            ? "1"
                            : d === 2
                              ? "01"
                              : d === 3
                                ? "001"
                                : "0001"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 rounded bg-muted/30 border text-[11px] text-muted-foreground">
                    Preview:{" "}
                    <span className="font-mono text-foreground font-medium">
                      {keyPrefix}
                      {String(keyStart).padStart(keyPadDigits, "0")},{" "}
                      {keyPrefix}
                      {String(keyStart + 1).padStart(keyPadDigits, "0")}...
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleApplyKeyAutofill}
                    className="w-full h-7 bg-primary text-primary-foreground text-xs cursor-pointer font-medium mt-1"
                  >
                    Generate {keyCount} Keys in Column A
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Quick Tip for Native Drag Handle */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md">
              <Info className="size-3 text-primary shrink-0" />
              <span>
                Drag the small square corner handle on any cell to autofill
                values
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Ribbon */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRibbon((prev) => !prev)}
              className="h-7 px-2 text-xs border-border/80 hover:bg-muted/50 text-foreground cursor-pointer font-medium"
            >
              {showRibbon ? "Hide Ribbon" : "Show Ribbon"}
            </Button>

            {/* Reset Template */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSelectTemplate(selectedTemplate)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
              title="Reset current spreadsheet"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* Spreadsheet Component Area */}
        <div className="flex-1 w-full h-full min-h-0 bg-background overflow-hidden relative">
          <SpreadsheetComponent
            key={`ss-${spreadsheetKey}-${showRibbon}`}
            ref={spreadsheetRef}
            created={onCreated}
            className="w-full h-full"
            height="100%"
            width="100%"
            allowEditing={true}
            allowAutoFill={true}
            allowInsert={true}
            allowDelete={true}
            allowOpen={false}
            allowSave={false}
            showRibbon={showRibbon}
            showFormulaBar={true}
            sheets={generateInitialSheet(selectedTemplate)}
          />
        </div>

        {/* Footer info bar: Clean helper on desktop, hidden on small screens to give maximum room to spreadsheet */}
        <div className="hidden sm:flex items-center justify-between px-4 py-1.5 bg-muted/20 border-t text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <Info className="size-3 text-primary shrink-0" />
            <span>
              Select cells and drag corner handle down to autofill sequence
            </span>
            <span>•</span>
            <span>
              Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">
                Enter
              </kbd>{" "}
              to commit edits
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              Syncfusion Grid
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
