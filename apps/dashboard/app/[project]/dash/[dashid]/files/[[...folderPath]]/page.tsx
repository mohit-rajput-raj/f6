"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  FileSpreadsheet,
  Upload,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Eye,
  ArrowLeft,
  FolderInput,
  RefreshCw,
  FileText,
  Home,
  CornerDownRight,
  Layers,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import {
  openSheetInSyncfusion,
  convertFlatToSyncfusionWorkbook,
  extract2DGridFromAnySheet,
} from "@/lib/sheet-utils";
import {
  getSubfolders,
  getFilesInFolder,
  createNestedFolder,
  deleteFolderByPath,
  deleteWorkspaceFile,
  importCsvFileToFolder,
  moveFileToFolderPath,
  getAllFoldersFlat,
  WorkspaceFolderItem,
  WorkspaceFileItem,
} from "../_actions/files-actions";

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
);

/**
 * Robust normalizer for file data in any representation:
 * - Direct { columns, data }
 * - Nested { data: { columns, data } }
 * - CSV raw text string
 * - JSON array of objects
 * - Syncfusion Workbook JSON
 */
function normalizeFileDataToFlat(
  fileItem: WorkspaceFileItem | null
): { columns: string[]; data: any[][] } | null {
  if (!fileItem) return null;
  const raw = fileItem.data;

  // 1. Direct { columns: [...], data: [...] }
  if (raw && Array.isArray(raw.columns) && Array.isArray(raw.data)) {
    return { columns: raw.columns, data: raw.data };
  }

  // 2. Nested { data: { columns: [...], data: [...] } }
  if (raw?.data && Array.isArray(raw.data.columns) && Array.isArray(raw.data.data)) {
    return { columns: raw.data.columns, data: raw.data.data };
  }

  // 3. Raw CSV string
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = Papa.parse(raw, { skipEmptyLines: true });
      const rows = (parsed.data as any[][]) || [];
      if (rows.length > 0) {
        const columns = rows[0].map((c: any, i: number) =>
          c !== undefined && c !== null && String(c).trim()
            ? String(c).trim()
            : `Col_${i + 1}`
        );
        const data = rows.slice(1);
        return { columns, data };
      }
    } catch (e) {
      console.warn("Failed parsing CSV in preview:", e);
    }
  }

  // 4. Array of objects or 2D array
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const columns = Object.keys(first);
      const data = raw.map((item: any) =>
        columns.map((col) =>
          item[col] !== undefined && item[col] !== null ? item[col] : ""
        )
      );
      return { columns, data };
    } else if (Array.isArray(first)) {
      const columns =
        fileItem.metadata?.columns || first.map((_: any, i: number) => `Col_${i + 1}`);
      return { columns, data: raw };
    }
  }

  // 5. Syncfusion Workbook JSON
  if (raw && typeof raw === "object") {
    try {
      const grid = extract2DGridFromAnySheet(raw);
      if (grid && grid.columns && grid.columns.length > 0) {
        return grid;
      }
    } catch (e) {
      // fallback
    }
  }

  // 6. Metadata fallback if columns defined
  if (fileItem.metadata?.columns && Array.isArray(fileItem.metadata.columns)) {
    return { columns: fileItem.metadata.columns, data: [] };
  }

  return null;
}

