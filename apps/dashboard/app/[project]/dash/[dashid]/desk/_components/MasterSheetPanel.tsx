"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Search, RefreshCw, Save, Upload, Lock, Download, Check } from "lucide-react"
import { useDeskStore, type Dataset } from "@/stores/desk-store"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
import { useSession } from "@/lib/auth-client"
import { useParams } from "next/navigation"
import {
  getMasterSheets,
  upsertMasterSheetByName,
  checkIsDeskOwner,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions"
import dynamic from "next/dynamic"

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
)

function colLetter(idx: number): string {
  let result = ""
  let n = idx
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

export function MasterSheetPanel() {
  const masterSheetPreview = useDeskStore((s) => s.masterSheetPreview)
  const setMasterSheetPreview = useDeskStore((s) => s.setMasterSheetPreview)
  const blocks = useDeskStore((s) => s.blocks)
  const spreadsheetRef = useRef<any>(null)
  const [mastersheetId, setMastersheetId] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [sheetName, setSheetName] = useState("Master Sheet")
  const [isLoadingDb, setIsLoadingDb] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const { data: session } = useSession()
  const userId = session?.user?.id
  const userEmail = session?.user?.email ?? ""
  const params = useParams()
  const dashid = params?.dashid as string | undefined

  // Wait for mount before rendering Syncfusion
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check desk owner status
  useEffect(() => {
    if (!dashid || !userId) return
    checkIsDeskOwner(dashid, userId).then((owner) => setIsOwner(owner))
  }, [dashid, userId])

  // Auto-fetch MasterSheet from DB for this desk on mount
  useEffect(() => {
    if (!dashid || !userId) return
    const fetchDeskSheet = async () => {
      setIsLoadingDb(true)
      try {
        const sheets = await getMasterSheets(dashid, userId, userEmail)
        if (sheets && sheets.length > 0) {
          const mainSheet = sheets[0]
          if (mainSheet.data?.columns) {
            setSheetName(mainSheet.name || "Master Sheet")
            setMasterSheetPreview({
              columns: mainSheet.data.columns ?? [],
              data: mainSheet.data.data ?? [],
            })
          }
        }
      } catch (err) {
        console.warn("Could not load desk master sheet:", err)
      } finally {
        setIsLoadingDb(false)
      }
    }

    fetchDeskSheet()
  }, [dashid, userId, userEmail, setMasterSheetPreview])

  // Load data into Syncfusion when masterSheetPreview changes
  useEffect(() => {
    if (!spreadsheetRef.current || !masterSheetPreview) return
    const timer = setTimeout(() => {
      const ss = spreadsheetRef.current
      if (!ss || !ss.element || !ss.updateCell) return
      try {
        masterSheetPreview.columns.forEach((col, colIdx) => {
          const cellAddr = `${colLetter(colIdx)}1`
          ss.updateCell(
            { value: col, style: { fontWeight: "bold", backgroundColor: "#e2e8f0" } },
            cellAddr
          )
        })
        masterSheetPreview.data.forEach((row, rowIdx) => {
          row.forEach((cell: any, colIdx: number) => {
            const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`
            ss.updateCell({ value: String(cell ?? "") }, cellAddr)
          })
        })
      } catch (err) {
        console.warn("Master sheet update failed:", err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [masterSheetPreview])

  // Save current spreadsheet data back to DB
  const handleSaveSheet = async () => {
    if (!userId) return
    const ss = spreadsheetRef.current
    let columns: string[] = []
    let rows: string[][] = []

    if (ss && ss.element && ss.getActiveSheet) {
      try {
        const sheet = ss.getActiveSheet()
        const sheetRows = sheet?.rows || []
        if (sheetRows[0]?.cells) {
          columns = sheetRows[0].cells
            .map((c: any) => c?.value ?? "")
            .filter((v: string) => String(v).trim() !== "")
        }
        for (let r = 1; r < sheetRows.length; r++) {
          const row = sheetRows[r]
          if (!row?.cells) continue
          const rowData = row.cells
            .slice(0, columns.length)
            .map((c: any) => c?.value ?? "")
          if (rowData.some((v: string) => String(v).trim() !== "")) {
            rows.push(rowData)
          }
        }
      } catch (err) {
        console.warn("Spreadsheet read warning:", err)
      }
    }

    if (columns.length === 0 && masterSheetPreview?.columns) {
      columns = masterSheetPreview.columns
      rows = masterSheetPreview.data || []
    }

    setIsSaving(true)
    try {
      await upsertMasterSheetByName({
        userId,
        name: sheetName || "Master Sheet",
        data: { columns, data: rows },
        dashid,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error("Failed to save MasterSheet:", err)
      alert("Failed to save MasterSheet.")
    } finally {
      setIsSaving(false)
    }
  }

  // Export full spreadsheet state as JSON file (preserving merged cells, styles, formatting)
  const handleExportSheet = async () => {
    const ss = spreadsheetRef.current
    if (!ss || !ss.element) return

    try {
      let exportData: any = null
      if (ss.saveAsJson) {
        const result = await ss.saveAsJson()
        exportData = (result as any)?.jsonObject || result
      }

      if (!exportData) {
        alert("Spreadsheet not ready or could not capture spreadsheet JSON state.")
        return
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(sheetName || "master-sheet").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (err) {
      console.error("Export failed:", err)
      alert("Failed to export spreadsheet template.")
    }
  }

  // Import custom template JSON — OWNER ONLY
  const handleImportTemplate = () => {
    if (!isOwner) {
      alert("Only the desk owner can import a template into this MasterSheet.")
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.columns && Array.isArray(data.columns)) {
            const ss = spreadsheetRef.current
            if (ss) {
              try {
                const sheet = ss.getActiveSheet?.()
                if (sheet?.usedRange) {
                  const lastRow = sheet.usedRange.rowIndex || 50
                  const lastCol = sheet.usedRange.colIndex || 20
                  const clearRange = `A1:${colLetter(lastCol)}${lastRow + 1}`
                  ss.clear?.({ range: clearRange, type: "Clear All" })
                }

                data.columns.forEach((col: string, colIdx: number) => {
                  const cellAddr = `${colLetter(colIdx)}1`
                  ss.updateCell(
                    { value: col, style: { fontWeight: "bold", backgroundColor: "#e2e8f0" } },
                    cellAddr
                  )
                })

                const sampleRows = data.sampleRows || []
                sampleRows.forEach((row: any[], rowIdx: number) => {
                  row.forEach((cell: any, colIdx: number) => {
                    const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`
                    ss.updateCell({ value: String(cell ?? "") }, cellAddr)
                  })
                })
              } catch (err) {
                console.warn("Import populate warning:", err)
              }
            }

            // Update DB
            await upsertMasterSheetByName({
              userId: userId!,
              name: sheetName || "Master Sheet",
              data: { columns: data.columns, data: data.sampleRows || [] },
              dashid,
            })
            alert("Template imported and saved to MasterSheet successfully!")
          } else {
            alert("Invalid template file. Must contain a 'columns' array.")
          }
        } catch {
          alert("Failed to parse template file.")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="size-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200 tracking-tight">Master Sheet</span>
          {masterSheetPreview && (
            <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-400 border-zinc-800 font-mono font-normal">
              {masterSheetPreview.data.length} rows × {masterSheetPreview.columns.length} cols
            </Badge>
          )}
        </div>

        {/* Action Buttons & Sheet Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action Buttons from Blocks */}
          {blocks.flatMap(b => (b.actionButtons || []).map(a => ({ ...a, blockId: b.id }))).map(ab => (
            <button
              key={ab.id}
              onClick={() => useDeskStore.getState().triggerActionButton(ab.blockId, ab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                ab.triggered
                  ? "bg-zinc-800 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm"
              }`}
            >
              {ab.label || "Action"}
            </button>
          ))}

          {/* Owner-Only Import Template Button */}
          <button
            onClick={handleImportTemplate}
            disabled={!isOwner}
            title={isOwner ? "Import template JSON file" : "Only desk owner can import template"}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-sm ${
              isOwner
                ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border-zinc-800 cursor-pointer"
                : "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-60"
            }`}
          >
            {isOwner ? (
              <>
                <Upload className="size-3.5 text-zinc-400" />
                Import Template
              </>
            ) : (
              <>
                <Lock className="size-3.5 text-zinc-600" />
                Owner Only
              </>
            )}
          </button>

          {/* Export Sheet Button */}
          <button
            onClick={handleExportSheet}
            title="Export full spreadsheet template JSON"
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {exportSuccess ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                Exported
              </>
            ) : (
              <>
                <Download className="size-3.5 text-zinc-400" />
                Export Sheet
              </>
            )}
          </button>

          {/* Save Sheet Button */}
          <button
            onClick={handleSaveSheet}
            disabled={isSaving}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {saveSuccess ? (
              "✓ Saved"
            ) : isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="size-3.5 text-zinc-900" />
                Save Sheet
              </>
            )}
          </button>
        </div>

        {/* Master Sheet ID input */}
        <div className="flex items-center gap-1.5">
          <Search className="size-3 text-zinc-500" />
          <Input
            value={mastersheetId}
            onChange={(e) => setMastersheetId(e.target.value)}
            placeholder="MasterSheet Node ID..."
            className="h-7 text-[11px] w-[160px] bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700"
          />
        </div>
      </div>

      {/* Always show Syncfusion spreadsheet — blank or with data */}
      <div className="h-[520px] min-h-[450px] w-full">
        {isMounted ? (
          <SpreadsheetComponent
            ref={spreadsheetRef}
            className="w-full h-full"
            height="100%"
            width="100%"
            allowEditing={true}
            allowOpen={false}
            allowSave={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Loading spreadsheet...
          </div>
        )}
      </div>
    </div>
  )
}
