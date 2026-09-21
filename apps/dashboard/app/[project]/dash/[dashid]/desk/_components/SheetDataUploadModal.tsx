"use client";
import { Files, Library, HardDriveUpload } from "lucide-react";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  FolderTree,
  Database,
  Upload,
  ArrowLeft,
  Search,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Loader2,
  Folder,
  FolderOpen,
  Table2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import {
  getAllFoldersFlat,
  getAllWorkspaceFiles,
  getWorkspaceFileData,
  type WorkspaceFolderItem,
  type WorkspaceFileItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions";
import {
  getDataLibraryFiles,
  getDataLibraryFile,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/actions";
import { type Dataset } from "@/stores/desk-store";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface SheetDataUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashid: string;
  userId?: string;
  sheetName: string;
  onSelectDataset: (dataset: Dataset, sourceName: string) => void;
}

type Step = "source" | "files" | "data-library";

function normalizeDataset(raw: any): Dataset | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      // try CSV parse if it's a string
      const parsed = Papa.parse(raw, { header: false, skipEmptyLines: true });
      const rows = (parsed.data as string[][]) || [];
      if (rows.length > 0) {
        const columns = rows[0].map((c, i) =>
          c?.trim() ? c.trim() : `Column_${i + 1}`,
        );
        return { columns, data: rows.slice(1) };
      }
      return null;
    }
  }

  // Format 1: { columns: string[], data: any[][] }
  if (raw.columns && Array.isArray(raw.data)) {
    return {
      columns: raw.columns.map((c: any) => String(c)),
      data: raw.data,
    };
  }

  // Format 2: Array of objects [{ col1: val1, col2: val2 }]
  if (Array.isArray(raw) && raw.length > 0) {
    if (typeof raw[0] === "object" && !Array.isArray(raw[0])) {
      const columns = Object.keys(raw[0]);
      const data = raw.map((item: any) =>
        columns.map((col) => item[col] ?? ""),
      );
      return { columns, data };
    }
    // Format 3: Array of arrays [[col1, col2], [val1, val2]]
    if (Array.isArray(raw[0])) {
      const columns = raw[0].map((c: any) => String(c));
      const data = raw.slice(1);
      return { columns, data };
    }
  }

  return null;
}