export default function NestedFilesPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const project = params?.project as string;
  const dashid = params?.dashid as string;

  // Resolve current folder path from dynamic catch-all route segments
  const rawSegments = (params?.folderPath as string[] | undefined) || [];
  const decodedSegments = useMemo(
    () => rawSegments.map((seg) => decodeURIComponent(seg)),
    [rawSegments]
  );
  const currentPath = decodedSegments.join("/");
  const currentFolderName = decodedSegments.length > 0 ? decodedSegments[decodedSegments.length - 1] : "";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core state
  const [subfolders, setSubfolders] = useState<WorkspaceFolderItem[]>([]);
  const [files, setFiles] = useState<WorkspaceFileItem[]>([]);
  const [flatFolders, setFlatFolders] = useState<WorkspaceFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  // Delete folder dialog
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<WorkspaceFolderItem | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Preview file modal & Syncfusion spreadsheet
  const [previewFile, setPreviewFile] = useState<WorkspaceFileItem | null>(null);
  const previewSpreadsheetRef = useRef<any>(null);

  const parsedPreviewDataset = useMemo(
    () => normalizeFileDataToFlat(previewFile),
    [previewFile]
  );

  const loadSpreadsheetData = useCallback(() => {
    const ss = previewSpreadsheetRef.current;
    if (!ss || !parsedPreviewDataset) return;
    const wb = convertFlatToSyncfusionWorkbook(parsedPreviewDataset);
    if (wb) {
      openSheetInSyncfusion(ss, wb);
    }
  }, [parsedPreviewDataset]);

  const onPreviewSpreadsheetCreated = useCallback(() => {
    loadSpreadsheetData();
  }, [loadSpreadsheetData]);

  useEffect(() => {
    if (!previewFile || !parsedPreviewDataset) return;
    const timer = setTimeout(() => {
      loadSpreadsheetData();
    }, 250);
    return () => clearTimeout(timer);
  }, [previewFile, parsedPreviewDataset, loadSpreadsheetData]);

  // Move file modal
  const [movingFile, setMovingFile] = useState<WorkspaceFileItem | null>(null);
  const [targetMovePath, setTargetMovePath] = useState<string>("");

  // Base files URL
  const baseFilesUrl = `/${project}/dash/${dashid}/files`;

  // Navigate to child path
  const navigateToFolder = (folderName: string) => {
    const nextPath = currentPath
      ? `${currentPath}/${encodeURIComponent(folderName)}`
      : encodeURIComponent(folderName);
    router.push(`${baseFilesUrl}/${nextPath}`);
  };

  // Navigate to specific breadcrumb segment
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      router.push(baseFilesUrl);
      return;
    }
    const targetSegments = decodedSegments.slice(0, index + 1);
    const targetPath = targetSegments.map((s) => encodeURIComponent(s)).join("/");
    router.push(`${baseFilesUrl}/${targetPath}`);
  };

  // Navigate to parent folder
  const navigateToParent = () => {
    if (decodedSegments.length <= 1) {
      router.push(baseFilesUrl);
    } else {
      const parentSegments = decodedSegments.slice(0, -1);
      const parentPath = parentSegments.map((s) => encodeURIComponent(s)).join("/");
      router.push(`${baseFilesUrl}/${parentPath}`);
    }
  };

  // Load content of current folder path
  const loadFolderContent = useCallback(async () => {
    if (!dashid) return;
    setLoading(true);
    try {
      const [fetchedSubfolders, fetchedFiles, allFlat] = await Promise.all([
        getSubfolders(dashid, currentPath),
        getFilesInFolder(dashid, currentPath),
        getAllFoldersFlat(dashid),
      ]);
      setSubfolders(fetchedSubfolders);
      setFiles(fetchedFiles);
      setFlatFolders(allFlat);
    } catch (err) {
      console.error("Failed to load folder content:", err);
      toast.error("Failed to load folder contents");
    } finally {
      setLoading(false);
    }
  }, [dashid, currentPath]);

  useEffect(() => {
    loadFolderContent();
  }, [loadFolderContent]);

  // Create folder inside current path
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }
    if (!userId || !dashid) return;

    setFolderSubmitting(true);
    try {
      await createNestedFolder({
        dashid,
        userId,
        parentPath: currentPath,
        name: newFolderName,
        description: newFolderDesc,
      });
      toast.success(`Created folder "${newFolderName}"`);
      setFolderDialogOpen(false);
      setNewFolderName("");
      setNewFolderDesc("");
      loadFolderContent();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create folder");
    } finally {
      setFolderSubmitting(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget || !dashid) return;
    setDeletingFolder(true);
    try {
      await deleteFolderByPath(dashid, deleteFolderTarget.path);
      toast.success(`Deleted folder "${deleteFolderTarget.name}"`);
      setDeleteFolderTarget(null);
      loadFolderContent();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete folder");
    } finally {
      setDeletingFolder(false);
    }
  };

  // CSV file upload into current path
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !dashid) return;

    const toastId = toast.loading(`Importing "${file.name}"...`);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target?.result as string;
          const result = await importCsvFileToFolder({
            dashid,
            userId,
            folderPath: currentPath,
            fileName: file.name,
            csvText,
          });

          if (result.overwritten) {
            toast.success(`Overwrote existing file: "${file.name}"`, { id: toastId });
          } else {
            toast.success(`Imported "${file.name}"`, { id: toastId });
          }
          loadFolderContent();
        } catch (innerErr: any) {
          toast.error(innerErr.message || "Failed to parse CSV file", { id: toastId });
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file", { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download CSV
  const handleDownloadFile = (fileItem: WorkspaceFileItem) => {
    try {
      let csvContent = "";
      if (typeof fileItem.data === "string" && (fileItem.fileType === "csv" || fileItem.name.endsWith(".csv"))) {
        csvContent = fileItem.data;
      } else {
        const dataset = normalizeFileDataToFlat(fileItem);
        if (!dataset || !Array.isArray(dataset.columns) || dataset.columns.length === 0) {
          toast.error("File data is not in spreadsheet format");
          return;
        }
        const headerRow = dataset.columns.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",");
        const dataRows = (dataset.data || []).map((row: any[]) =>
          row.map((val) => (val === null || val === undefined ? "" : `"${String(val).replace(/"/g, '""')}"`)).join(",")
        );
        csvContent = [headerRow, ...dataRows].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileItem.name.endsWith(".csv") ? fileItem.name : `${fileItem.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download CSV");
    }
  };

  // Move file
  const handleMoveFile = async () => {
    if (!movingFile || !userId) return;
    try {
      await moveFileToFolderPath(movingFile.id, targetMovePath, userId);
      toast.success("File moved successfully");
      setMovingFile(null);
      loadFolderContent();
    } catch (err: any) {
      toast.error(err?.message || "Failed to move file");
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      await deleteWorkspaceFile(fileId);
      toast.success(`Deleted "${fileName}"`);
      loadFolderContent();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete file");
    }
  };

  // Filtering
  const filteredSubfolders = subfolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />

      {/* Top Header / Breadcrumb bar */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b bg-card/70 px-6 py-4 backdrop-blur-md">
        {/* Dynamic Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Files</span>
          </button>

          {decodedSegments.map((segment, idx) => {
            const isLast = idx === decodedSegments.length - 1;
            return (
              <React.Fragment key={idx}>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <button
                  onClick={() => navigateToBreadcrumb(idx)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition ${
                    isLast
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="relative h-4 w-4 shrink-0">
                    <Image
                      src="/pngwing.com.png"
                      alt="Folder"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span>{segment}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in this folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-background/80"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-md border bg-background/50 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid View"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* New Folder Button */}
          <Button
            onClick={() => {
              setNewFolderName("");
              setNewFolderDesc("");
              setFolderDialogOpen(true);
            }}
            variant="outline"
            size="sm"
            className="gap-2 border-primary/30 hover:bg-primary/5"
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            <span>New Folder</span>
          </Button>

          {/* Import CSV Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="gap-2 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-8">
        {/* Navigation context bar when inside nested folder */}
        {decodedSegments.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={navigateToParent}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Up one level</span>
              </Button>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex items-center gap-2.5">
                <div className="relative h-6 w-6 shrink-0">
                  <Image src="/pngwing.com.png" alt="Folder" fill className="object-contain" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">{currentFolderName}</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    /{currentPath}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={loadFolderContent}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ================= 1. SUBFOLDERS SECTION ================= */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Folders ({filteredSubfolders.length})
                  </h3>
                </div>
              </div>

              {filteredSubfolders.length === 0 && subfolders.length === 0 ? (
                decodedSegments.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center bg-card/20">
                    <div className="mx-auto relative h-16 w-16 mb-2">
                      <Image src="/pngwing.com.png" alt="Folder" fill className="object-contain opacity-80" />
                    </div>
                    <h4 className="font-semibold text-sm">No folders created yet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Create folders to organize data into nested directories like `A/B/C`.
                    </p>
                    <Button
                      onClick={() => setFolderDialogOpen(true)}
                      size="sm"
                      className="mt-3 gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      <span>Create Folder</span>
                    </Button>
                  </div>
                ) : null
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredSubfolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => navigateToFolder(folder.name)}
                      className="group relative flex cursor-pointer flex-col items-center justify-between rounded-xl border bg-card/60 p-4 text-center transition-all hover:border-primary/50 hover:bg-card hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {/* Top Action Menu */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition"
                      >
                        <button
                          onClick={() => setDeleteFolderTarget(folder)}
                          className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete Folder"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Folder Image Icon (pngwing.com.png) */}
                      <div className="relative h-20 w-20 transition-transform duration-200 group-hover:scale-110">
                        <Image
                          src="/pngwing.com.png"
                          alt={folder.name}
                          fill
                          sizes="80px"
                          className="object-contain drop-shadow-sm"
                        />
                      </div>

                      {/* Folder Details */}
                      <div className="mt-3 w-full">
                        <h4 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition" title={folder.name}>
                          {folder.name}
                        </h4>
                        <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                          {folder.subfolderCount ? (
                            <span>{folder.subfolderCount} subfolders</span>
                          ) : null}
                          {folder.subfolderCount && folder.fileCount ? <span>•</span> : null}
                          <span>{folder.fileCount || 0} files</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ================= 2. FILES IN THIS FOLDER SECTION ================= */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Files in this folder ({filteredFiles.length})
                </h3>
              </div>

              {filteredFiles.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center bg-card/20">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h4 className="font-semibold text-sm mt-2">No files here yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Import a CSV or configure a <span className="text-primary font-semibold">SaveFileNode</span> in the workflow editor with this folder path.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    className="mt-3 gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload CSV</span>
                  </Button>
                </div>
              ) : viewMode === "grid" ? (
                /* GRID VIEW FOR FILES */
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredFiles.map((file) => {
                    const rowCount = file.metadata?.rowCount ?? (Array.isArray(file.data?.data) ? file.data.data.length : null);
                    const colCount = file.metadata?.colCount ?? (Array.isArray(file.data?.columns) ? file.data.columns.length : (file.metadata?.columns?.length || null));

                    return (
                      <div
                        key={file.id}
                        className="group flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div>
                          {/* Top: File Badge */}
                          <div className="flex items-start justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase">
                              {file.fileType || "csv"}
                            </span>
                          </div>

                          {/* File Details */}
                          <div className="mt-3">
                            <h4 className="font-semibold text-sm truncate" title={file.name}>
                              {file.name}
                            </h4>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {rowCount !== null && <span>{rowCount} rows</span>}
                              {colCount !== null && (
                                <>
                                  <span>•</span>
                                  <span>{colCount} cols</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              title="Preview Data"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              title="Download CSV"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setMovingFile(file);
                                setTargetMovePath(currentPath);
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              title="Move File"
                            >
                              <FolderInput className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                              title="Delete File"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW FOR FILES */
                <div className="overflow-hidden rounded-xl border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">File Name</th>
                        <th className="px-4 py-3">Dimensions</th>
                        <th className="px-4 py-3">Last Modified</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredFiles.map((file) => {
                        const rowCount = file.metadata?.rowCount ?? (Array.isArray(file.data?.data) ? file.data.data.length : null);
                        const colCount = file.metadata?.colCount ?? (Array.isArray(file.data?.columns) ? file.data.columns.length : (file.metadata?.columns?.length || null));

                        return (
                          <tr key={file.id} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-xs">{file.name}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {rowCount !== null && `${rowCount} rows`}
                              {colCount !== null && ` × ${colCount} cols`}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(file.updatedAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                                  title="Preview File"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadFile(file)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                                  title="Download CSV"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setMovingFile(file);
                                    setTargetMovePath(currentPath);
                                  }}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                                  title="Move File"
                                >
                                  <FolderInput className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file.id, file.name)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                  title="Delete File"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ================= MODAL: CREATE NESTED FOLDER ================= */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="relative h-5 w-5">
                <Image src="/pngwing.com.png" alt="Folder" fill className="object-contain" />
              </div>
              <span>Create Folder</span>
            </DialogTitle>
            <DialogDescription>
              {currentPath ? (
                <>
                  Creating inside: <code className="text-primary font-mono">/{currentPath}</code>
                </>
              ) : (
                "Creating folder at root directory."
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFolder} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Folder Name</label>
              <Input
                type="text"
                placeholder="e.g. Attendance, Sem_1, Section_A"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="mt-1.5"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description (Optional)</label>
              <Input
                type="text"
                placeholder="Brief summary of contents"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderDialogOpen(false)}
                disabled={folderSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={folderSubmitting}>
                {folderSubmitting ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: DELETE FOLDER ================= */}
      <Dialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete folder &quot;{deleteFolderTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Path: <code className="font-mono text-foreground">/{deleteFolderTarget?.path}</code>
            </p>
            <p className="text-destructive font-medium">
              This will permanently delete this folder and all files and subfolders contained inside it.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteFolderTarget(null)}
              disabled={deletingFolder}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
            >
              {deletingFolder ? "Deleting..." : "Delete Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: MOVE FILE ================= */}
      <Dialog open={!!movingFile} onOpenChange={(open) => !open && setMovingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Select destination folder path for &quot;{movingFile?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Destination Folder</label>
            <select
              value={targetMovePath}
              onChange={(e) => setTargetMovePath(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">📁 Root / (Files)</option>
              {flatFolders.map((f) => (
                <option key={f.id} value={f.path}>
                  📁 /{f.path}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setMovingFile(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleMoveFile}>
              Move File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: FILE PREVIEW (SYNCFUSION SPREADSHEET) ================= */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              <span>{previewFile?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {parsedPreviewDataset?.data?.length || 0} rows • {parsedPreviewDataset?.columns?.length || 0} columns
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 border rounded-lg overflow-hidden w-full h-[64vh] min-h-[440px] mt-2 bg-background relative">
            {parsedPreviewDataset && parsedPreviewDataset.columns.length > 0 ? (
              <SpreadsheetComponent
                ref={previewSpreadsheetRef}
                created={onPreviewSpreadsheetCreated}
                className="w-full h-full"
                height="100%"
                width="100%"
                allowEditing={false}
                allowOpen={true}
                allowSave={false}
                showFormulaBar={true}
                showRibbon={false}
                sheets={[
                  {
                    name: (previewFile?.name || "Sheet1").replace(/\.[^/.]+$/, "").substring(0, 30),
                    showGridLines: true,
                  },
                ]}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="font-medium text-sm">No preview data available for this file.</p>
                <p className="text-xs text-muted-foreground mt-1">This file might be empty or in an unsupported format.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {parsedPreviewDataset ? `${parsedPreviewDataset.data.length} rows loaded into Syncfusion sheet preview` : ""}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => previewFile && handleDownloadFile(previewFile)}
                className="gap-1.5 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV</span>
              </Button>
              <Button onClick={() => setPreviewFile(null)} className="cursor-pointer">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
