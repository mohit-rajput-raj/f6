"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDataset } from "../dataset-context";
import { CellDatePicker } from "../../components/cell-date-picker";
import { CellImageUploader } from "../../components/cell-image-uploader";
import { getColumnType } from "../../lib/dataset-helpers";
import {
  getAllFoldersFlat,
  createNestedFolder,
  createOrOverwriteWorkspaceFile,
  type WorkspaceFolderItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions";
import {
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  FolderTree,
  FolderPlus,
  FolderOpen,
  FolderDown,
  Loader2,
  FileSpreadsheet,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/ui/popover";
import { toast } from "sonner";
import Link from "next/link";
import Papa from "papaparse";

export default function DatasetEditPage() {
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
    saveDataset,
    addColumn,
    deleteColumn,
    renameColumn,
    deleteRow,
    appendRow,
    updateCell,
    updateMetadata,
  } = useDataset();

  // Local editable dataset state
  const [localName, setLocalName] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localColumns, setLocalColumns] = useState<string[]>([]);
  const [localRows, setLocalRows] = useState<any[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Column renaming state
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState("");

  // New column modal / input
  const [newColName, setNewColName] = useState("");
  const [showAddColInput, setShowAddColInput] = useState(false);

  // Active cell popover for image or date
  const [activeCellEdit, setActiveCellEdit] = useState<{
    rowIdx: number;
    colIdx: number;
    type: "image" | "date" | "text";
  } | null>(null);

  // Image lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Save to Workspace Files integration state
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [flatFolders, setFlatFolders] = useState<WorkspaceFolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [saveFileName, setSaveFileName] = useState("");
  const [isSavingToFiles, setIsSavingToFiles] = useState(false);

  // Column types metadata map
  const [localColumnTypes, setLocalColumnTypes] = useState<Record<string, string>>({});

  // Sync from context when file loads
  useEffect(() => {
    if (file) {
      setLocalName(file.name || "");
      setLocalDesc(file.description || "");
      setLocalColumns([...columns]);
      setLocalRows(rows.map((r) => [...r]));
      setLocalColumnTypes({ ...(file.metadata?.columnTypes || {}) });
      setSaveFileName(
        file.name.toLowerCase().endsWith(".csv") ? file.name : `${file.name}.csv`
      );
      setHasChanges(false);
    }
  }, [file, columns, rows]);

  // Load flat folders from files workspace
  const loadWorkspaceFolders = useCallback(async () => {
    if (!dashid) return;
    setIsLoadingFolders(true);
    try {
      const list = await getAllFoldersFlat(dashid);
      setFlatFolders(list);
    } catch (err) {
      console.error("Failed to load workspace folders:", err);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [dashid]);

  useEffect(() => {
    if (showFilesDialog) {
      loadWorkspaceFolders();
    }
  }, [showFilesDialog, loadWorkspaceFolders]);

  // Filter rows based on search term
  const filteredRowIndices = useMemo(() => {
    if (!searchTerm.trim()) {
      return localRows.map((_, idx) => idx);
    }
    const q = searchTerm.toLowerCase();
    const result: number[] = [];
    localRows.forEach((row, idx) => {
      const rowMatches = row.some((cell) =>
        String(cell ?? "").toLowerCase().includes(q)
      );
      if (rowMatches) result.push(idx);
    });
    return result;
  }, [localRows, searchTerm]);

  // Check for empty duplicate columns
  const duplicateEmptyColIndices = useMemo(() => {
    const seen: Record<string, number> = {};
    const toRemove: { index: number; name: string }[] = [];

    localColumns.forEach((col, idx) => {
      const lower = col.toLowerCase().trim();
      if (seen[lower] !== undefined) {
        // We have a duplicate! Check which one is empty
        const firstIdx = seen[lower];
        const firstIsEmpty = localRows.every((r) => !String(r[firstIdx] ?? "").trim());
        const currentIsEmpty = localRows.every((r) => !String(r[idx] ?? "").trim());

        if (currentIsEmpty && !firstIsEmpty) {
          toRemove.push({ index: idx, name: col });
        } else if (firstIsEmpty && !currentIsEmpty) {
          toRemove.push({ index: firstIdx, name: localColumns[firstIdx] });
        }
      } else {
        seen[lower] = idx;
      }
    });

    return toRemove;
  }, [localColumns, localRows]);

  // Handle inline cell change
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setLocalRows((prev) => {
      const next = prev.map((r, rI) => {
        if (rI !== rowIndex) return r;
        const copy = [...r];
        copy[colIndex] = value;
        return copy;
      });
      return next;
    });
    setHasChanges(true);
  };

  // Add empty row
  const handleAddEmptyRow = () => {
    const emptyRow = localColumns.map(() => "");
    setLocalRows((prev) => [...prev, emptyRow]);
    setHasChanges(true);
  };

  // Delete row locally
  const handleDeleteRowLocal = (rowIndex: number) => {
    setLocalRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setHasChanges(true);
  };

  // Add column locally
  const handleAddColumnLocal = () => {
    const trimmed = newColName.trim();
    if (!trimmed) return;
    if (localColumns.includes(trimmed)) {
      toast.error(`Column "${trimmed}" already exists`);
      return;
    }
    setLocalColumns((prev) => [...prev, trimmed]);
    setLocalRows((prev) => prev.map((r) => [...r, ""]));
    setNewColName("");
    setShowAddColInput(false);
    setHasChanges(true);
  };

  // Delete column locally
  const handleDeleteColumnLocal = (colIndex: number) => {
    const colName = localColumns[colIndex];
    if (!confirm(`Delete column "${colName}" from dataset?`)) return;
    const remainingColumns = localColumns.filter((_, idx) => idx !== colIndex);
    setLocalColumns(remainingColumns);
    setLocalRows((prev) => prev.map((r) => r.filter((_, idx) => idx !== colIndex)));
    if (!remainingColumns.includes(colName)) {
      setLocalColumnTypes((prev) => {
        const next = { ...prev };
        delete next[colName];
        return next;
      });
    }
    setHasChanges(true);
  };

  // Rename column locally
  const handleApplyRenameCol = (colIndex: number) => {
    const trimmed = editingColName.trim();
    if (!trimmed) {
      setEditingColIdx(null);
      return;
    }
    setLocalColumns((prev) => {
      const next = [...prev];
      next[colIndex] = trimmed;
      return next;
    });
    setEditingColIdx(null);
    setHasChanges(true);
  };

  // Change column type format
  const handleSetColumnType = (colName: string, type: string) => {
    setLocalColumnTypes((prev) => ({ ...prev, [colName]: type }));
    setHasChanges(true);
    toast.success(`Set "${colName}" format to ${type}. Click Save to persist.`);
  };

  // Save all changes to Data Library DB
  const handleSaveAll = async () => {
    try {
      if (file && (localName !== file.name || localDesc !== (file.description || ""))) {
        await updateMetadata(localName, localDesc);
      }
      await saveDataset(localColumns, localRows, { columnTypes: localColumnTypes });
      setHasChanges(false);
    } catch {
      // error handled in context
    }
  };

  // Save to Workspace Files
  const handleSaveToFiles = async () => {
    if (!dashid || !userId) {
      toast.error("Missing desk or user context");
      return;
    }
    let finalFileName = saveFileName.trim() || "dataset.csv";
    if (!finalFileName.toLowerCase().endsWith(".csv")) {
      finalFileName += ".csv";
    }

    setIsSavingToFiles(true);
    try {
      const csvData = Papa.unparse({
        fields: localColumns,
        data: localRows,
      });

      await createOrOverwriteWorkspaceFile({
        dashid,
        userId,
        folderPath: selectedFolderPath,
        fileName: finalFileName,
        fileType: "csv",
        data: csvData,
        metadata: {
          rowCount: localRows.length,
          colCount: localColumns.length,
          source: "data_library_export",
          originalFileId: id,
        },
      });

      toast.success(
        `Saved "${finalFileName}" to folder "${selectedFolderPath || "Root"}"`
      );
      setShowFilesDialog(false);
    } catch (err: any) {
      console.error("Save to files error:", err);
      toast.error(err?.message || "Failed to save file to workspace");
    } finally {
      setIsSavingToFiles(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card: Title, Description, and Save Bar */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex-1 space-y-1 min-w-0">
            <Input
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Dataset Name..."
              className="font-bold text-base sm:text-lg h-9 bg-background border-zinc-200 dark:border-zinc-800 w-full max-w-md"
            />
            <Input
              value={localDesc}
              onChange={(e) => {
                setLocalDesc(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Dataset description (optional)..."
              className="text-xs h-7.5 bg-background border-zinc-200 dark:border-zinc-800 w-full max-w-xl text-zinc-500"
            />
          </div>

          {/* Action buttons: Save Changes & Save to Files */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilesDialog(true)}
              className="h-8 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-1 sm:flex-initial cursor-pointer"
            >
              <FolderDown className="size-3.5 mr-1.5 text-zinc-500" />
              <span>Save to Files</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`h-8 text-xs font-semibold px-4 cursor-pointer gap-1.5 shadow-2xs flex-1 sm:flex-initial ${
                hasChanges
                  ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300"
              }`}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>{hasChanges ? "Save Changes" : "Saved"}</span>
            </Button>
          </div>
        </div>

        {/* Search & Table Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 min-w-0">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <div className="relative flex-1 sm:w-64 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter dataset rows..."
                className="pl-8 h-7.5 text-xs bg-background border-zinc-200 dark:border-zinc-800 w-full"
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 text-xs text-zinc-500 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span>
                Showing {filteredRowIndices.length} of {localRows.length} rows
              </span>
              <span>•</span>
              <span>{localColumns.length} columns</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmptyRow}
                className="h-7 text-xs px-2.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <Plus className="size-3 mr-1 text-primary" />
                <span>Add Row</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddColInput(true)}
                className="h-7 text-xs px-2.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <Plus className="size-3 mr-1 text-primary" />
                <span>Add Column</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Column Inline Modal */}
      {showAddColInput && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-2 max-w-md">
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Enter new column name..."
              className="h-8 text-xs bg-background"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddColumnLocal()}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddColumnLocal}
              className="h-8 px-3 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shrink-0"
            >
              Add
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddColInput(false)}
            className="h-8 w-8 p-0 text-zinc-400 shrink-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Empty Duplicate Columns Alert */}
      {duplicateEmptyColIndices.length > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notice:</span>
            <span>
              Found empty duplicate column{" "}
              <strong>&quot;{duplicateEmptyColIndices[0].name}&quot;</strong>.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            onClick={() => {
              const removeIndices = new Set(duplicateEmptyColIndices.map((d) => d.index));
              setLocalColumns((prev) => prev.filter((_, idx) => !removeIndices.has(idx)));
              setLocalRows((prev) => prev.map((r) => r.filter((_, idx) => !removeIndices.has(idx))));
              setHasChanges(true);
              toast.success("Removed empty duplicate column! Click Save Changes to apply.");
            }}
          >
            Remove Empty Copy
          </Button>
        </div>
      )}

      {/* Interactive Dataset Spreadsheet Grid */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left text-xs min-w-[700px] border-collapse">
            {/* Header Row */}
            <thead className="sticky top-0 z-10 bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-xs border-b border-zinc-200/80 dark:border-zinc-800/80">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center text-[10px] text-zinc-400 font-mono border-r border-zinc-200/60 dark:border-zinc-800">
                  #
                </th>
                {localColumns.map((col, cIdx) => {
                  const colType = getColumnType(
                    col,
                    cIdx,
                    localColumnTypes,
                    localRows.map((r) => r[cIdx])
                  );

                  return (
                    <th
                      key={cIdx}
                      className="px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-200 border-r border-zinc-200/60 dark:border-zinc-800 group min-w-[130px]"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {editingColIdx === cIdx ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingColName}
                                onChange={(e) => setEditingColName(e.target.value)}
                                className="h-6 text-xs w-28 px-1.5 bg-background"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleApplyRenameCol(cIdx);
                                  if (e.key === "Escape") setEditingColIdx(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyRenameCol(cIdx)}
                                className="text-emerald-500 hover:text-emerald-600 cursor-pointer"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingColIdx(null)}
                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingColIdx(cIdx);
                                setEditingColName(col);
                              }}
                              className="truncate cursor-pointer hover:underline"
                              title={`Double-click to rename: ${col}`}
                            >
                              {col || `Col ${cIdx + 1}`}
                            </span>
                          )}

                          {/* Column Format Selector */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border border-border/60 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition shrink-0"
                                title="Click to change column type format"
                              >
                                <span>
                                  {colType === "progressbar"
                                    ? "Progress"
                                    : colType === "date"
                                    ? "Date"
                                    : colType === "image"
                                    ? "Image"
                                    : colType === "options"
                                    ? "Status"
                                    : "Text"}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1.5 space-y-0.5 text-xs shadow-lg">
                              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Set Column Format
                              </div>
                              {[
                                { id: "text", label: "Text / String" },
                                { id: "progressbar", label: "Progress Bar (0-100%)" },
                                { id: "date", label: "Calendar Date" },
                                { id: "options", label: "Attendance / Status" },
                                { id: "image", label: "Image / Media" },
                                { id: "number", label: "Number" },
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleSetColumnType(col, t.id)}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer transition ${
                                    colType === t.id
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <span>{t.label}</span>
                                  {colType === t.id && <Check className="size-3 text-primary" />}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColIdx(cIdx);
                              setEditingColName(col);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 cursor-pointer"
                            title="Rename column"
                          >
                            <Pencil className="size-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteColumnLocal(cIdx)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 cursor-pointer"
                            title="Delete column"
                          >
                            <Trash2 className="size-2.5" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 w-14 text-center text-[10px] text-zinc-400">
                  Del
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-normal">
              {filteredRowIndices.length === 0 ? (
                <tr>
                  <td
                    colSpan={localColumns.length + 2}
                    className="px-4 py-12 text-center text-xs text-zinc-400 italic"
                  >
                    No records found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRowIndices.map((realRowIdx, displayIdx) => {
                  const row = localRows[realRowIdx] || [];

                  return (
                    <tr
                      key={realRowIdx}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-3 py-1.5 text-center font-mono text-[10px] text-zinc-400 border-r border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                        {realRowIdx + 1}
                      </td>

                      {localColumns.map((col, cIdx) => {
                        const cellVal = row[cIdx] ?? "";
                        const colType = getColumnType(
                          col,
                          cIdx,
                          localColumnTypes,
                          localRows.map((r) => r[cIdx])
                        );
                        const isDateCol = colType === "date";
                        const isImageCol = colType === "image";
                        const isProgressBarCol = colType === "progressbar";

                        const hasValidImgValue =
                          typeof cellVal === "string" &&
                          cellVal.trim() !== "" &&
                          (isImageCol ||
                            cellVal.startsWith("http://") ||
                            cellVal.startsWith("https://") ||
                            cellVal.startsWith("data:image/") ||
                            /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(cellVal));

                        return (
                          <td
                            key={cIdx}
                            className="px-2 py-1 border-r border-zinc-200/60 dark:border-zinc-800"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* If cell has a valid image value */}
                              {hasValidImgValue ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageUrl(cellVal)}
                                    className="relative group/thumb cursor-pointer"
                                    title="Click to view full image"
                                  >
                                    <img
                                      src={cellVal}
                                      alt="Cell thumb"
                                      className="size-6.5 rounded object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100"
                                    />
                                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 rounded flex items-center justify-center text-white transition">
                                      <Eye className="size-2.5" />
                                    </span>
                                  </button>
                                  <CellImageUploader
                                    value={cellVal}
                                    onChange={(url) => handleCellChange(realRowIdx, cIdx, url)}
                                    compact
                                  />
                                </div>
                              ) : isImageCol ? (
                                <CellImageUploader
                                  value={cellVal}
                                  onChange={(url) => handleCellChange(realRowIdx, cIdx, url)}
                                  compact
                                />
                              ) : isDateCol ? (
                                <CellDatePicker
                                  value={cellVal}
                                  onChange={(d) => handleCellChange(realRowIdx, cIdx, d)}
                                  compact
                                />
                              ) : isProgressBarCol ? (
                                <div className="flex flex-col gap-1 w-full min-w-[90px] px-1 py-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={cellVal}
                                      onChange={(e) =>
                                        handleCellChange(realRowIdx, cIdx, e.target.value)
                                      }
                                      placeholder="0–100"
                                      className="w-full bg-transparent px-1 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 focus:bg-white dark:focus:bg-zinc-900 rounded focus:outline-hidden focus:ring-1 focus:ring-primary/60 border border-transparent focus:border-primary/40 font-mono transition"
                                    />
                                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, parseFloat(String(cellVal).replace(/[^0-9.-]/g, "")) || 0))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={cellVal}
                                  onChange={(e) =>
                                    handleCellChange(realRowIdx, cIdx, e.target.value)
                                  }
                                  className="w-full bg-transparent px-1.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 focus:bg-white dark:focus:bg-zinc-900 rounded focus:outline-hidden focus:ring-1 focus:ring-primary/60 border border-transparent focus:border-primary/40 transition"
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Row Delete Button */}
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRowLocal(realRowIdx)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <Dialog open={true} onOpenChange={() => setPreviewImageUrl(null)}>
          <DialogContent className="max-w-lg p-4 bg-card border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ImageIcon className="size-4 text-primary" />
                <span>Image Preview</span>
              </DialogTitle>
            </DialogHeader>
            <div className="py-3 flex flex-col items-center justify-center space-y-3">
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="Full preview"
                  className="max-h-[60vh] max-w-full rounded-xl object-contain border border-zinc-200 dark:border-zinc-700 shadow-md"
                />
              ) : (
                <div className="p-8 text-xs text-zinc-400">No image available</div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(previewImageUrl);
                    toast.success("Image link copied!");
                  }}
                  className="text-xs h-7.5"
                >
                  Copy Link
                </Button>
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <span>Open Original</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Save to Workspace Files Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="sm:max-w-[480px] p-5 bg-card border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl space-y-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <FolderDown className="size-4 text-primary" />
              <span>Save to Workspace Files</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Export this dataset as a CSV file directly into your Desk project files workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                File Name
              </label>
              <Input
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder="dataset.csv"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Target Folder
              </label>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-48 overflow-y-auto p-1.5 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedFolderPath("")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition ${
                    selectedFolderPath === ""
                      ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <FolderOpen className="size-3.5 shrink-0" />
                  <span>Root (Top Level)</span>
                </button>

                {flatFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolderPath(f.path)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition ${
                      selectedFolderPath === f.path
                        ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <FolderTree className="size-3.5 shrink-0 text-zinc-400" />
                    <span className="truncate">{f.path}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFilesDialog(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveToFiles}
              disabled={isSavingToFiles}
              className="h-8 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold gap-1.5"
            >
              {isSavingToFiles ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <FolderDown className="size-3" />
              )}
              <span>Save File</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
