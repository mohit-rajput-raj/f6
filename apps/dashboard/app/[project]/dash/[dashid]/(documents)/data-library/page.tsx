"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useSession } from "@/lib/auth-client";
import {
  getDataLibraryFiles,
  getDataLibraryFile,
  createDataLibraryFile,
  deleteDataLibraryFile,
  updateDataLibraryFile,
} from "./actions";
import {
  Database,
  Upload,
  Trash2,
  FileSpreadsheet,
  Search,
  Grid3X3,
  List,
  CalendarDays,
  FolderOpen,
  Download,
  Eye,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Server,
  ScanText,
  Pencil,
  Sparkles,
  Table2,
} from "lucide-react";
import {
  normalizeDataset,
  serializeDataset,
  hasStoredSlideshow,
  SlideshowSession,
} from "./lib/dataset-helpers";
import { SyncfusionSheetModal } from "./components/syncfusion-sheet-modal";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog";
import { toast } from "sonner";
import Papa, { type ParseResult } from "papaparse";
import * as XLSX from "xlsx";
import { SpreadsheetPreviewModal } from "./components/spreadsheet-preview-modal";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserSubscription } from "@/lib/use-user-subscription";

interface DataLibraryFileItem {
  id: string;
  name: string;
  description: string | null;
  fileType: string;
  data?: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  workflowId: string | null;
}

interface PreviewData {
  columns: string[];
  data: any[][];
}

