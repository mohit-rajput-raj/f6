"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Table2,
  X,
  RefreshCw,
  Layers,
  Database,
  Check,
  FolderPlus,
  Folder,
  FolderOpen,
  FolderTree,
  Home,
  FileSpreadsheet,
  FileText,
  Save,
  ChevronRight,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Tree, Folder as TreeFolder, File as TreeFile } from "@repo/ui/components/ui/File-Tree"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog"
import { useDeskStore } from "@/stores/desk-store"
import { useMasterSheetStore } from "@/stores/master-sheet-store"
import { useSession } from "@/lib/auth-client"
import { createDataLibraryFile } from "@/app/[project]/dash/[dashid]/(documents)/data-library/actions"
import {
  createOrOverwriteWorkspaceFile,
  getAllFoldersFlat,
  createNestedFolder,
  WorkspaceFolderItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions"
import { toast } from "sonner"

interface FolderTreeNode {
  id: string
  name: string
  path: string
  parentPath: string
  children: FolderTreeNode[]
}

function buildFolderHierarchy(folders: WorkspaceFolderItem[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>()
  const roots: FolderTreeNode[] = []

  const sorted = [...folders].sort((a, b) => a.path.localeCompare(b.path))

  sorted.forEach((f) => {
    const lastSlash = f.path.lastIndexOf("/")
    const parentPath = lastSlash !== -1 ? f.path.substring(0, lastSlash) : ""

    map.set(f.path, {
      id: f.id,
      name: f.name,
      path: f.path,
      parentPath,
      children: [],
    })
  })

  sorted.forEach((f) => {
    const node = map.get(f.path)
    if (!node) return
    if (node.parentPath && map.has(node.parentPath)) {
      map.get(node.parentPath)?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export function UpdatedMergedPreview() {
  const params = useParams()
  const dashid = (params?.dashid as string) || ""
  const { data: session } = useSession()
  const userId = session?.user?.id || ""

  const mergedPreview = useDeskStore((s) => s.mergedPreview)
  const setMergedPreview = useDeskStore((s) => s.setMergedPreview)
  const setDeskMasterSheetData = useDeskStore((s) => s.setDeskMasterSheetData)

  const [isMerging, setIsMerging] = useState(false)
  const [mergedSuccess, setMergedSuccess] = useState(false)

  // ── Data Library Modal State ──
  const [libraryModalOpen, setLibraryModalOpen] = useState(false)
  const [libraryFileName, setLibraryFileName] = useState("")
  const [libraryFileType, setLibraryFileType] = useState<"csv" | "json">("csv")
  const [libraryDesc, setLibraryDesc] = useState("")
  const [isSavingLibrary, setIsSavingLibrary] = useState(false)

  // ── Workspace Files Modal State (VS Code Tree UI) ──
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const [filesFileName, setFilesFileName] = useState("")
  const [filesFileType, setFilesFileType] = useState<"csv" | "json">("csv")
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("")
  const [flatFolders, setFlatFolders] = useState<WorkspaceFolderItem[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [isSavingFiles, setIsSavingFiles] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false)

  // Build recursive folder hierarchy for VS Code tree (Hook called unconditionally)
  const folderTree = useMemo(() => buildFolderHierarchy(flatFolders), [flatFolders])

  if (!mergedPreview || !mergedPreview.columns || mergedPreview.columns.length === 0) {
    return null
  }

  const columns = mergedPreview.columns || []
  const data = mergedPreview.data || []
  const updates = mergedPreview.updates || []
  const sheetName = mergedPreview.sheetName || "Sheet1"
  const targetPath = mergedPreview.targetPath || mergedPreview.stackName || ""

  // Helper to format table rows to CSV
  const generateCsvContent = () => {
    const headerRow = columns.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    const dataRows = data.map((row) =>
      (row || []).map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    return [headerRow, ...dataRows].join("\n")
  }

  // Helper to format table rows to JSON array of objects
  const generateJsonData = () => {
    return data.map((row) => {
      const obj: Record<string, any> = {}
      columns.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      return obj
    })
  }

  // ── Open Save to Files Modal ──
  const handleOpenFilesModal = async () => {
    const cleanDefault = (targetPath || sheetName || "merged_data")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
    setFilesFileName(`${cleanDefault}_merged.csv`)
    setFilesFileType("csv")
    setSelectedFolderPath("")
    setIsCreatingFolder(false)
    setNewFolderName("")
    setFilesModalOpen(true)

    if (dashid) {
      setLoadingFolders(true)
      try {
        const list = await getAllFoldersFlat(dashid)
        setFlatFolders(list)
      } catch (e) {
        console.error("Error loading folders:", e)
      } finally {
        setLoadingFolders(false)
      }
    }
  }

  // ── Create Folder inside Tree UI ──
  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      toast.error("Please enter a folder name.")
      return
    }
    if (!dashid) {
      toast.error("Workflow / Project ID missing.")
      return
    }
    if (!userId) {
      toast.error("User session missing. Please re-login.")
      return
    }

    setIsSubmittingFolder(true)
    try {
      const created = await createNestedFolder({
        dashid,
        userId,
        parentPath: selectedFolderPath || "",
        name: trimmed,
      })

      toast.success(`Folder "${created.name}" created!`)
      // Refresh folder list
      const list = await getAllFoldersFlat(dashid)
      setFlatFolders(list)
      // Automatically select the new folder
      setSelectedFolderPath(created.path)
      setIsCreatingFolder(false)
      setNewFolderName("")
    } catch (err: any) {
      console.error("Error creating folder:", err)
      toast.error(err.message || "Failed to create folder.")
    } finally {
      setIsSubmittingFolder(false)
    }
  }

  // ── Save to Workspace Files Action ──
  const handleSaveToFiles = async () => {
    if (!dashid) {
      toast.error("Workflow / Project ID missing.")
      return
    }
    if (!userId) {
      toast.error("User session missing. Please re-login.")
      return
    }

    let finalName = filesFileName.trim()
    if (!finalName) {
      toast.error("Please enter a file name.")
      return
    }

    // Ensure extension
    if (filesFileType === "csv" && !finalName.toLowerCase().endsWith(".csv")) {
      finalName += ".csv"
    } else if (filesFileType === "json" && !finalName.toLowerCase().endsWith(".json")) {
      finalName += ".json"
    }

    setIsSavingFiles(true)
    try {
      const filePayload =
        filesFileType === "csv"
          ? { columns, data, rawCsv: generateCsvContent() }
          : generateJsonData()

      const res = await createOrOverwriteWorkspaceFile({
        dashid,
        userId,
        fileName: finalName,
        folderPath: selectedFolderPath.trim(),
        fileType: filesFileType,
        data: filePayload,
        metadata: {
          columns,
          rowCount: data.length,
          sheetName,
          targetPath,
          source: "UpdatedMergedPreview",
          exportedAt: new Date().toISOString(),
        },
      })

      const folderDisplay = selectedFolderPath.trim() ? `/${selectedFolderPath.trim()}` : "Root"
      toast.success(
        `Saved "${finalName}" in folder "${folderDisplay}" successfully!${res.overwritten ? " (Overwritten)" : ""}`
      )
      setFilesModalOpen(false)
    } catch (err: any) {
      console.error("Error saving file to workspace:", err)
      toast.error("Failed to save to Files: " + (err?.message || err))
    } finally {
      setIsSavingFiles(false)
    }
  }

  // ── Open Save to Data Library Modal ──
  const handleOpenLibraryModal = () => {
    const cleanDefault = (targetPath || sheetName || "merged_data")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
    setLibraryFileName(`${cleanDefault}_merged`)
    setLibraryFileType("csv")
    setLibraryDesc(`Merged attendance dataset with ${columns.length} columns and ${data.length} records.`)
    setLibraryModalOpen(true)
  }

  // ── Save to Data Library Action ──
  const handleSaveToDataLibrary = async () => {
    if (!userId) {
      toast.error("User session missing. Please re-login.")
      return
    }

    let finalName = libraryFileName.trim()
    if (!finalName) {
      toast.error("Please enter a file name.")
      return
    }

    setIsSavingLibrary(true)
    try {
      const filePayload = libraryFileType === "csv" ? generateCsvContent() : generateJsonData()

      await createDataLibraryFile({
        userId,
        name: finalName,
        description: libraryDesc.trim(),
        fileType: libraryFileType,
        data: filePayload,
        metadata: {
          columns,
          rowCount: data.length,
          sheetName,
          targetPath,
          source: "UpdatedMergedPreview",
          exportedAt: new Date().toISOString(),
        },
        workflowId: dashid,
      })

      toast.success(`Saved "${finalName}" to Data Library successfully!`)
      setLibraryModalOpen(false)
    } catch (err: any) {
      console.error("Error saving to Data Library:", err)
      toast.error("Failed to save to Data Library: " + (err?.message || err))
    } finally {
      setIsSavingLibrary(false)
    }
  }

  // ── Confirm Merge directly in MasterSheet ──
  const handleConfirmMerge = async () => {
    setIsMerging(true)
    try {
      const msStore = useMasterSheetStore.getState()
      const deskStore = useDeskStore.getState()
      const {
        applyUpdatesToMasterSheet,
        applyUpdatesDirectlyToSyncfusion,
        extractSyncfusionInstanceData,
        extractSingleSheetSnapshot,
        countSheetRowsCols,
      } = await import("@/lib/sheet-utils")

      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null

      // Pre-Merge Snapshot
      if (ss) {
        const activeTabName = msStore.activeSheetTab || sheetName || "Sheet1"
        const snapshotData = extractSingleSheetSnapshot(ss, activeTabName)
        if (snapshotData) {
          const dims = countSheetRowsCols(snapshotData)
          msStore.addSheetSnapshot(activeTabName, {
            sheetName: activeTabName,
            timestamp: Date.now(),
            action: `Before Merge: ${targetPath}`,
            changeSummary: `Snapshot before merging ${updates.length} records for ${targetPath}`,
            data: snapshotData,
            rowCount: dims.rowCount,
            colCount: dims.colCount,
          })
        }
      }

      // 1. Direct cell updates to visible Syncfusion spreadsheet
      if (ss) {
        applyUpdatesDirectlyToSyncfusion(ss, updates)
      }

      // 2. Full workbook JSON
      let updatedMasterSheet = null
      if (ss && typeof ss.saveAsJson === "function") {
        try {
          const res = await ss.saveAsJson()
          updatedMasterSheet = res?.jsonObject || res
        } catch (e) {
          console.warn("saveAsJson notice:", e)
        }
      }

      if (!updatedMasterSheet && ss) {
        updatedMasterSheet = extractSyncfusionInstanceData(ss)
      }

      if (!updatedMasterSheet) {
        const currentRaw =
          msStore.sheets[sheetName]?.data ||
          deskStore.activeMasterSheetData ||
          deskStore.masterSheetPreview
        updatedMasterSheet = applyUpdatesToMasterSheet(
          currentRaw,
          updates,
          targetPath,
          mergedPreview.dataStartRow
        )
      }

      // 3. Update stores
      if (updatedMasterSheet) {
        setDeskMasterSheetData(updatedMasterSheet)
        msStore.setSheetData(sheetName, updatedMasterSheet)
        msStore.pushData({
          masterSheetName: sheetName,
          sheetName: sheetName,
          data: updatedMasterSheet,
          blockCodenames: [targetPath],
          pushedBy: "desk-merged-preview",
          pushedByName: "Updated Merged Preview",
          pushedAt: Date.now(),
          sourceNodeId: "desk-merged-preview",
        })
      }

      setMergedSuccess(true)
      toast.success(
        `Merged ${updates.length || data.length} student records into MasterSheet "${sheetName}"! Click "Save Sheet" below to persist changes.`
      )
      setTimeout(() => setMergedSuccess(false), 5000)
    } catch (err: any) {
      console.error("Confirm merge failed:", err)
      toast.error("Failed to merge into MasterSheet: " + (err?.message || err))
    } finally {
      setIsMerging(false)
    }
  }

  // Recursive Tree Node renderer for VS Code style overlay
  const renderTreeNodes = (nodes: FolderTreeNode[]) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0
      const isSelected = selectedFolderPath === node.path

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
      )
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden mb-4 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary border border-primary/20">
            <Table2 className="size-4" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Merged Attendance Preview
              </h3>
              <Badge variant="secondary" className="text-[11px] font-normal">
                {updates.length > 0 ? `${updates.length} Updates` : "Preview"}
              </Badge>
            </div>

            {/* Metadata bar */}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>
                Sheet: <strong className="font-mono font-medium text-foreground">{sheetName}</strong>
              </span>
              <span>•</span>
              <span>
                Path: <strong className="font-mono font-medium text-foreground">{targetPath}</strong>
              </span>
              <span>•</span>
              <span>{data.length} records</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Button: Save to Data Library */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenLibraryModal}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
          >
            <Database className="size-3.5 text-blue-500" />
            <span>Save to Data Library</span>
          </Button>

          {/* Button: Save to Files with VS Code Folder Tree */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFilesModal}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
          >
            <FolderPlus className="size-3.5 text-amber-500" />
            <span>Save to Files</span>
          </Button>

          {/* Button: Confirm Merge into MasterSheet */}
          <Button
            onClick={handleConfirmMerge}
            disabled={isMerging}
            size="sm"
            className="h-8 gap-1.5 font-medium cursor-pointer shadow-xs"
          >
            {isMerging ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Merging...</span>
              </>
            ) : mergedSuccess ? (
              <>
                <Check className="size-4" />
                <span>Merged into MasterSheet</span>
              </>
            ) : (
              <>
                <ArrowRight className="size-3.5" />
                <span>Confirm Merge in MasterSheet</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMergedPreview(null)}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Dismiss preview"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Columns Tag List */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1.5 shrink-0">
          <Layers className="size-3.5" /> Target Columns:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {columns.map((col, idx) => {
            const isMetric =
              col.includes(":") ||
              col.toLowerCase().includes("total") ||
              col.toLowerCase().includes("attend") ||
              col.includes("%")
            return (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  isMetric
                    ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                    : "bg-background text-foreground border-border"
                }`}
              >
                {col}
              </span>
            )
          })}
        </div>
      </div>

      {/* Table Preview */}
      <div className="max-h-[260px] overflow-auto bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground sticky top-0 border-b border-border z-10 font-medium">
              {columns.map((col, i) => {
                const isMetric = col.includes(":")
                return (
                  <th
                    key={i}
                    className={`px-3.5 py-2 whitespace-nowrap font-medium border-r border-border/50 last:border-r-0 ${
                      isMetric ? "text-foreground bg-muted/80 font-semibold" : ""
                    }`}
                  >
                    {col}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/50 transition-colors">
                {columns.map((col, ci) => {
                  const cellVal = row[ci]
                  const isPct = col.includes("%")
                  const isMetric = col.includes(":")

                  return (
                    <td
                      key={ci}
                      className={`px-3.5 py-1.5 whitespace-nowrap border-r border-border/40 last:border-r-0 text-xs ${
                        ci === 0
                          ? "text-muted-foreground font-mono w-10 text-center"
                          : ci === 1
                          ? "font-mono font-medium text-foreground"
                          : ci === 2
                          ? "font-medium text-foreground"
                          : isMetric
                          ? "font-mono font-semibold text-foreground bg-muted/20"
                          : "text-foreground"
                      }`}
                    >
                      {isPct ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {String(cellVal ?? "")}
                        </span>
                      ) : (
                        String(cellVal ?? "")
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Banner */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Click <strong>Confirm Merge in MasterSheet</strong> or use <strong>Save to Files / Data Library</strong> to store this dataset.
        </span>
        <span className="font-mono text-[11px]">{data.length} records</span>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── MODAL 1: Save to Data Library ── */}
      {/* ────────────────────────────────────────────────────────── */}
      <Dialog open={libraryModalOpen} onOpenChange={setLibraryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Database className="size-5 text-blue-500" />
              <span>Save to Data Library</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Persist this merged preview dataset into your workspace Data Library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Summary Tag */}
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <span className="font-medium text-foreground">
                Sheet: <strong className="font-mono">{sheetName}</strong>
              </span>
              <Badge variant="outline" className="text-[11px] font-mono">
                {columns.length} columns • {data.length} rows
              </Badge>
            </div>

            {/* File Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">File Name</Label>
              <Input
                value={libraryFileName}
                onChange={(e) => setLibraryFileName(e.target.value)}
                placeholder="e.g. attendance_merged"
                className="h-8 text-xs"
              />
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={libraryFileType === "csv" ? "default" : "outline"}
                  onClick={() => setLibraryFileType("csv")}
                  className="h-7 text-xs flex-1 gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="size-3.5" />
                  <span>CSV</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={libraryFileType === "json" ? "default" : "outline"}
                  onClick={() => setLibraryFileType("json")}
                  className="h-7 text-xs flex-1 gap-1.5 cursor-pointer"
                >
                  <FileText className="size-3.5" />
                  <span>JSON</span>
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (Optional)</Label>
              <Input
                value={libraryDesc}
                onChange={(e) => setLibraryDesc(e.target.value)}
                placeholder="Brief notes about this dataset"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLibraryModalOpen(false)}
              disabled={isSavingLibrary}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToDataLibrary}
              disabled={isSavingLibrary}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              {isSavingLibrary ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save to Data Library</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── MODAL 2: Save to Workspace Files (VS Code Tree UI) ── */}
      {/* ────────────────────────────────────────────────────────── */}
      <Dialog open={filesModalOpen} onOpenChange={setFilesModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="size-5 text-amber-500" />
              <span>Save to Workspace Files</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a target folder path from the tree explorer or specify a custom folder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-sm flex-1 overflow-y-auto pr-1">
            {/* Target Path Breadcrumb Indicator */}
            <div className="rounded-md border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <FolderOpen className="size-4 text-amber-500 shrink-0" />
                <span className="shrink-0 font-medium">Target Folder:</span>
                <Badge variant="outline" className="font-mono text-[11px] bg-background truncate">
                  {selectedFolderPath.trim() ? `/${selectedFolderPath.trim()}` : "/ (Root Workspace)"}
                </Badge>
              </div>

              {selectedFolderPath && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFolderPath("")}
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                  Reset to Root
                </Button>
              )}
            </div>

            {/* VS Code Style Folder Tree Explorer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="font-medium flex items-center gap-1.5">
                  <FolderTree className="size-3.5 text-primary" />
                  <span>Folder Directory</span>
                </Label>
                <div className="flex items-center gap-1.5">
                  {!isCreatingFolder && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingFolder(true)
                        setNewFolderName("")
                      }}
                      className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="size-3.5" />
                      <span>New Folder</span>
                    </Button>
                  )}
                  <span className="text-[11px] text-muted-foreground">Click folder to select</span>
                </div>
              </div>

              {/* Inline Folder Creation Form */}
              {isCreatingFolder && (
                <div className="p-2 rounded-md border border-primary/30 bg-primary/5 space-y-1.5 text-xs animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between text-[11px] text-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <FolderPlus className="size-3.5 text-primary" />
                      Create folder inside:
                    </span>
                    <code className="bg-background/80 px-1.5 py-0.5 rounded text-[10px] text-primary font-mono border border-border">
                      {selectedFolderPath ? `/${selectedFolderPath}` : "Root (/)"}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      placeholder="Folder name (e.g. exports, archives)..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleCreateFolder()
                        } else if (e.key === "Escape") {
                          setIsCreatingFolder(false)
                          setNewFolderName("")
                        }
                      }}
                      disabled={isSubmittingFolder}
                      className="h-7 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateFolder}
                      disabled={isSubmittingFolder || !newFolderName.trim()}
                      className="h-7 px-2.5 text-xs shrink-0 cursor-pointer"
                    >
                      {isSubmittingFolder ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      <span className="ml-1">Create</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingFolder(false)
                        setNewFolderName("")
                      }}
                      disabled={isSubmittingFolder}
                      className="h-7 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-border bg-card shadow-inner overflow-hidden">
                <ScrollArea className="h-44 p-2">
                  {loadingFolders ? (
                    <div className="flex items-center justify-center h-28 text-xs text-muted-foreground gap-2">
                      <RefreshCw className="size-4 animate-spin" />
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
                        <span>Root Workspace (/)</span>
                      </button>

                      {/* Nested Folders via Tree */}
                      {folderTree.length > 0 ? (
                        <div className="pt-1 pl-1">
                          <Tree
                            onSelectChange={(path) => setSelectedFolderPath(path)}
                            selectedId={selectedFolderPath}
                            className="text-xs"
                          >
                            {renderTreeNodes(folderTree)}
                          </Tree>
                        </div>
                      ) : (
                        <div className="py-4 px-2 text-center text-xs text-muted-foreground">
                          <p>No subfolders created yet.</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            File will be saved at the root level, or you can specify a folder path below.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Custom / Editable Folder Path Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="font-medium">Folder Path (Custom or Auto-Create)</Label>
                <span className="text-[10px] text-muted-foreground">Auto creates missing path</span>
              </div>
              <Input
                value={selectedFolderPath}
                onChange={(e) => setSelectedFolderPath(e.target.value)}
                placeholder="e.g. Attendance/Term1 or leave blank for root"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* File Name & Format Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">File Name</Label>
                <Input
                  value={filesFileName}
                  onChange={(e) => setFilesFileName(e.target.value)}
                  placeholder="attendance_merged.csv"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Format</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={filesFileType === "csv" ? "default" : "outline"}
                    onClick={() => {
                      setFilesFileType("csv")
                      if (filesFileName.endsWith(".json")) {
                        setFilesFileName(filesFileName.replace(/\.json$/, ".csv"))
                      }
                    }}
                    className="h-8 text-xs flex-1 cursor-pointer"
                  >
                    CSV
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filesFileType === "json" ? "default" : "outline"}
                    onClick={() => {
                      setFilesFileType("json")
                      if (filesFileName.endsWith(".csv")) {
                        setFilesFileName(filesFileName.replace(/\.csv$/, ".json"))
                      }
                    }}
                    className="h-8 text-xs flex-1 cursor-pointer"
                  >
                    JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilesModalOpen(false)}
              disabled={isSavingFiles}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToFiles}
              disabled={isSavingFiles}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              {isSavingFiles ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save File</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
