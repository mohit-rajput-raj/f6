"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { Label } from "@repo/ui/components/ui/label";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import {
  Tree,
  Folder as TreeFolder,
  File as TreeFile,
} from "@repo/ui/components/ui/File-Tree";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Rows,
  Pencil,
  Check,
  X,
  FolderTree,
  FolderPlus,
  FolderOpen,
  FolderDown,
  Home,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { updateDataLibraryFile } from "../actions";
import { serializeDataset } from "../lib/dataset-helpers";
import {
  getAllFoldersFlat,
  createNestedFolder,
  createOrOverwriteWorkspaceFile,
  type WorkspaceFolderItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions";

interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  parentPath: string;
  children: FolderTreeNode[];
}

function buildFolderHierarchy(folders: WorkspaceFolderItem[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  const sorted = [...folders].sort((a, b) => a.path.localeCompare(b.path));

  sorted.forEach((f) => {
    const lastSlash = f.path.lastIndexOf("/");
    const parentPath = lastSlash !== -1 ? f.path.substring(0, lastSlash) : "";

    map.set(f.path, {
      id: f.id,
      name: f.name,
      path: f.path,
      parentPath,
      children: [],
    });
  });

  sorted.forEach((f) => {
    const node = map.get(f.path);
    if (!node) return;
    if (node.parentPath && map.has(node.parentPath)) {
      map.get(node.parentPath)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface DatasetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    description: string | null;
    metadata?: any;
  } | null;
  initialColumns: string[];
  initialRows: any[][];
  userId: string;
  dashid?: string;
  onSaved: () => void;
  onOpenAddWizard: () => void;
}

export const DatasetEditorModal: React.FC<DatasetEditorModalProps> = ({
  isOpen,
  onClose,
  file,
  initialColumns,
  initialRows,
  userId,
  dashid: propDashid,
  onSaved,
  onOpenAddWizard,
}) => {
  const params = useParams();
  const deskId = propDashid || (params?.dashid as string) || "";

  // Dataset Table State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState("");

  // Files integration state
  const [showFilesTree, setShowFilesTree] = useState(false);
  const [flatFolders, setFlatFolders] = useState<WorkspaceFolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [isSavingToFiles, setIsSavingToFiles] = useState(false);

  const folderTree = useMemo(() => buildFolderHierarchy(flatFolders), [flatFolders]);

  useEffect(() => {
    if (isOpen && file) {
      setName(file.name || "");
      setDescription(file.description || "");
      setColumns([...initialColumns]);
      setRows(initialRows.map((r) => [...r]));
      const defaultName = file.name || "dataset.csv";
      setSaveFileName(
        defaultName.toLowerCase().endsWith(".csv") ? defaultName : `${defaultName}.csv`
      );
      setShowFilesTree(false);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setSelectedFolderPath("");
    }
  }, [isOpen, file, initialColumns, initialRows]);

  const loadFolders = useCallback(async () => {
    if (!deskId) return;
    setIsLoadingFolders(true);
    try {
      const list = await getAllFoldersFlat(deskId);
      setFlatFolders(list);
    } catch (err) {
      console.error("Failed to load flat folders:", err);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [deskId]);

  useEffect(() => {
    if (showFilesTree && deskId) {
      loadFolders();
    }
  }, [showFilesTree, deskId, loadFolders]);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast.error("Please enter a folder name.");
      return;
    }
    if (!deskId || !userId) {
      toast.error("Missing project or user context.");
      return;
    }

    setIsSubmittingFolder(true);
    try {
      const created = await createNestedFolder({
        dashid: deskId,
        userId,
        parentPath: selectedFolderPath || "",
        name: trimmed,
      });

      toast.success(`Folder "${created.name}" created!`);
      await loadFolders();
      setSelectedFolderPath(created.path);
      setIsCreatingFolder(false);
      setNewFolderName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder.");
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const handleSaveToFiles = async () => {
    if (!deskId || !userId) {
      toast.error("Missing project or user context.");
      return;
    }
    let finalFileName = (saveFileName || name).trim();
    if (!finalFileName) {
      toast.error("Please enter a file name.");
      return;
    }
    if (
      !finalFileName.toLowerCase().endsWith(".csv") &&
      !finalFileName.toLowerCase().endsWith(".xlsx") &&
      !finalFileName.toLowerCase().endsWith(".json")
    ) {
      finalFileName = `${finalFileName}.csv`;
    }

    setIsSavingToFiles(true);
    try {
      const csvContent = Papa.unparse({
        fields: columns,
        data: rows,
      });

      await createOrOverwriteWorkspaceFile({
        dashid: deskId,
        userId,
        folderPath: selectedFolderPath.trim(),
        fileName: finalFileName,
        data: csvContent,
        fileType: "csv",
        metadata: {
          rowCount: rows.length,
          colCount: columns.length,
          source: "data-library",
          originalDataLibraryFileId: file?.id,
        },
      });

      toast.success(
        `File "${finalFileName}" successfully saved to Files in ${
          selectedFolderPath ? "/" + selectedFolderPath : "Root (/)"
        }!`
      );
    } catch (err: any) {
      console.error("Save to files error:", err);
      toast.error(err.message || "Failed to save file to Files");
    } finally {
      setIsSavingToFiles(false);
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const rowCopy = [...(copy[rowIndex] || [])];
      rowCopy[colIndex] = value;
      copy[rowIndex] = rowCopy;
      return copy;
    });
  };

  const handleAddRow = () => {
    const emptyRow = columns.map(() => "");
    setRows((prev) => [...prev, emptyRow]);
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (columns.length <= 1) {
      toast.error("Dataset must contain at least one column.");
      return;
    }
    const colName = columns[colIdx];
    if (!confirm(`Delete column "${colName}"?`)) return;

    setColumns((prev) => prev.filter((_, i) => i !== colIdx));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== colIdx)));
  };

  const handleRenameColumn = (colIdx: number) => {
    if (!editingColName.trim()) return;
    setColumns((prev) => {
      const copy = [...prev];
      copy[colIdx] = editingColName.trim();
      return copy;
    });
    setEditingColIdx(null);
    setEditingColName("");
  };

  const handleSave = async () => {
    if (!file?.id || !userId) return;
    if (!name.trim()) {
      toast.error("File name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const payload = serializeDataset(columns, rows);
      await updateDataLibraryFile(file.id, userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        data: payload,
        metadata: {
          ...(file.metadata || {}),
          rowCount: rows.length,
          colCount: columns.length,
        },
      });

      toast.success("Dataset saved successfully!");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save dataset");
    } finally {
      setIsSaving(false);
    }
  };

  const renderTreeNodes = (nodes: FolderTreeNode[]) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedFolderPath === node.path;

      return (
        <TreeFolder
          key={node.path}
          value={node.path}
          element={node.name}
          isSelect={isSelected}
          className="text-xs"
        >
          {hasChildren ? (
            renderTreeNodes(node.children)
          ) : (
            <TreeFile
              value={`${node.path}__empty`}
              isSelectable={false}
              className="py-0.5 px-2 text-[11px] text-muted-foreground italic flex items-center gap-1.5 opacity-70 cursor-default"
              fileIcon={<span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />}
            >
              (No subfolders)
            </TreeFile>
          )}
        </TreeFolder>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] max-w-[98vw] sm:w-[94vw] sm:max-w-[94vw] md:max-w-[90vw] lg:max-w-[88vw] xl:max-w-[85vw] h-[94vh] sm:h-[90vh] flex flex-col p-3 sm:p-5 gap-2.5 sm:gap-3 bg-card border shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex flex-col gap-2 pb-2.5 sm:pb-3 border-b pr-8 sm:pr-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xs sm:text-base font-semibold flex items-center gap-1.5 text-foreground truncate">
                <Pencil className="size-3.5 sm:size-4 text-primary shrink-0" />
                <span className="truncate">Edit: {file?.name || "Dataset"}</span>
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Modify cells, rename/delete columns, or add new rows
              </DialogDescription>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <Button
                type="button"
                variant={showFilesTree ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilesTree((prev) => !prev)}
                className={`h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-2.5 cursor-pointer gap-1 transition-all ${
                  showFilesTree
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    : "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/40 text-foreground"
                }`}
                title={showFilesTree ? "Hide Files tree" : "Save copy in workspace Files"}
              >
                <FolderTree className="size-3 text-amber-500 shrink-0" />
                <span>Save in Files</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAddWizard();
                }}
                className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-2.5 cursor-pointer gap-1"
              >
                <Plus className="size-3 text-primary" />
                <span className="hidden sm:inline">Add Wizard</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 sm:px-3 cursor-pointer bg-primary text-primary-foreground gap-1"
              >
                {isSaving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
                <span>Save</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body - Two column layout when showFilesTree is active */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-hidden">
          {/* Left Folder Tree Panel (Appears when clicking 'Save in Files') */}
          {showFilesTree && (
            <aside className="w-full md:w-80 shrink-0 border border-border/80 rounded-lg bg-muted/20 backdrop-blur-xs flex flex-col p-2.5 sm:p-3 gap-2 overflow-hidden shadow-xs animate-in slide-in-from-left-2 duration-200">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/70 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderTree className="size-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      Save in Files
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Select destination folder
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={loadFolders}
                    disabled={isLoadingFolders}
                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Refresh folders"
                  >
                    <RefreshCw className={`size-3 ${isLoadingFolders ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFilesTree(false)}
                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Close tree panel"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Target Folder Badge */}
              <div className="rounded-md border border-border/80 bg-background/60 p-2 flex items-center justify-between gap-1.5 shrink-0 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                    Target:
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] bg-background truncate max-w-[140px]"
                    title={selectedFolderPath || "Root Workspace (/)"}
                  >
                    {selectedFolderPath ? `/${selectedFolderPath}` : "/ (Root)"}
                  </Badge>
                </div>
                {selectedFolderPath && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFolderPath("")}
                    className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                  >
                    Reset Root
                  </Button>
                )}
              </div>

              {/* Inline Create Folder Section */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <Label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <FolderTree className="size-3.5 text-primary" />
                    <span>Workspace Folders</span>
                  </Label>
                  {!isCreatingFolder ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setNewFolderName("");
                      }}
                      className="h-5.5 px-1.5 text-[10px] text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="size-3" />
                      <span>+ New Folder</span>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Creating...</span>
                  )}
                </div>

                {isCreatingFolder && (
                  <div className="p-2 rounded-md border border-primary/30 bg-primary/5 space-y-1.5 text-xs animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between text-[10px] text-foreground">
                      <span className="text-muted-foreground">Inside:</span>
                      <code className="bg-background px-1 py-0.5 rounded text-[10px] text-primary font-mono border border-border truncate max-w-[170px]">
                        {selectedFolderPath ? `/${selectedFolderPath}` : "Root (/)"}
                      </code>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        placeholder="Folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateFolder();
                          } else if (e.key === "Escape") {
                            setIsCreatingFolder(false);
                            setNewFolderName("");
                          }
                        }}
                        disabled={isSubmittingFolder}
                        className="h-6.5 text-[11px] bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateFolder}
                        disabled={isSubmittingFolder || !newFolderName.trim()}
                        className="h-6.5 px-2 text-[10px] shrink-0 cursor-pointer"
                      >
                        {isSubmittingFolder ? (
                          <RefreshCw className="size-2.5 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        <span className="ml-0.5">Add</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }}
                        disabled={isSubmittingFolder}
                        className="h-6.5 px-1 text-xs shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tree Scroll Area */}
              <div className="flex-1 min-h-[140px] border border-border/80 rounded-md bg-background/50 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 p-2">
                  {isLoadingFolders ? (
                    <div className="flex items-center justify-center h-28 text-xs text-muted-foreground gap-2">
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Loading folders...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Root Workspace Row */}
                      <button
                        type="button"
                        onClick={() => setSelectedFolderPath("")}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors cursor-pointer ${
                          selectedFolderPath === ""
                            ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                            : "hover:bg-muted/70 text-foreground"
                        }`}
                      >
                        <Home className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">Root Workspace (/)</span>
                      </button>

                      {/* Nested Folder Tree */}
                      {folderTree.length > 0 ? (
                        <div className="pt-0.5 pl-0.5">
                          <Tree
                            onSelectChange={(path) => setSelectedFolderPath(path)}
                            selectedId={selectedFolderPath}
                            className="text-xs"
                          >
                            {renderTreeNodes(folderTree)}
                          </Tree>
                        </div>
                      ) : (
                        <div className="py-3 px-2 text-center text-xs text-muted-foreground">
                          <p className="text-[11px]">No subfolders created yet.</p>
                          <p className="text-[10px] opacity-70 mt-0.5">
                            Click &quot;+ New Folder&quot; above to create one.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Destination File Name & Save to Files Action */}
              <div className="pt-2 border-t border-border/70 space-y-1.5 shrink-0">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">
                    Save As File Name
                  </Label>
                  <Input
                    value={saveFileName}
                    onChange={(e) => setSaveFileName(e.target.value)}
                    placeholder="dataset.csv"
                    className="h-7 text-xs font-mono bg-background"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveToFiles}
                  disabled={isSavingToFiles || !saveFileName.trim()}
                  className="w-full h-7.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isSavingToFiles ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <FolderDown className="size-3.5" />
                  )}
                  <span className="truncate">
                    Save into {selectedFolderPath ? `/${selectedFolderPath}` : "Root (/)"}
                  </span>
                </Button>
              </div>
            </aside>
          )}

          {/* Main Content: Metadata Inputs & Interactive Data Table */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* File Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/20 p-2 sm:p-2.5 rounded-lg border shrink-0">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-semibold text-foreground">Dataset Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Filename..."
                  className="h-7.5 text-xs bg-background"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px] font-semibold text-foreground">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="h-7.5 text-xs bg-background"
                />
              </div>
            </div>

            {/* Table Toolbar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 px-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                  {rows.length} rows × {columns.length} cols
                </Badge>
                <span className="text-[10px] sm:text-[11px] hidden xs:inline">
                  Tap any cell to edit
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-6.5 sm:h-7 text-[10px] sm:text-xs px-2 cursor-pointer gap-1"
              >
                <Rows className="size-3 text-primary" />
                <span>+ Add Row</span>
              </Button>
            </div>

            {/* Interactive Data Table with visible edit/delete on touch devices */}
            <div className="flex-1 overflow-auto border rounded-lg bg-card w-full relative">
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted z-20 shadow-xs">
                    <tr className="border-b border-border/80">
                      <th className="sticky left-0 z-30 w-10 min-w-10 max-w-10 text-center py-2 px-1 text-muted-foreground font-mono border-r border-border/80 bg-muted text-[10px] shadow-[1px_0_0_0_var(--border)]">
                        #
                      </th>
                      {columns.map((col, colIdx) => (
                        <th
                          key={colIdx}
                          className="py-2 px-2.5 text-left font-semibold text-foreground border-r border-border/80 group min-w-[120px] max-w-[240px] bg-muted text-[11px]"
                        >
                          {editingColIdx === colIdx ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingColName}
                                onChange={(e) => setEditingColName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameColumn(colIdx);
                                  if (e.key === "Escape") setEditingColIdx(null);
                                }}
                                autoFocus
                                className="h-6 text-xs px-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameColumn(colIdx)}
                                className="p-1 hover:text-primary cursor-pointer"
                              >
                                <Check className="size-3 text-emerald-400" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="truncate cursor-pointer"
                                title="Click to rename"
                                onClick={() => {
                                  setEditingColIdx(colIdx);
                                  setEditingColName(col);
                                }}
                              >
                                {col || `Col ${colIdx + 1}`}
                              </span>
                              {/* Visible on mobile/tablet (opacity-100), hover on desktop */}
                              <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingColIdx(colIdx);
                                    setEditingColName(col);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-muted"
                                  title="Rename column"
                                >
                                  <Pencil className="size-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColumn(colIdx)}
                                  className="p-1 text-muted-foreground hover:text-destructive cursor-pointer rounded hover:bg-muted"
                                  title="Delete column"
                                >
                                  <Trash2 className="size-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="w-10 min-w-10 text-center py-2 px-1 font-medium text-muted-foreground text-[10px]">
                        Del
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-card">
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="sticky left-0 z-10 w-10 min-w-10 max-w-10 text-center py-1 px-1 font-mono text-[10px] text-muted-foreground bg-card border-r border-border/80 shadow-[1px_0_0_0_var(--border)] group-hover:bg-muted/60">
                          {rowIdx + 1}
                        </td>
                        {columns.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-0.5 border-r border-border/60 min-w-[120px] max-w-[240px]"
                          >
                            <input
                              type="text"
                              value={row[colIdx] ?? ""}
                              onChange={(e) =>
                                handleCellChange(rowIdx, colIdx, e.target.value)
                              }
                              className="w-full bg-transparent px-2 py-1 rounded text-xs text-foreground focus:bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                            />
                          </td>
                        ))}
                        <td className="text-center p-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(rowIdx)}
                            className="p-1 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer rounded"
                            title="Delete row"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