const DataLibrary = () => {
  const params = useParams();
  const router = useRouter();
  const project = (params?.project as string) || "";
  const dashid = (params?.dashid as string) || "";
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasOcrAccess, isLoading: isSubLoading } = useUserSubscription();

  const openDatasetAdd = (fileId: string) => {
    router.push(`/${project}/dash/${dashid}/data-library/${fileId}/add`);
  };

  const [files, setFiles] = useState<DataLibraryFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">(
    "grid",
  );
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Syncfusion modal open state
  const [isSyncfusionModalOpen, setIsSyncfusionModalOpen] = useState(false);

  // Track in-progress local sessions for badges
  const [storedSessionMap, setStoredSessionMap] = useState<Record<string, boolean>>({});

  // Fetch files from DB for this desk (dashid)
  const fetchFiles = useCallback(async () => {
    if (!dashid && !userId) return;
    setLoading(true);
    try {
      const result = await getDataLibraryFiles(dashid, userId);
      setFiles(result as any);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      toast.error("Failed to load data library");
    } finally {
      setLoading(false);
    }
  }, [dashid, userId]);

  const refreshStoredSessions = useCallback(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, boolean> = {};
    files.forEach((f) => {
      if (hasStoredSlideshow(f.id)) {
        map[f.id] = true;
      }
    });
    setStoredSessionMap(map);
  }, [files]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    refreshStoredSessions();
  }, [refreshStoredSessions]);

  // Upload handler for CSV/XLSX
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase();

    try {
      if (extension === "csv") {
        Papa.parse(file, {
          header: true,
          complete: async (results: ParseResult<Record<string, any>>) => {
            const columns: string[] = results.meta.fields || [];
            const data = (results.data || []).map((row: Record<string, any>) =>
              columns.map((col: string) => row[col] ?? ""),
            );

            await createDataLibraryFile({
              userId,
              name: file.name,
              description: `Uploaded CSV file with ${data.length} rows and ${columns.length} columns`,
              fileType: "csv",
              data: { columns, data },
              metadata: {
                rowCount: data.length,
                colCount: columns.length,
                originalSize: file.size,
              },
              workflowId: dashid,
            });

            toast.success(`${file.name} uploaded successfully!`);
            fetchFiles();
            setUploading(false);
          },
          error: (error: Error) => {
            console.error("CSV Parse error:", error);
            toast.error("Failed to parse CSV");
            setUploading(false);
          },
        });
      } else if (extension === "xlsx" || extension === "xls") {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const buffer = event.target?.result;
            const workbook = XLSX.read(buffer, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            }) as any[][];

            if (jsonData.length === 0) {
              toast.error("Excel sheet is empty");
              setUploading(false);
              return;
            }

            const columns = (jsonData[0] || []).map((col: any) => String(col));
            const data = jsonData.slice(1);

            await createDataLibraryFile({
              userId,
              name: file.name,
              description: `Uploaded Excel spreadsheet with ${data.length} rows and ${columns.length} columns`,
              fileType: "xlsx",
              data: { columns, data },
              metadata: {
                rowCount: data.length,
                colCount: columns.length,
                originalSize: file.size,
                sheetNames: workbook.SheetNames,
              },
              workflowId: dashid,
            });

            toast.success(`${file.name} uploaded successfully!`);
            fetchFiles();
          } catch (err) {
            console.error("Excel parse error:", err);
            toast.error("Failed to parse Excel file");
          } finally {
            setUploading(false);
          }
        };
        reader.readAsBinaryString(file);
      } else {
        toast.error("Unsupported file format. Please upload CSV or Excel.");
        setUploading(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed");
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Save new dataset created via Syncfusion spreadsheet modal
  const handleSaveFromSyncfusion = async ({
    name,
    columns,
    data,
  }: {
    name: string;
    columns: string[];
    data: any[][];
  }) => {
    if (!userId) {
      toast.error("Please sign in to save datasets");
      return;
    }
    try {
      await createDataLibraryFile({
        userId,
        name,
        description: `Spreadsheet dataset with ${data.length} rows and ${columns.length} columns`,
        fileType: "xlsx",
        data: { columns, data },
        metadata: {
          rowCount: data.length,
          colCount: columns.length,
          originalSize: 0,
          sheetNames: ["Sheet1"],
        },
        workflowId: dashid,
      });
      toast.success(`Dataset "${name}" saved to library!`);
      await fetchFiles();
    } catch (err) {
      console.error("Save spreadsheet error:", err);
      toast.error("Failed to save spreadsheet dataset");
    }
  };

  // Delete file
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    setDeletingFileId(fileId);
    try {
      await deleteDataLibraryFile(fileId);
      toast.success(`Deleted ${fileName}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  // Download file
  const handleDownload = async (file: DataLibraryFileItem) => {
    try {
      let dataObj = file.data;
      if (!dataObj) {
        const fullFile = await getDataLibraryFile(file.id, userId);
        dataObj = fullFile?.data;
      }

      if (typeof dataObj === "string") {
        try {
          dataObj = JSON.parse(dataObj);
        } catch (e) {
          // ignore
        }
      }

      if (!dataObj) {
        toast.error("File data unavailable for download");
        return;
      }

      let columns: string[] = [];
      let dataRows: any[][] = [];

      if (dataObj.columns && Array.isArray(dataObj.data)) {
        columns = dataObj.columns;
        dataRows = dataObj.data;
      } else if (Array.isArray(dataObj) && dataObj.length > 0) {
        if (typeof dataObj[0] === "object" && !Array.isArray(dataObj[0])) {
          columns = Object.keys(dataObj[0]);
          dataRows = dataObj.map((item: any) =>
            columns.map((col) => item[col] ?? ""),
          );
        } else if (Array.isArray(dataObj[0])) {
          columns = dataObj[0].map((col: any) => String(col));
          dataRows = dataObj.slice(1);
        }
      }

      if (columns.length === 0 && dataRows.length === 0) {
        toast.error("File data unavailable for download");
        return;
      }

      if (file.fileType === "csv" || file.fileType === "json") {
        const rows = [columns, ...dataRows];
        const csvContent =
          "data:text/csv;charset=utf-8," +
          rows
            .map((r: any[]) =>
              r
                .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
                .join(","),
            )
            .join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
          "download",
          `${file.name.replace(/\.[^/.]+$/, "")}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const ws = XLSX.utils.aoa_to_sheet([columns, ...dataRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(
          wb,
          `${file.name.replace(/\.[^/.]+$/, "") || "dataset"}.xlsx`,
        );
      }
      toast.success(`Downloaded ${file.name}`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download file");
    }
  };

  // Preview file in modal
  const handlePreview = async (file: DataLibraryFileItem) => {
    setPreviewLoading(true);
    setPreviewFile(file.id);

    try {
      let raw = file.data;
      if (!raw) {
        const fullFile = await getDataLibraryFile(file.id, userId);
        raw = fullFile?.data;
      }

      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch (e) {
          // ignore
        }
      }

      if (raw && raw.columns && Array.isArray(raw.data)) {
        setPreviewData({
          columns: raw.columns,
          data: raw.data.slice(0, 100), // first 100 rows for preview performance
        });
      } else if (Array.isArray(raw) && raw.length > 0) {
        if (typeof raw[0] === "object" && !Array.isArray(raw[0])) {
          const cols = Object.keys(raw[0]);
          const rows = raw
            .slice(0, 100)
            .map((item: any) => cols.map((col) => item[col] ?? ""));
          setPreviewData({ columns: cols, data: rows });
        } else if (Array.isArray(raw[0])) {
          const cols = raw[0].map((col: any) => String(col));
          const rows = raw.slice(1, 101);
          setPreviewData({ columns: cols, data: rows });
        } else {
          setPreviewData({ columns: ["Error"], data: [["No preview available"]] });
        }
      } else {
        setPreviewData({ columns: ["Error"], data: [["No preview available"]] });
      }
    } catch (err) {
      console.error("Preview error:", err);
      toast.error("Failed to load file preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Filter files by search term
  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const term = searchTerm.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        (f.description && f.description.toLowerCase().includes(term)) ||
        f.fileType.toLowerCase().includes(term),
    );
  }, [files, searchTerm]);

  // Windows Explorer-like timeline date grouping helper
  const timelineGroups = useMemo(() => {
    if (viewMode !== "timeline") return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Start of this week (Monday)
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - diffToMonday);

    // Start of last week
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Start of this month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Start of this year
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    const buckets: {
      id: string;
      title: string;
      order: number;
      files: DataLibraryFileItem[];
    }[] = [
      { id: "today", title: "Today", order: 1, files: [] },
      { id: "yesterday", title: "Yesterday", order: 2, files: [] },
      { id: "this_week", title: "Earlier this week", order: 3, files: [] },
      { id: "last_week", title: "Last week", order: 4, files: [] },
      { id: "this_month", title: "Earlier this month", order: 5, files: [] },
      { id: "last_month", title: "Last month", order: 6, files: [] },
      { id: "this_year", title: "Earlier this year", order: 7, files: [] },
    ];

    // Dynamic buckets for previous years
    const olderYearsMap: Record<number, DataLibraryFileItem[]> = {};

    filteredFiles.forEach((file) => {
      const fileDate = new Date(file.updatedAt || file.createdAt);

      if (fileDate >= today) {
        buckets[0].files.push(file);
      } else if (fileDate >= yesterday) {
        buckets[1].files.push(file);
      } else if (fileDate >= startOfThisWeek) {
        buckets[2].files.push(file);
      } else if (fileDate >= startOfLastWeek) {
        buckets[3].files.push(file);
      } else if (fileDate >= startOfThisMonth) {
        buckets[4].files.push(file);
      } else if (fileDate >= startOfLastMonth) {
        buckets[5].files.push(file);
      } else if (fileDate >= startOfThisYear) {
        buckets[6].files.push(file);
      } else {
        const year = fileDate.getFullYear();
        if (!olderYearsMap[year]) {
          olderYearsMap[year] = [];
        }
        olderYearsMap[year].push(file);
      }
    });

    // Append older years sorted descending
    const olderYearBuckets = Object.keys(olderYearsMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map((year, idx) => ({
        id: `year_${year}`,
        title: `Year ${year}`,
        order: 10 + idx,
        files: olderYearsMap[year],
      }));

    // Only return groups that actually have files
    return [...buckets, ...olderYearBuckets].filter((g) => g.files.length > 0);
  }, [filteredFiles, viewMode]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">
          Please log in to access the Data Library.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 w-full mx-auto space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/20 shrink-0">
            <Server className="size-5 sm:size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Data Library
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} stored • Manage
              and extract datasets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden bg-muted/20 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-background shadow-xs text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid view"
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-background shadow-xs text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List view"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-background shadow-xs text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Windows-style Timeline view"
            >
              <CalendarDays className="size-4" />
            </button>
          </div>

          {/* Extract from Image Button */}
          <Link href={`/${project}/dash/${dashid}/data-library/ocr`}>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-foreground shadow-2xs font-medium"
            >
              <ScanText className="size-4 text-primary" />
              <span>Extract from Image</span>
            </Button>
          </Link>

          {/* Upload File / Customize Spreadsheet Split Dropdown Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleUpload}
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={uploading}
                className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-medium gap-1.5"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span>{uploading ? "Uploading..." : "Upload File"}</span>
                <ChevronDown className="size-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-xl">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="flex items-start gap-3 p-2.5 cursor-pointer rounded-lg hover:bg-muted/80 focus:bg-muted/80 transition-colors"
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="size-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-foreground">
                    From Local Browser
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Select CSV, Excel (.xlsx, .xls) from your computer
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsSyncfusionModalOpen(true)}
                className="flex items-start gap-3 p-2.5 cursor-pointer rounded-lg hover:bg-muted/80 focus:bg-muted/80 transition-colors"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Table2 className="size-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-foreground">
                    Customize in Spreadsheet
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Syncfusion grid with key autofill handle, formulas & live save
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search datasets by name..."
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        {searchTerm && (
          <span className="text-xs text-muted-foreground shrink-0">
            Found {filteredFiles.length} result
            {filteredFiles.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* File List / Content Views */}
      {loading ? (
        <div className="flex items-center justify-center h-[35vh]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-sm font-medium">
              Loading library datasets...
            </span>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[35vh] gap-3 text-muted-foreground border-2 border-dashed rounded-2xl p-8">
          <FolderOpen className="size-12 opacity-30" />
          <div className="text-center max-w-sm">
            <p className="text-base font-semibold text-foreground mb-1">
              {searchTerm
                ? "No datasets match your search"
                : "Your Data Library is empty"}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchTerm
                ? "Try searching with a different filename or clear the search field"
                : "Upload a CSV/Excel file, or click 'Extract from Image' in the top right to scan a table"}
            </p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => openDatasetAdd(file.id)}
              className="group relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card p-4 shadow-2xs hover:shadow-md transition-all hover:border-zinc-400 dark:hover:border-zinc-600 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center justify-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {storedSessionMap[file.id] && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[9px] px-1.5 py-0 flex items-center gap-1 cursor-pointer hover:bg-emerald-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDatasetAdd(file.id);
                        }}
                        title="In-progress column entry saved in local storage. Click to resume."
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>In-progress</span>
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium uppercase px-2 py-0.5 border-border/60 text-muted-foreground"
                    >
                      {file.fileType}
                    </Badge>
                  </div>
                </div>

                <h3
                  className="font-semibold text-sm truncate mb-1 text-foreground group-hover:text-primary transition-colors"
                  title={file.name}
                >
                  {file.name}
                </h3>
                {file.description ? (
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {file.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic mb-2">
                    No description
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {(file.metadata as any)?.rowCount !== undefined && (
                    <span>{(file.metadata as any).rowCount} rows</span>
                  )}
                  {(file.metadata as any)?.rowCount !== undefined &&
                    (file.metadata as any)?.colCount !== undefined && (
                      <span>•</span>
                    )}
                  {(file.metadata as any)?.colCount !== undefined && (
                    <span>{(file.metadata as any).colCount} cols</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Date, Open Indicator & Utility Icons */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-[11px]">
                  {new Date(
                    file.updatedAt || file.createdAt,
                  ).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(file);
                    }}
                    title="Preview spreadsheet"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    title="Download file"
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id, file.name);
                    }}
                    disabled={deletingFileId === file.id}
                    title="Delete file"
                  >
                    {deletingFileId === file.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "list" ? (
        /* List view with horizontal scroll on small screens */
        <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[560px]">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Dimensions</th>
                <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => openDatasetAdd(file.id)}
                  className="border-b last:border-none hover:bg-muted/20 transition cursor-pointer group"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-zinc-500 shrink-0" />
                      <span
                        className="font-medium text-foreground truncate max-w-[260px] group-hover:text-primary transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 uppercase text-xs">
                    <Badge variant="outline" className="text-[10px] py-0">
                      {file.fileType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {(file.metadata as any)?.rowCount ?? "?"} rows ×{" "}
                    {(file.metadata as any)?.colCount ?? "?"} cols
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(
                      file.updatedAt || file.createdAt,
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        title="Preview"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        title="Download"
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id, file.name);
                        }}
                        disabled={deletingFileId === file.id}
                        title="Delete"
                      >
                        {deletingFileId === file.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* Windows Explorer-style Timeline View */
        <div className="space-y-6">
          {timelineGroups.map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];

            return (
              <div
                key={group.id}
                className="rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-2xs"
              >
                {/* Windows-like Header with Chevron, Title, and Item Count */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/70 transition border-b text-left select-none cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-xs tracking-tight text-foreground">
                      {group.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {group.files.length}
                    </Badge>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {isCollapsed ? "Click to expand" : "Click to collapse"}
                  </span>
                </button>

                {/* Collapsible content section */}
                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.files.map((file) => {
                      const fileTime = new Date(
                        file.updatedAt || file.createdAt,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const fileDateStr = new Date(
                        file.updatedAt || file.createdAt,
                      ).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={file.id}
                          onClick={() => openDatasetAdd(file.id)}
                          className="relative flex flex-col justify-between p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card hover:bg-muted/15 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition-all gap-3 group cursor-pointer"
                        >
                          {/* Top Info Section: Icon, Name, Badge, Date & Time */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                              <FileSpreadsheet className="size-4.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 justify-between">
                                <h4
                                  className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors"
                                  title={file.name}
                                >
                                  {file.name}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] uppercase px-1 py-0 shrink-0 font-medium"
                                >
                                  {file.fileType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                                <span>{fileDateStr}</span>
                                <span>•</span>
                                <span>{fileTime}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Action Row: Open hint and Preview, Download, Delete on right */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-zinc-400 font-medium group-hover:text-primary transition-colors">
                              Open dataset →
                            </span>

                            <div className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreview(file);
                                }}
                                title="Preview spreadsheet"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(file);
                                }}
                                title="Download"
                              >
                                <Download className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file.id, file.name);
                                }}
                                disabled={deletingFileId === file.id}
                                title="Delete"
                              >
                                {deletingFileId === file.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spreadsheet Preview Modal */}
      <SpreadsheetPreviewModal
        isOpen={previewFile !== null}
        onClose={() => {
          setPreviewFile(null);
          setPreviewData(null);
        }}
        fileName={files.find((f) => f.id === previewFile)?.name || "File Preview"}
        fileType={files.find((f) => f.id === previewFile)?.fileType || "csv"}
        columns={previewData?.columns || []}
        data={previewData?.data || []}
        columnTypes={(files.find((f) => f.id === previewFile)?.metadata as any)?.columnTypes}
        isLoading={previewLoading}
        onOpenEdit={() => {
          const target = files.find((f) => f.id === previewFile);
          if (target) {
            router.push(`/${project}/dash/${dashid}/data-library/${target.id}/edit`);
          }
        }}
      />

      {/* Syncfusion Spreadsheet Customization & Creation Modal */}
      <SyncfusionSheetModal
        isOpen={isSyncfusionModalOpen}
        onClose={() => setIsSyncfusionModalOpen(false)}
        onSave={handleSaveFromSyncfusion}
      />
    </div>
  );
};

export default DataLibrary;