export function SheetDataUploadModal({
  open,
  onOpenChange,
  dashid,
  userId,
  sheetName,
  onSelectDataset,
}: SheetDataUploadModalProps) {
  const [step, setStep] = useState<Step>("source");
  const browserFileInputRef = useRef<HTMLInputElement>(null);

  // Files view states
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [folders, setFolders] = useState<WorkspaceFolderItem[]>([]);
  const [allFiles, setAllFiles] = useState<WorkspaceFileItem[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [selectedWorkspaceFile, setSelectedWorkspaceFile] =
    useState<WorkspaceFileItem | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [isImportingFile, setIsImportingFile] = useState(false);

  // Data Library view states
  const [loadingDataLibrary, setLoadingDataLibrary] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<any | null>(
    null,
  );
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [isImportingLibrary, setIsImportingLibrary] = useState(false);

  // Reset step whenever modal opens
  useEffect(() => {
    if (open) {
      setStep("source");
      setSelectedWorkspaceFile(null);
      setSelectedLibraryFile(null);
      setFileSearchQuery("");
      setLibrarySearchQuery("");
      setSelectedFolderPath("");
    }
  }, [open]);

  // Load Workspace Files and Folders
  const loadWorkspaceData = useCallback(async () => {
    if (!dashid) return;
    setLoadingFiles(true);
    try {
      const [foldersList, filesList] = await Promise.all([
        getAllFoldersFlat(dashid),
        getAllWorkspaceFiles(dashid),
      ]);
      setFolders(foldersList);
      setAllFiles(filesList);
    } catch (err) {
      console.error("Failed to load workspace files:", err);
      toast.error("Failed to load workspace folders and files");
    } finally {
      setLoadingFiles(false);
    }
  }, [dashid]);

  // Load Data Library Files
  const loadLibraryData = useCallback(async () => {
    if (!dashid) return;
    setLoadingDataLibrary(true);
    try {
      const list = await getDataLibraryFiles(dashid, userId);
      setLibraryFiles(list);
    } catch (err) {
      console.error("Failed to load data library:", err);
      toast.error("Failed to load Data Library files");
    } finally {
      setLoadingDataLibrary(false);
    }
  }, [dashid, userId]);

  // Handle switching to Files
  const handleSelectFilesSource = () => {
    setStep("files");
    loadWorkspaceData();
  };

  // Handle switching to Data Library
  const handleSelectLibrarySource = () => {
    setStep("data-library");
    loadLibraryData();
  };

  // Handle Local Browser File Upload Trigger
  const handleSelectBrowserSource = () => {
    if (browserFileInputRef.current) {
      browserFileInputRef.current.value = "";
      browserFileInputRef.current.click();
    }
  };

  // Handle Local Browser File Upload Processing
  const handleBrowserFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    try {
      if (extension === "xlsx" || extension === "xls") {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const buffer = evt.target?.result;
            const workbook = XLSX.read(buffer, { type: "binary" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
            }) as any[][];

            if (jsonData.length === 0) {
              toast.error("Excel sheet is empty");
              return;
            }

            const columns = (jsonData[0] || []).map((col: any) =>
              String(col ?? "").trim(),
            );
            const data = jsonData.slice(1);
            onSelectDataset({ columns, data }, file.name);
            onOpenChange(false);
          } catch (err) {
            console.error("Excel parse error:", err);
            toast.error("Failed to parse Excel file");
          }
        };
        reader.readAsBinaryString(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result as string;
            const parsed = Papa.parse(text, {
              header: false,
              skipEmptyLines: true,
            });
            const rows = (parsed.data as string[][]) || [];
            if (rows.length === 0) {
              toast.error("CSV file is empty");
              return;
            }
            const columns = rows[0].map((c, i) =>
              c?.trim() ? c.trim() : `Column_${i + 1}`,
            );
            const data = rows.slice(1);
            onSelectDataset({ columns, data }, file.name);
            onOpenChange(false);
          } catch (err) {
            console.error("CSV parse error:", err);
            toast.error("Failed to parse CSV file");
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("File read error:", err);
      toast.error("Failed to read file from browser");
    }
  };

  // Confirm Import from Workspace File
  const handleConfirmWorkspaceFile = async (
    fileToImport?: WorkspaceFileItem,
  ) => {
    const targetFile = fileToImport || selectedWorkspaceFile;
    if (!targetFile) {
      toast.error("Please select a file to import");
      return;
    }

    setIsImportingFile(true);
    try {
      let fileData = targetFile.data;
      if (!fileData) {
        const full = await getWorkspaceFileData(targetFile.id);
        fileData = full?.data;
      }

      const dataset = normalizeDataset(fileData);
      if (!dataset || dataset.columns.length === 0) {
        toast.error(`Could not extract table data from "${targetFile.name}"`);
        return;
      }

      onSelectDataset(dataset, targetFile.name);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Workspace file import error:", err);
      toast.error(err.message || "Failed to load file dataset");
    } finally {
      setIsImportingFile(false);
    }
  };

  // Confirm Import from Data Library
  const handleConfirmLibraryFile = async (itemToImport?: any) => {
    const targetItem = itemToImport || selectedLibraryFile;
    if (!targetItem) {
      toast.error("Please select a library dataset to import");
      return;
    }

    setIsImportingLibrary(true);
    try {
      let rawData = targetItem.data;
      if (!rawData) {
        const full = await getDataLibraryFile(targetItem.id, userId);
        rawData = full?.data;
      }

      const dataset = normalizeDataset(rawData);
      if (!dataset || dataset.columns.length === 0) {
        toast.error(`Could not extract dataset from "${targetItem.name}"`);
        return;
      }

      onSelectDataset(dataset, targetItem.name);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Library dataset import error:", err);
      toast.error(err.message || "Failed to load library dataset");
    } finally {
      setIsImportingLibrary(false);
    }
  };

  // Filtered files in the Workspace Files view
  const visibleWorkspaceFiles = useMemo(() => {
    let list = allFiles;
    if (fileSearchQuery.trim()) {
      const q = fileSearchQuery.toLowerCase().trim();
      return list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.folderPath.toLowerCase().includes(q),
      );
    }
    return list.filter((f) => f.folderPath === selectedFolderPath);
  }, [allFiles, selectedFolderPath, fileSearchQuery]);

  // Filtered Data Library files
  const visibleLibraryFiles = useMemo(() => {
    if (!librarySearchQuery.trim()) return libraryFiles;
    const q = librarySearchQuery.toLowerCase().trim();
    return libraryFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.fileType && f.fileType.toLowerCase().includes(q)),
    );
  }, [libraryFiles, librarySearchQuery]);

  return (
    <>
      {/* Hidden browser file input for option 3 */}
      <input
        ref={browserFileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        className="hidden"
        onChange={handleBrowserFileChange}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            step === "source"
              ? "sm:max-w-md p-6 bg-card border-border shadow-2xl text-foreground"
              : "sm:max-w-2xl max-h-[85vh] h-[640px] p-0 flex flex-col bg-card border-border shadow-2xl text-foreground overflow-hidden"
          }
        >
          {/* ─── STEP 1: Source Selection ─────────────────────────── */}
          {step === "source" && (
            <div className="space-y-5">
              <DialogHeader className="text-left space-y-1.5">
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted text-primary border border-border/50">
                    <Table2 className="size-4" />
                  </div>
                  <span>Import Data to Sheet</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Choose where to import data for{" "}
                  <span className="text-foreground font-medium">
                    "{sheetName}"
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 pt-1">
                {/* Option 1: Workspace Files */}
                <button
                  type="button"
                  onClick={handleSelectFilesSource}
                  className="w-full text-left p-3.5 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-foreground/20 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-muted text-foreground border border-border/50 shrink-0 group-hover:bg-background transition-colors">
                      <Files className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Workspace Files
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-medium text-muted-foreground border-border/80"
                        >
                          Workspace
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select a file from your project folders using the
                        FileTree
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Option 2: Data Library */}
                <button
                  type="button"
                  onClick={handleSelectLibrarySource}
                  className="w-full text-left p-3.5 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-foreground/20 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-muted text-foreground border border-border/50 shrink-0 group-hover:bg-background transition-colors">
                      <Library className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Data Library
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground border-border/80"
                        >
                          Library
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Import an OCR table scan or saved dataset from your
                        library
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Option 3: Browser / Local Device */}
                <button
                  type="button"
                  onClick={handleSelectBrowserSource}
                  className="w-full text-left p-3.5 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-foreground/20 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-muted text-foreground border border-border/50 shrink-0 group-hover:bg-background transition-colors">
                      <HardDriveUpload className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Local Device
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground border-border/80"
                        >
                          Upload
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Upload a CSV or Excel (.xlsx) file directly from your
                        computer
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Workspace Files Picker ───────────────────── */}
          {step === "files" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Fixed Header */}
              <div className="px-6 pt-5 pb-3 border-b border-border space-y-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("source")}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <DialogHeader className="text-left space-y-0.5 p-0">
                    <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FolderTree className="size-4 text-primary" />
                      <span>Workspace Files</span>
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                      Browse folders or search to select a file to drop into{" "}
                      <span className="font-medium text-foreground">
                        {sheetName}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search workspace files by name..."
                    className="pl-8 h-8 text-xs bg-muted/20"
                  />
                </div>
              </div>

              {/* Main Content Area: Left Folder Tree + Right File List */}
              {loadingFiles ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading workspace files...</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-3 overflow-hidden">
                  {/* Left Column: Folder Navigation */}
                  <div className="col-span-4 rounded-lg border border-border/80 bg-muted/10 flex flex-col overflow-hidden">
                    <div className="px-2.5 py-1.5 border-b border-border/60 text-[11px] font-medium text-muted-foreground flex items-center justify-between shrink-0">
                      <span>Folders</span>
                      <span className="text-[10px] font-mono">
                        {folders.length}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
                      {/* Root folder item */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFolderPath("");
                          setFileSearchQuery("");
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          selectedFolderPath === "" && !fileSearchQuery
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <Folder className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">Root (/)</span>
                      </button>

                      {/* Flat folders list */}
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => {
                            setSelectedFolderPath(folder.path);
                            setFileSearchQuery("");
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between gap-1 transition cursor-pointer ${
                            selectedFolderPath === folder.path &&
                            !fileSearchQuery
                              ? "bg-primary/10 text-primary font-medium border border-primary/20"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Folder className="size-3.5 text-primary/80 shrink-0" />
                            <span className="truncate font-mono text-[11px]">
                              /{folder.path}
                            </span>
                          </div>
                          {folder.fileCount !== undefined &&
                            folder.fileCount > 0 && (
                              <span className="text-[9px] px-1 rounded bg-background border border-border/60 text-muted-foreground shrink-0">
                                {folder.fileCount}
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Files List */}
                  <div className="col-span-8 rounded-lg border border-border/80 bg-muted/10 flex flex-col overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-border/60 text-[11px] font-medium text-muted-foreground flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5 truncate font-mono text-[10px]">
                        <FolderOpen className="size-3 text-primary shrink-0" />
                        <span>
                          {fileSearchQuery
                            ? `Search results for "${fileSearchQuery}"`
                            : selectedFolderPath
                              ? `/${selectedFolderPath}`
                              : "/ (Root)"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {visibleWorkspaceFiles.length} file
                        {visibleWorkspaceFiles.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                      {visibleWorkspaceFiles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-1.5">
                          <FileSpreadsheet className="size-8 opacity-30 text-muted-foreground" />
                          <p className="text-xs font-medium">
                            No files found in this folder
                          </p>
                          <p className="text-[11px] text-muted-foreground/70">
                            Upload a file or choose another folder from the left
                            pane.
                          </p>
                        </div>
                      ) : (
                        visibleWorkspaceFiles.map((file) => {
                          const isSelected =
                            selectedWorkspaceFile?.id === file.id;
                          const rowCount = (file.metadata as any)?.rowCount;
                          const colCount = (file.metadata as any)?.colCount;

                          return (
                            <div
                              key={file.id}
                              onClick={() => setSelectedWorkspaceFile(file)}
                              onDoubleClick={() =>
                                handleConfirmWorkspaceFile(file)
                              }
                              className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "bg-primary/5 border-primary/50 text-foreground shadow-2xs"
                                  : "bg-card/70 border-border/60 hover:bg-muted/40 hover:border-foreground/20 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`p-1.5 rounded-md shrink-0 border ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted text-primary border-border/50"
                                  }`}
                                >
                                  <FileSpreadsheet className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="text-xs font-medium truncate"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 uppercase font-mono border-border/70 text-muted-foreground"
                                    >
                                      {file.fileType || "csv"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                    {file.folderPath && (
                                      <span className="font-mono truncate max-w-[120px]">
                                        /{file.folderPath}
                                      </span>
                                    )}
                                    {rowCount !== undefined && (
                                      <span>• {rowCount} rows</span>
                                    )}
                                    {colCount !== undefined && (
                                      <span>• {colCount} cols</span>
                                    )}
                                    <span>
                                      •{" "}
                                      {new Date(
                                        file.updatedAt || file.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center">
                                {isSelected ? (
                                  <Check className="size-4 text-primary" />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    Select
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar (Pinned) */}
              <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
                <div className="text-xs text-muted-foreground truncate max-w-sm">
                  {selectedWorkspaceFile ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        Selected:
                      </span>
                      <span className="font-mono text-primary truncate">
                        {selectedWorkspaceFile.name}
                      </span>
                    </span>
                  ) : (
                    <span>Click a file or double-click to load</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("source")}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedWorkspaceFile || isImportingFile}
                    onClick={() => handleConfirmWorkspaceFile()}
                    className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
                  >
                    {isImportingFile ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5" />
                        <span>Drop to Sheet</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Data Library Picker ─────────────────────── */}
          {step === "data-library" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Fixed Header */}
              <div className="px-6 pt-5 pb-3 border-b border-border space-y-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("source")}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <DialogHeader className="text-left space-y-0.5 p-0">
                    <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Database className="size-4 text-primary" />
                      <span>Data Library Datasets</span>
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                      Choose a saved dataset or table scan to load into{" "}
                      <span className="font-medium text-foreground">
                        {sheetName}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder="Search datasets in library..."
                    className="pl-8 h-8 text-xs bg-muted/20"
                  />
                </div>
              </div>

              {/* Scrollable Content List */}
              {loadingDataLibrary ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading library datasets...</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3 space-y-2">
                  {visibleLibraryFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-1.5">
                      <FileSpreadsheet className="size-8 opacity-30 text-muted-foreground" />
                      <p className="text-xs font-medium">
                        No datasets found in Data Library
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Scan tables via Vision OCR or upload files in the Data
                        Library page.
                      </p>
                    </div>
                  ) : (
                    visibleLibraryFiles.map((item) => {
                      const isSelected = selectedLibraryFile?.id === item.id;
                      const rowCount = (item.metadata as any)?.rowCount;
                      const colCount = (item.metadata as any)?.colCount;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLibraryFile(item)}
                          onDoubleClick={() => handleConfirmLibraryFile(item)}
                          className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-primary/5 border-primary/50 text-foreground shadow-2xs"
                              : "bg-card/70 border-border/70 hover:bg-muted/30 hover:border-foreground/20 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2.5 rounded-lg shrink-0 border ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/60 text-primary border-border/50 group-hover:border-foreground/20"
                              }`}
                            >
                              <FileSpreadsheet className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs font-semibold truncate"
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 uppercase font-mono border-border/70 text-muted-foreground font-normal"
                                >
                                  {item.fileType || "json"}
                                </Badge>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-md">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                {rowCount !== undefined && (
                                  <span>{rowCount} rows</span>
                                )}
                                {rowCount !== undefined &&
                                  colCount !== undefined && <span>•</span>}
                                {colCount !== undefined && (
                                  <span>{colCount} cols</span>
                                )}
                                <span>
                                  •{" "}
                                  {new Date(
                                    item.updatedAt || item.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isSelected ? (
                              <Check className="size-4 text-primary" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                Select
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Bottom Actions Bar (Pinned) */}
              <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
                <div className="text-xs text-muted-foreground truncate max-w-sm">
                  {selectedLibraryFile ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        Selected:
                      </span>
                      <span className="font-mono text-primary truncate">
                        {selectedLibraryFile.name}
                      </span>
                    </span>
                  ) : (
                    <span>Click a dataset or double-click to load</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("source")}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedLibraryFile || isImportingLibrary}
                    onClick={() => handleConfirmLibraryFile()}
                    className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
                  >
                    {isImportingLibrary ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5" />
                        <span>Drop to Sheet</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SheetDataUploadModal;
