"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Search, RefreshCw, Save, Upload, Lock } from "lucide-react"
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
      if (!ss || !ss.updateCell) return
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

    if (ss && ss.getActiveSheet) {
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
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b bg-gradient-to-r from-zinc-900 to-zinc-800">
        <div className="flex items-center gap-2">
          <Table2 className="size-4 text-purple-500" />
          <span className="text-sm font-semibold text-zinc-200">Master Sheet</span>
          {masterSheetPreview && (
            <Badge variant="secondary" className="text-[9px]">
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
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                ab.triggered
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
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
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isOwner
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm cursor-pointer"
                : "bg-zinc-900/80 text-zinc-500 border border-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
          >
            {isOwner ? (
              <>
                <Upload className="size-3.5 text-zinc-400" />
                Import Template
              </>
            ) : (
              <>
                <Lock className="size-3.5 text-zinc-500" />
                Owner Only
              </>
            )}
          </button>

          {/* Save Sheet Button */}
          <button
            onClick={handleSaveSheet}
            disabled={isSaving}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {saveSuccess ? (
              "✓ Saved"
            ) : isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="size-3.5" />
                Save Sheet
              </>
            )}
          </button>
        </div>

        {/* Master Sheet ID input */}
        <div className="flex items-center gap-1.5">
          <Search className="size-3 text-muted-foreground" />
          <Input
            value={mastersheetId}
            onChange={(e) => setMastersheetId(e.target.value)}
            placeholder="MasterSheet Node ID..."
            className="h-6 text-[10px] w-[160px] bg-zinc-900/50 border-zinc-700"
          />
        </div>
      </div>

      {/* Always show Syncfusion spreadsheet — blank or with data */}
      <div className="h-[350px]">
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
