"use client"

import React, { useCallback, useRef, useState } from "react"
import {
  Play, Settings, FileUp, Table2, Eye, ChevronDown,
  Loader2, CheckSquare, Trash2, Edit2, Download,
} from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { Button } from "@/components/ui/components"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@repo/ui/components/ui/resizable"
import { Badge } from "@repo/ui/components/ui/badge"
import { useDeskStore, type DeskBlockState, type Dataset } from "@/stores/desk-store"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@repo/ui/components/ui/dropdown-menu"
import { deleteDeskBlock } from "../desk-block-actions"
import dynamic from "next/dynamic"

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
  block: DeskBlockState
  blockIndex: number
  totalBlocks: number
  isGuest: boolean
  dashid: string
  onExecute: (blockId: string) => void
  previousBlockOutput?: Dataset | null
}

export function DeskBlock({
  block,
  blockIndex,
  totalBlocks,
  isGuest,
  dashid,
  onExecute,
  previousBlockOutput,
}: DeskBlockProps) {
  const router = useRouter()
  const pathname = usePathname()
  const spreadsheetRef = useRef<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)

  const {
    updateTextInputValue,
    updateTextInputPlaceholder,
    updateSheetData,
    updateSheetName,
    toggleCheckbox,
  } = useDeskStore()

  // Get the currently previewed sheet data
  const activeSheet = block.sheets.find((s) => s.id === activeSheetId)
  const previewData: Dataset | null = activeSheet?.data ?? null

  // Auto-select first sheet with data for preview
  React.useEffect(() => {
    if (activeSheetId) return
    const sheetWithData = block.sheets.find((s) => s.data)
    if (sheetWithData) setActiveSheetId(sheetWithData.id)
    else if (block.sheets.length > 0) setActiveSheetId(block.sheets[0].id)
  }, [block.sheets, activeSheetId])

  // ─── File upload for sheets ─────────────────────────────
  const handleSheetFileUpload = useCallback((sheetId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const parsed = parseCSV(text)
      if (parsed.columns.length > 0) {
        updateSheetData(block.id, sheetId, parsed)
        setActiveSheetId(sheetId) // Auto-preview the uploaded sheet
        toast.success(`Loaded ${parsed.data.length} rows`)
      } else {
        toast.error("Could not parse file — ensure it's a valid CSV")
      }
    }
    reader.readAsText(file)
  }, [block.id, updateSheetData])

  // ─── Load previous block output into a sheet ────────────
  const handleLoadPreviousIntoSheet = useCallback((sheetId: string) => {
    if (!previousBlockOutput) return
    updateSheetData(block.id, sheetId, previousBlockOutput)
    setActiveSheetId(sheetId)
    toast.success(`Loaded ${previousBlockOutput.data.length} rows from Block ${blockIndex}`)
  }, [block.id, blockIndex, previousBlockOutput, updateSheetData])

  // ─── Navigate to block editor ───────────────────────────
  const openEditor = useCallback(() => {
    if (isGuest) {
      toast.error("You don't have permission to edit this block's workflow")
      return
    }
    const segments = pathname.split("/")
    const projectSlug = segments[1] || "dashboard"
    router.push(`/${projectSlug}/dash/${dashid}/desk/editor/${block.editorWorkflowId}`)
  }, [isGuest, pathname, dashid, block.editorWorkflowId, router])

  // ─── Delete block ─────────────────────────────────────────
  const handleDeleteBlock = useCallback(async () => {
    if (isGuest) return
    if (confirm("Are you sure you want to delete this block? This cannot be undone.")) {
      setIsDeleting(true)
      try {
        await deleteDeskBlock(block.id)
        useDeskStore.getState().removeBlock(block.id)
        toast.success("Block deleted")
        router.refresh()
      } catch (err) {
        toast.error("Failed to delete block")
        setIsDeleting(false)
      }
    }
  }, [isGuest, block.id, router])

  // ─── Load preview data into Syncfusion ──────────────────
  React.useEffect(() => {
    if (!spreadsheetRef.current || !previewData) return
    const timer = setTimeout(() => {
      const ss = spreadsheetRef.current
      if (!ss || !ss.updateCell) return
      try {
        previewData.columns.forEach((col, colIdx) => {
          const cellAddr = `${colLetter(colIdx)}1`
          ss.updateCell(
            { value: col, style: { fontWeight: "bold", backgroundColor: "#e2e8f0" } },
            cellAddr
          )
        })
        previewData.data.forEach((row, rowIdx) => {
          row.forEach((cell: any, colIdx: number) => {
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden">
      {/* ─── Block Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
            {blockIndex + 1}
          </div>
          <span className="text-sm font-semibold text-zinc-200">
            Block {blockIndex + 1}
          </span>
          {block.isExecuting && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              <Loader2 className="size-3 animate-spin mr-1" />
              Running...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            onClick={() => onExecute(block.id)}
            disabled={block.isExecuting}
          >
            {block.isExecuting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            Execute
          </Button>
          {!isGuest && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Settings className="size-3.5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditor} className="cursor-pointer text-xs">
                  <Edit2 className="mr-2 size-3.5" />
                  Open Editor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteBlock} className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600">
                  <Trash2 className="mr-2 size-3.5" />
                  Delete Block
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ─── Block Content: Split View ─────────────────────── */}
      <ResizablePanelGroup direction="horizontal" className="min-h-[280px]">
        {/* ── Left Panel: Inputs ── */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="h-full overflow-y-auto">
            {/* Previous block output as input (for blocks > 0) */}
            {blockIndex > 0 && previousBlockOutput && (
              <div className="p-3 border-b">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <ChevronDown className="size-3" />
                  Input from Block {blockIndex}
                </h4>
                <div className="text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5 flex items-center justify-between">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {previousBlockOutput.data.length} rows × {previousBlockOutput.columns.length} cols
                  </span>
                  {/* Load into sheet dropdown */}
                  {block.sheets.length > 0 && !isGuest && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-1 text-blue-600 hover:text-blue-700">
                          <Download className="size-3" />
                          Load into sheet
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {block.sheets.map((sheet) => (
                          <DropdownMenuItem
                            key={sheet.id}
                            className="cursor-pointer text-xs"
                            onClick={() => handleLoadPreviousIntoSheet(sheet.id)}
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
                  {block.textInputs.length}
                </Badge>
              </h4>
              <div className="space-y-1.5">
                {block.textInputs.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                    No text inputs. Add via editor workflow.
                  </p>
                ) : (
                  block.textInputs.map((input) => (
                    <div key={input.id} className="rounded-lg border p-2 bg-background space-y-1">
                      <input
                        value={input.placeholder}
                        onChange={(e) => updateTextInputPlaceholder(block.id, input.id, e.target.value)}
                        className="w-full text-[10px] font-medium text-muted-foreground bg-transparent border-none focus:outline-none"
                        placeholder="Label..."
                        readOnly
                      />
                      <Input
                        placeholder={input.placeholder}
                        value={input.value}
                        onChange={(e) => updateTextInputValue(block.id, input.id, e.target.value)}
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
                  {block.sheets.length}
                </Badge>
              </h4>
              <div className="space-y-1.5">
                {block.sheets.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3 italic">
                    No sheets. Add via editor workflow.
                  </p>
                ) : (
                  block.sheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={`rounded-lg border p-2 bg-background space-y-1.5 cursor-pointer transition-all ${
                        activeSheetId === sheet.id
                          ? "ring-2 ring-orange-500 border-orange-500"
                          : "hover:border-zinc-600"
                      }`}
                      onClick={() => setActiveSheetId(sheet.id)}
                    >
                      <input
                        value={sheet.name}
                        onChange={(e) => updateSheetName(block.id, sheet.id, e.target.value)}
                        className="text-xs font-medium bg-transparent border-none focus:outline-none w-full"
                        placeholder="Sheet name..."
                        onClick={(e) => e.stopPropagation()}
                      />
                      {sheet.data ? (
                        <div className="text-[10px] space-y-1 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-orange-600 font-medium">
                              ✅ {sheet.data.data.length} rows × {sheet.data.columns.length} cols
                            </span>
                            {!isGuest && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  useDeskStore.getState().clearSheetData(block.id, sheet.id)
                                }}
                                className="text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Clear data"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {sheet.data.columns.slice(0, 5).map((col, i) => (
                              <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
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
                            onChange={(e) => handleSheetFileUpload(sheet.id, e)}
                            disabled={isGuest}
                          />
                        </label>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Checkbox Fields Section (from TrueFalseNode) */}
            {block.checkboxFields.length > 0 && (
              <div className="p-3">
                <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-2">
                  <CheckSquare className="size-3" />
                  Toggles
                  <Badge variant="secondary" className="text-[9px]">
                    {block.checkboxFields.length}
                  </Badge>
                </h4>
                <div className="space-y-1">
                  {block.checkboxFields.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={field.checked}
                        onChange={() => toggleCheckbox(block.id, field.id)}
                        disabled={isGuest}
                        className="rounded border-zinc-600 accent-teal-500"
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
            {/* Sheet tabs header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 overflow-x-auto">
              <Eye className="size-3.5 text-orange-500 shrink-0" />
              <span className="text-xs font-medium shrink-0">Preview</span>
              {block.sheets.length > 0 && (
                <div className="flex gap-1 ml-2">
                  {block.sheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => setActiveSheetId(sheet.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        activeSheetId === sheet.id
                          ? "bg-orange-500 text-white font-medium"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {sheet.name}
                      {sheet.data && (
                        <span className="ml-1 opacity-60">({sheet.data.data.length}r)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {previewData && (
                <Badge variant="secondary" className="text-[9px] ml-auto shrink-0">
                  {previewData.data.length} rows × {previewData.columns.length} cols
                </Badge>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {previewData && previewData.columns.length > 0 ? (
                <SpreadsheetComponent
                  ref={spreadsheetRef}
                  className="w-full h-full"
                  height="100%"
                  width="100%"
                  allowOpen={false}
                  allowSave={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <div className="p-3 rounded-2xl bg-muted/50">
                    <Table2 className="size-6 opacity-40" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium mb-0.5">No data to preview</p>
                    <p className="text-[10px] max-w-[220px]">
                      Upload a CSV to a sheet on the left, or load data from the previous block.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
