"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Play, Settings, FileUp, Table2, Eye, ChevronDown,
  Loader2, CheckSquare, Trash2, Edit2, Download, Plus, Pencil,
} from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { Button } from "@/components/ui/components"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@repo/ui/components/ui/resizable"
import { Badge } from "@repo/ui/components/ui/badge"
import { useDeskStore, type DeskBlockState, type Dataset } from "@/stores/desk-store"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "react-error-boundary"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
)

// ─── CSV parsing helper ─────────────────────────────────────
function parseCSV(text: string): { columns: string[]; data: string[][] } {
  const lines = text.trim().split("\n")
  if (lines.length === 0) return { columns: [], data: [] }
  const parseLine = (line: string) => {
    const result: string[] = []
    let inQuotes = false
    let current = ""
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else { inQuotes = !inQuotes }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim()); current = ""
      } else { current += ch }
    }
    result.push(current.trim())
    return result
  }
  const columns = parseLine(lines[0])
  const data = lines.slice(1).filter(l => l.trim()).map(parseLine)
  return { columns, data }
}

// ─── Column letter helper ───────────────────────────────────
function colLetter(idx: number): string {
  let result = ""
  let n = idx
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

// ─── Props ──────────────────────────────────────────────────
interface DeskBlockProps {
  block: DeskBlockState           // The BigBlock (root block, parentId=null)
  blockIndex: number
  totalBlocks: number
  allBlocks: DeskBlockState[]     // All blocks for finding children
  isGuest: boolean
  dashid: string
  userId?: string
  onExecute: (blockId: string) => void
  onAddTab: (bigBlockId: string) => Promise<string | undefined>
  onRenameTab: (blockId: string, newName: string) => Promise<void>
  onDeleteTab: (blockId: string) => Promise<void>
  previousBlockOutput?: Dataset | null
}

export function DeskBlock({
  block,
  blockIndex,
  totalBlocks,
  allBlocks,
  isGuest,
  dashid,
  userId,
  onExecute,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  previousBlockOutput,
}: DeskBlockProps) {
  const router = useRouter()
  const pathname = usePathname()
  const spreadsheetRef = useRef<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTab, setIsAddingTab] = useState(false)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // ─── Child blocks (tabs within this BigBlock) ─────────────
  const childBlocks = (allBlocks || [])
    .filter((b) => b.parentId === block.id)
    .sort((a, b) => a.blockOrder - b.blockOrder)

  // ─── Active tab persistence (localStorage) ────────────────
  const storageKey = `desk-tab-${block.id}`
  const [activeChildId, setActiveChildId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey)
      if (saved && childBlocks.find(c => c.id === saved)) return saved
    }
    return childBlocks[0]?.id || ""
  })

  // Sync localStorage when active tab changes
  useEffect(() => {
    if (activeChildId) {
      localStorage.setItem(storageKey, activeChildId)
    }
  }, [activeChildId, storageKey])

  // Keep active child valid when children change
  useEffect(() => {
    if (childBlocks.length > 0 && !childBlocks.find(c => c.id === activeChildId)) {
      setActiveChildId(childBlocks[0].id)
    }
  }, [childBlocks, activeChildId])

  const activeChild = childBlocks.find(c => c.id === activeChildId) || null

  // ─── Store actions ─────────────────────────────────────────
  const {
    updateTextInputValue,
    updateTextInputPlaceholder,
    updateSheetData,
    updateSheetName,
    toggleCheckbox,
  } = useDeskStore()

  // ─── Active preview tab state ──────────────────────────────
  const [activePreviewTab, setActivePreviewTab] = useState<string>("output_preview")

  const outputPreviewData = activeChild?.outputPreview ?? null
  const activeSheet = activeChild?.sheets.find((s) => s.id === activePreviewTab)

  const previewData: Dataset | null =
    activePreviewTab === "output_preview"
      ? outputPreviewData
      : (activeSheet?.data ?? null)

  // Auto-select output_preview if it has data, or fallback to first sheet with data
  useEffect(() => {
    if (!activeChild) return
    if (outputPreviewData && outputPreviewData.columns && outputPreviewData.columns.length > 0) {
      setActivePreviewTab("output_preview")
    } else if (activeChild.sheets.length > 0 && activePreviewTab !== "output_preview") {
      const sheetWithData = activeChild.sheets.find((s) => s.data)
      if (sheetWithData) setActivePreviewTab(sheetWithData.id)
    }
  }, [activeChild, outputPreviewData])

  // ─── Add new tab (uses callback from page.tsx) ─────────────
  const handleAddTab = useCallback(async () => {
    setIsAddingTab(true)
    try {
      const newId = await onAddTab(block.id)
      if (newId) setActiveChildId(newId)
    } catch (err: any) {
      toast.error(err?.message || "Failed to add tab")
    } finally {
      setIsAddingTab(false)
    }
  }, [block.id, onAddTab])

  // ─── Rename tab ────────────────────────────────────────────
  const startRename = useCallback((childId: string, currentName: string) => {
    setRenamingTabId(childId)
    setRenameValue(currentName)
  }, [])

  const commitRename = useCallback(async () => {
    if (!renamingTabId || !renameValue.trim()) {
      setRenamingTabId(null)
      return
    }
    try {
      await onRenameTab(renamingTabId, renameValue.trim())
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename")
    } finally {
      setRenamingTabId(null)
    }
  }, [renamingTabId, renameValue, onRenameTab])

  // ─── File upload for sheets ─────────────────────────────
  const handleSheetFileUpload = useCallback((blockId: string, sheetId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const parsed = parseCSV(text)
      if (parsed.columns.length > 0) {
        updateSheetData(blockId, sheetId, parsed)
        setActivePreviewTab(sheetId)
        toast.success(`Loaded ${parsed.data.length} rows`)
      } else {
        toast.error("Could not parse file — ensure it's a valid CSV")
      }
    }
    reader.readAsText(file)
  }, [updateSheetData])

  // ─── Load previous BigBlock output into a sheet ────────────
  const handleLoadPreviousIntoSheet = useCallback((blockId: string, sheetId: string) => {
    if (!previousBlockOutput) return
    updateSheetData(blockId, sheetId, previousBlockOutput)
    setActivePreviewTab(sheetId)
    toast.success(`Loaded ${previousBlockOutput.data.length} rows from previous BigBlock`)
  }, [previousBlockOutput, updateSheetData])

  // ─── Navigate to child block's editor ──────────────────────
  const openEditor = useCallback((child: DeskBlockState) => {
    if (isGuest) {
      toast.error("You don't have permission to edit this block's workflow")
      return
    }
    const segments = pathname.split("/")
    const projectSlug = segments[1] || "dashboard"
    router.push(`/${projectSlug}/dash/${dashid}/desk/editor/${child.editorWorkflowId}`)
  }, [isGuest, pathname, dashid, router])

  // ─── Delete a child tab ────────────────────────────────────
  const handleDeleteTab = useCallback(async (childId: string) => {
    if (isGuest) return
    if (childBlocks.length <= 1) {
      toast.error("Cannot delete the last tab in a BigBlock")
      return
    }
    if (confirm("Delete this tab? This cannot be undone.")) {
      setIsDeleting(true)
      try {
        await onDeleteTab(childId)
        // Switch to first remaining child
        const remaining = childBlocks.filter(c => c.id !== childId)
        if (remaining.length > 0) setActiveChildId(remaining[0].id)
      } catch (err) {
        toast.error("Failed to delete tab")
      } finally {
        setIsDeleting(false)
      }
    }
  }, [isGuest, childBlocks, onDeleteTab])

  // ─── Load preview data into Syncfusion ──────────────────
  useEffect(() => {
    if (!spreadsheetRef.current || !previewData || !previewData.columns) return
    const timer = setTimeout(() => {
      const ss = spreadsheetRef.current
      if (!ss || !ss.element || !ss.updateCell) return
      try {
        previewData.columns.forEach((col, colIdx) => {
          const cellAddr = `${colLetter(colIdx)}1`
          ss.updateCell(
            { value: String(col ?? ""), style: { fontWeight: "bold", backgroundColor: "#334155", color: "#ffffff" } },
            cellAddr
          )
        })
        ;(previewData.data || []).forEach((row, rowIdx) => {
          ;(row || []).forEach((cell: any, colIdx: number) => {
            const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`
            ss.updateCell({ value: String(cell ?? "") }, cellAddr)
          })
        })
      } catch (err) {
        console.warn("Spreadsheet update failed:", err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [previewData])

  // ─── If no children exist yet, show empty state ────────────
  if (childBlocks.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
              {blockIndex + 1}
            </div>
            <span className="text-sm font-semibold text-zinc-200">
              BigBlock {blockIndex + 1}
            </span>
          </div>
          {!isGuest && (
            <Button
              size="sm"
              onClick={handleAddTab}
              disabled={isAddingTab}
              className="h-7 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isAddingTab ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3.5" />}
              Create First Tab
            </Button>
          )}
        </div>
        <div className="p-8 text-center text-muted-foreground text-xs italic">
          No tabs yet. Click "Create First Tab" to add one.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden">
      {/* ─── BigBlock Header ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
            {blockIndex + 1}
          </div>
          <span className="text-sm font-semibold text-zinc-200">
            BigBlock {blockIndex + 1}
          </span>
          {activeChild?.isExecuting && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              <Loader2 className="size-3 animate-spin mr-1" />
              Running...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {activeChild && (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm"
                onClick={() => onExecute(activeChild.id)}
                disabled={activeChild.isExecuting}
              >
                {activeChild.isExecuting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Play className="size-3" />
                )}
                Execute
              </Button>
              {!isGuest && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Settings className="size-3.5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditor(activeChild)} className="cursor-pointer text-xs">
                      <Edit2 className="mr-2 size-3.5" />
                      Open Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startRename(activeChild.id, activeChild.name)} className="cursor-pointer text-xs">
                      <Pencil className="mr-2 size-3.5" />
                      Rename Tab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteTab(activeChild.id)} className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600">
                      <Trash2 className="mr-2 size-3.5" />
                      Delete Tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Tab Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          {childBlocks.map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveChildId(child.id)}
              onDoubleClick={() => !isGuest && startRename(child.id, child.name)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                activeChildId === child.id
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              {renamingTabId === child.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename()
                    if (e.key === "Escape") setRenamingTabId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none outline-none text-xs w-20 text-zinc-100"
                />
              ) : (
                child.name
              )}
            </button>
          ))}
        </div>
        {!isGuest && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTab}
            disabled={isAddingTab}
            className="h-7 text-xs px-2.5 gap-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 font-medium cursor-pointer shrink-0"
          >
            {isAddingTab ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3.5" />}
            Add Tab
          </Button>
        )}
      </div>

      {/* ─── Active Tab Content ────────────────────────────── */}
      {activeChild && (
        <div>
          {/* Split View: Inputs | Preview */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[280px]">
            {/* ── Left Panel: Inputs ── */}
            <ResizablePanel defaultSize={35} minSize={20}>
              <div className="h-full overflow-y-auto">
                {/* Previous BigBlock output as input */}
                {blockIndex > 0 && previousBlockOutput && (
                  <div className="p-3 border-b">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ChevronDown className="size-3" />
                      Input from BigBlock {blockIndex}
                    </h4>
                    <div className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-zinc-300 font-medium">
                        {previousBlockOutput.data.length} rows × {previousBlockOutput.columns.length} cols
                      </span>
                      {/* Load into sheet dropdown */}
                      {activeChild.sheets.length > 0 && !isGuest && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-1 text-zinc-400 hover:text-zinc-100">
                              <Download className="size-3" />
                              Load into sheet
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {activeChild.sheets.map((sheet) => (
                              <DropdownMenuItem
                                key={sheet.id}
                                className="cursor-pointer text-xs"
                                onClick={() => handleLoadPreviousIntoSheet(activeChild.id, sheet.id)}
                              >
                                📊 {sheet.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Inputs Section */}
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                    📝 Text Inputs
                    <Badge variant="secondary" className="text-[9px]">
                      {activeChild.textInputs.length}
                    </Badge>
                  </h4>
                  <div className="space-y-1.5">
                    {activeChild.textInputs.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                        No text inputs. Add via editor workflow.
                      </p>
                    ) : (
                      activeChild.textInputs.map((input) => (
                        <div key={input.id} className="rounded-lg border p-2 bg-background space-y-1">
                          <input
                            value={input.placeholder}
                            onChange={(e) => updateTextInputPlaceholder(activeChild.id, input.id, e.target.value)}
                            className="w-full text-[10px] font-medium text-muted-foreground bg-transparent border-none focus:outline-none"
                            placeholder="Label..."
                            readOnly
                          />
                          <Input
                            placeholder={input.placeholder}
                            value={input.value}
                            onChange={(e) => updateTextInputValue(activeChild.id, input.id, e.target.value)}
                            className="h-7 text-xs"
                            disabled={isGuest}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sheets Section */}
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                    📊 Sheets
                    <Badge variant="secondary" className="text-[9px]">
                      {activeChild.sheets.length}
                    </Badge>
                  </h4>
                  <div className="space-y-1.5">
                    {activeChild.sheets.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                        No sheets. Add via editor workflow.
                      </p>
                    ) : (
                      activeChild.sheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className={`rounded-lg border p-2 bg-zinc-900 space-y-1.5 cursor-pointer transition-all ${
                            activePreviewTab === sheet.id
                              ? "ring-1 ring-zinc-700 border-zinc-700"
                              : "border-zinc-800/80 hover:border-zinc-700"
                          }`}
                          onClick={() => setActivePreviewTab(sheet.id)}
                        >
                          <input
                            value={sheet.name}
                            onChange={(e) => updateSheetName(activeChild.id, sheet.id, e.target.value)}
                            className="text-xs font-medium bg-transparent border-none focus:outline-none w-full text-zinc-200"
                            placeholder="Sheet name..."
                            onClick={(e) => e.stopPropagation()}
                          />
                          {sheet.data ? (
                            <div className="text-[10px] space-y-1 relative group">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 font-medium">
                                  ✓ {sheet.data.data.length} rows × {sheet.data.columns.length} cols
                                </span>
                                {!isGuest && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      useDeskStore.getState().clearSheetData(activeChild.id, sheet.id)
                                    }}
                                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Clear data"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-0.5">
                                {sheet.data.columns.slice(0, 5).map((col, i) => (
                                  <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
                                    {col}
                                  </span>
                                ))}
                                {sheet.data.columns.length > 5 && (
                                  <span className="text-[8px] text-muted-foreground">
                                    +{sheet.data.columns.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition">
                              <FileUp className="size-3" />
                              Upload CSV
                              <input
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                onChange={(e) => handleSheetFileUpload(activeChild.id, sheet.id, e)}
                                disabled={isGuest}
                              />
                            </label>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Checkbox Fields Section */}
                {activeChild.checkboxFields.length > 0 && (
                  <div className="p-3">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                      <CheckSquare className="size-3" />
                      Toggles
                      <Badge variant="secondary" className="text-[9px]">
                        {activeChild.checkboxFields.length}
                      </Badge>
                    </h4>
                    <div className="space-y-1">
                      {activeChild.checkboxFields.map((field) => (
                        <label
                          key={field.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition"
                        >
                          <input
                            type="checkbox"
                            checked={field.checked}
                            onChange={() => toggleCheckbox(activeChild.id, field.id)}
                            disabled={isGuest}
                            className="rounded border-zinc-700 accent-zinc-400"
                          />
                          <span className="text-xs">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── Right Panel: Sheet Preview (Syncfusion) ── */}
            <ResizablePanel defaultSize={65}>
              <div className="h-full flex flex-col">
                {/* Sheet / Output preview tabs header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 overflow-x-auto bg-zinc-950">
                  <Eye className="size-3.5 text-zinc-400 shrink-0" />
                  <span className="text-xs font-medium shrink-0 text-zinc-200">Preview</span>

                  <div className="flex items-center gap-1.5 ml-2 overflow-x-auto">
                    {/* Output Preview Tab */}
                    <button
                      onClick={() => setActivePreviewTab("output_preview")}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium whitespace-nowrap ${
                        activePreviewTab === "output_preview"
                          ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                      }`}
                    >
                      <Eye className="size-3" />
                      Output Preview
                      {outputPreviewData && outputPreviewData.data && (
                        <span className="ml-0.5 opacity-90">({outputPreviewData.data.length}r)</span>
                      )}
                    </button>

                    {/* Input Sheet Tabs */}
                    {activeChild.sheets.map((sheet) => (
                      <button
                        key={sheet.id}
                        onClick={() => setActivePreviewTab(sheet.id)}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                          activePreviewTab === sheet.id
                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                            : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                        }`}
                      >
                        {sheet.name}
                        {sheet.data && (
                          <span className="ml-1 opacity-60">({sheet.data.data.length}r)</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {previewData && previewData.columns && (
                    <Badge variant="outline" className="text-[9px] ml-auto shrink-0 bg-zinc-900 text-zinc-400 border-zinc-800 font-mono">
                      {previewData.data.length} rows × {previewData.columns.length} cols
                    </Badge>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-xs text-zinc-500">Loading spreadsheet view...</div>}>
                    <div className={`w-full h-full ${previewData && previewData.columns && previewData.columns.length > 0 ? "block" : "hidden"}`}>
                      <SpreadsheetComponent
                        ref={spreadsheetRef}
                        className="w-full h-full"
                        height="100%"
                        width="100%"
                        allowOpen={false}
                        allowSave={false}
                      />
                    </div>
                  </ErrorBoundary>

                  {(!previewData || !previewData.columns || previewData.columns.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 p-6 text-center">
                      <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400">
                        <Table2 className="size-7 opacity-70" />
                      </div>
                      <div className="max-w-xs space-y-1">
                        <p className="text-xs font-semibold text-zinc-200">
                          {activePreviewTab === "output_preview" ? "No Output Preview Data Yet" : "No Sheet Data to Preview"}
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          {activePreviewTab === "output_preview"
                            ? "Run the block workflow to generate and view preview data from your Output Preview nodes."
                            : "Upload a CSV file to a sheet on the left panel, or load data from the previous BigBlock."}
                        </p>
                      </div>
                      {activePreviewTab === "output_preview" && (
                        <Button
                          size="sm"
                          onClick={() => onExecute(activeChild.id)}
                          disabled={activeChild.isExecuting}
                          className="h-7 text-xs gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-sm"
                        >
                          {activeChild.isExecuting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Play className="size-3 fill-current" />
                          )}
                          Execute Workflow
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  )
}
