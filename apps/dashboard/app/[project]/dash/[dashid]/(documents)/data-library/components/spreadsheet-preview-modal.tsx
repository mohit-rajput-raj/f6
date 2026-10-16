"use client";

import React, { useState, useMemo } from "react";
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
  Download,
  Search,
  Pencil,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

interface SpreadsheetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  columns: string[];
  data: any[][];
  isLoading?: boolean;
  onOpenEdit?: () => void;
  fileType?: string;
}

export const SpreadsheetPreviewModal: React.FC<SpreadsheetPreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  columns,
  data,
  isLoading = false,
  onOpenEdit,
  fileType = "csv",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  // Quick download handlers
  const handleDownloadCsv = () => {
    try {
      const rows = [columns, ...data];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        rows
          .map((r: any[]) =>
            r
              .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
              .join(",")
          )
          .join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${fileName.replace(/\.[^/.]+$/, "") || "dataset"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV download error:", e);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([columns, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(
        wb,
        `${fileName.replace(/\.[^/.]+$/, "") || "dataset"}.xlsx`
      );
    } catch (e) {
      console.error("Excel download error:", e);
    }
  };

  // Cell formatting helper for status / attendance values
  const renderCellContent = (value: any) => {
    const str = String(value ?? "").trim();
    const upper = str.toUpperCase();

    if (upper === "P" || upper === "PRESENT") {
      return (
        <span className="inline-flex items-center justify-center size-6 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          P
        </span>
      );
    }
    if (upper === "A" || upper === "ABSENT") {
      return (
        <span className="inline-flex items-center justify-center size-6 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          A
        </span>
      );
    }
    if (upper === "TRUE" || upper === "YES" || upper === "PASS") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {str}
        </span>
      );
    }
    if (upper === "FALSE" || upper === "NO" || upper === "FAIL") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {str}
        </span>
      );
    }

    return <span className="text-foreground">{str}</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] sm:w-[94vw] max-w-6xl h-[94vh] sm:h-[90vh] flex flex-col p-3 sm:p-5 gap-2.5 sm:gap-3 bg-card border shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden">
        {/* Header - optimized for mobile & desktop */}
        <DialogHeader className="flex flex-col gap-2 pb-2.5 sm:pb-3 border-b pr-8 sm:pr-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 sm:size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FileSpreadsheet className="size-4 sm:size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xs sm:text-base font-semibold flex items-center gap-1.5 text-foreground truncate">
                  <span className="truncate">{fileName || "Dataset Preview"}</span>
                  <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 shrink-0">
                    {fileType}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{columns.length} columns</span>
                  <span>•</span>
                  <span>{data.length} rows</span>
                  {searchTerm && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-medium">
                        {filteredRows.length} found
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Action Toolbar on Mobile & Desktop */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-between flex-wrap pt-0.5">
            <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-[130px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rows..."
                className="h-7 sm:h-8 pl-7.5 text-xs bg-background rounded-md"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {onOpenEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenEdit();
                  }}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-2.5 cursor-pointer gap-1 border-border/80 hover:bg-muted/50 font-medium"
                >
                  <Pencil className="size-3 text-primary" />
                  <span className="hidden xs:inline sm:inline">Edit in Sheet</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 cursor-pointer gap-1"
                title="Download CSV"
              >
                <Download className="size-3 text-muted-foreground" />
                <span>CSV</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 cursor-pointer gap-1"
                title="Download Excel"
              >
                <Download className="size-3 text-muted-foreground" />
                <span>XLSX</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Table Container */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-12">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading dataset preview...</p>
          </div>
        ) : columns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-12 text-muted-foreground">
            <FileText className="size-8 opacity-30" />
            <p className="text-xs font-medium">Dataset is empty</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto border rounded-lg bg-card w-full relative">
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full text-xs border-collapse">
                {/* Sticky Header Row */}
                <thead className="sticky top-0 z-20 bg-muted shadow-xs">
                  <tr className="border-b border-border/80">
                    {/* Corner index cell (solid opaque background, sticky horizontally & vertically) */}
                    <th className="sticky left-0 z-30 w-10 min-w-10 max-w-10 text-center py-2 px-1.5 bg-muted font-mono text-[10px] font-semibold text-muted-foreground border-r border-border/80 select-none shadow-[1px_0_0_0_var(--border)]">
                      #
                    </th>
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="py-2 px-3 text-left font-semibold text-foreground border-r border-border/80 whitespace-nowrap min-w-[110px] max-w-[240px] truncate select-none bg-muted text-[11px]"
                        title={col || `Column ${idx + 1}`}
                      >
                        {col || `Col ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border/60 bg-card">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        No rows matching &quot;{searchTerm}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Sticky Row Index Column with solid background so text never bleeds */}
                        <td className="sticky left-0 z-10 w-10 min-w-10 max-w-10 text-center py-1.5 px-1 bg-card font-mono text-[10px] text-muted-foreground border-r border-border/80 select-none group-hover:bg-muted/60 shadow-[1px_0_0_0_var(--border)]">
                          {rowIdx + 1}
                        </td>

                        {/* Row Cells */}
                        {columns.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className="py-1.5 px-3 border-r border-border/60 whitespace-nowrap min-w-[110px] max-w-[260px] truncate select-text text-xs"
                            title={String(row[colIdx] ?? "")}
                          >
                            {renderCellContent(row[colIdx])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer info - responsive on mobile & tablet */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground pt-1 px-1 gap-1 shrink-0">
          <span>
            Showing {filteredRows.length} of {data.length} rows (first 100 rows loaded in preview)
          </span>
          <span className="text-muted-foreground/80">
            Scroll horizontally to view all {columns.length} columns
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
