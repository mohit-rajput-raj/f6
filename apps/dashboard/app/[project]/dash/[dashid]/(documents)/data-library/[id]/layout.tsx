"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { DatasetProvider, useDataset } from "./dataset-context";
import {
  ChevronLeft,
  Database,
  PlusCircle,
  Table2,
  Download,
  Eye,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Lock,
  Cpu,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { SpreadsheetPreviewModal } from "../components/spreadsheet-preview-modal";
import * as XLSX from "xlsx";
import { toast } from "sonner";

function DatasetLayoutInner({ children }: { children: React.ReactNode }) {
  const {
    file,
    columns,
    rows,
    loading,
    project,
    dashid,
    id,
    activeIntegrationMode,
    setActiveIntegrationMode,
  } = useDataset();

  const pathname = usePathname();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isAddActive = pathname.endsWith("/add") || pathname.endsWith(`/${id}`);
  const isEditActive = pathname.endsWith("/edit");

  // Export handlers
  const handleDownloadCsv = () => {
    if (!file) return;
    try {
      const allRows = [columns, ...rows];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        allRows
          .map((r) =>
            r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
          )
          .join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${file.name.replace(/\.[^/.]+$/, "")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = () => {
    if (!file) return;
    try {
      const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${file.name.replace(/\.[^/.]+$/, "") || "dataset"}.xlsx`);
      toast.success("Excel file downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground min-w-0 overflow-x-hidden">
      {/* Top Header / Breadcrumb Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-card/95 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 transition-colors">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full min-w-0">
          {/* Left: Back Arrow + File Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <Link
              href={`/${project}/dash/${dashid}/data-library`}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shrink-0"
              title="Return to Data Library"
            >
              <ChevronLeft className="size-4" />
            </Link>

            <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="size-4" />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden pr-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-xs sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate min-w-0 flex-1">
                  {file?.name || (loading ? "Loading dataset..." : "Dataset")}
                </h1>
                {file?.fileType && (
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-mono px-1 py-0 h-4 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 shrink-0"
                  >
                    {file.fileType}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate min-w-0">
                <span className="truncate">{rows.length} rows • {columns.length} cols</span>
                {file?.updatedAt && (
                  <span className="hidden sm:inline shrink-0">
                    • Updated {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="h-7 sm:h-7.5 w-7 sm:w-auto p-0 sm:px-2.5 sm:gap-1 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              title="Quick spreadsheet preview"
            >
              <Eye className="size-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Preview</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-7.5 w-7 sm:w-auto p-0 sm:px-2.5 sm:gap-1 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  title="Export dataset"
                >
                  <Download className="size-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuItem onClick={handleDownloadCsv} className="cursor-pointer">
                  Export as CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadExcel} className="cursor-pointer">
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation Switcher: Add Data & Columns vs. Edit Dataset */}
        <div className="max-w-7xl mx-auto w-full mt-2.5 sm:mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5 min-w-0">
          {/* Main Navigation Tabs */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/50 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800 w-full sm:w-fit shrink-0">
            <Link
              href={`/${project}/dash/${dashid}/data-library/${id}/add`}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isAddActive
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <PlusCircle className="size-3.5 text-zinc-400 shrink-0" />
              <span className="sm:hidden truncate">Add Data</span>
              <span className="hidden sm:inline truncate">Add Data & Columns</span>
            </Link>

            <Link
              href={`/${project}/dash/${dashid}/data-library/${id}/edit`}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isEditActive
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Table2 className="size-3.5 text-zinc-400 shrink-0" />
              <span className="sm:hidden truncate">Edit</span>
              <span className="hidden sm:inline truncate">Edit Dataset</span>
              <span className="text-[10px] text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-1 rounded shrink-0">
                {rows.length}
              </span>
            </Link>
          </div>

          {/* Integration Mode Switcher: Manual Data Integration vs Automated (Coming Soon) */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveIntegrationMode("manual")}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-colors ${
                activeIntegrationMode === "manual"
                  ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Layers className="size-3 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span>Manual Data Integration</span>
            </button>

            {/* Automated Data Integration - Blurred & Unclickable / Disabled */}
            <div
              className="relative group cursor-not-allowed select-none"
              title="Automated Data Integration (Face recognition, fingerprint scanner, and RFID hardware telemetry) is coming soon"
            >
              <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/40 dark:bg-zinc-900/40 text-zinc-400 opacity-60 filter blur-[0.4px] pointer-events-none">
                <Cpu className="size-3 text-zinc-400 shrink-0" />
                <span>Automated Integration</span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-normal flex items-center gap-0.5"
                >
                  <Lock className="size-2 text-amber-500" />
                  <span>Coming Soon</span>
                </Badge>
              </div>

              {/* Hover Tooltip explaining hardware integration */}
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col z-50 w-64 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-popover text-popover-foreground shadow-lg text-[11px] leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  <Lock className="size-3 text-amber-500 shrink-0" />
                  <span>Hardware Telemetry Sync</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Biometric Face Recognition, USB Fingerprint Scanner sync, and RFID/IoT hardware integrations are currently under development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 min-w-0">
        {children}
      </main>

      {/* Spreadsheet Preview Modal */}
      <SpreadsheetPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileName={file?.name || "Dataset Preview"}
        fileType={file?.fileType || "csv"}
        columns={columns}
        data={rows}
        columnTypes={file?.metadata?.columnTypes}
        isLoading={loading}
      />
    </div>
  );
}

export default function DatasetLayout({ children }: { children: React.ReactNode }) {
  return (
    <DatasetProvider>
      <DatasetLayoutInner>{children}</DatasetLayoutInner>
    </DatasetProvider>
  );
}
