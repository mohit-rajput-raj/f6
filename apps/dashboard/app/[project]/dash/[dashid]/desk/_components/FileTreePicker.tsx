"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  FolderPlus,
  FolderOpen,
  FolderTree,
  Home,
  X,
  Check,
  RefreshCw,
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
import {
  getAllFoldersFlat,
  createNestedFolder,
  type WorkspaceFolderItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────

interface FolderTreeNode {
  id: string
  name: string
  path: string
  parentPath: string
  children: FolderTreeNode[]
}

export interface FileTreePickerResult {
  folderPath: string
  fileName: string
}

interface FileTreePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashid: string
  userId: string
  title?: string
  description?: string
  defaultFileName?: string
  defaultFolderPath?: string
  onConfirm: (result: FileTreePickerResult) => void | Promise<void>
  isSubmitting?: boolean
}

// ─── Helpers ────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────

export function FileTreePicker({
  open,
  onOpenChange,
  dashid,
  userId,
  title = "Select Save Location",
  description = "Choose a folder and file name to save your data.",
  defaultFileName = "data.json",
  defaultFolderPath = "",
  onConfirm,
  isSubmitting: externalSubmitting = false,
}: FileTreePickerProps) {
  const [selectedFolderPath, setSelectedFolderPath] = useState(defaultFolderPath)
  const [fileName, setFileName] = useState(defaultFileName)
  const [flatFolders, setFlatFolders] = useState<WorkspaceFolderItem[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const folderTree = useMemo(() => buildFolderHierarchy(flatFolders), [flatFolders])

  // Fetch all folders when opening
  useEffect(() => {
    if (open && dashid) {
      setLoadingFolders(true)
      getAllFoldersFlat(dashid)
        .then((list) => setFlatFolders(list))
        .catch((e) => console.error("Error loading folders:", e))
        .finally(() => setLoadingFolders(false))
    }
  }, [open, dashid])

  // Reset state when defaults change
  useEffect(() => {
    setFileName(defaultFileName)
    setSelectedFolderPath(defaultFolderPath)
  }, [defaultFileName, defaultFolderPath])

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      toast.error("Please enter a folder name.")
      return
    }
    if (!dashid || !userId) {
      toast.error("Missing project/user context.")
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
      const list = await getAllFoldersFlat(dashid)
      setFlatFolders(list)
      setSelectedFolderPath(created.path)
      setIsCreatingFolder(false)
      setNewFolderName("")
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder.")
    } finally {
      setIsSubmittingFolder(false)
    }
  }

  const handleConfirm = async () => {
    const finalName = fileName.trim()
    if (!finalName) {
      toast.error("Please enter a file name.")
      return
    }
    setIsConfirming(true)
    try {
      await onConfirm({
        folderPath: selectedFolderPath.trim(),
        fileName: finalName,
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const submitting = externalSubmitting || isConfirming

  // Recursive Tree Node renderer
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="size-5 text-amber-500" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1 text-sm flex-1 overflow-y-auto pr-1">
          {/* Target Path Breadcrumb */}
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

          {/* VS Code Style Folder Tree */}
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

            {/* Inline Folder Creation */}
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

                    {/* Nested Folders */}
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
                          Click &quot;New Folder&quot; to create one.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Custom Folder Path Input */}
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

          {/* File Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="data.json"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || !fileName.trim()}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                <span>Confirm Location</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
