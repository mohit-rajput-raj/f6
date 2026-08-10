"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Download, Upload, Check } from "lucide-react"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import dynamic from "next/dynamic"

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
)

interface MasterSheetPanelCustomProps {
  spreadsheetRef?: React.RefObject<any>
}

export function MasterSheetPanelCustom({ spreadsheetRef: externalRef }: MasterSheetPanelCustomProps) {
  const internalRef = useRef<any>(null)
  const spreadsheetRef = externalRef || internalRef
  const ssInstanceRef = useRef<any>(null)

  const [isMounted, setIsMounted] = useState(false)
  const [sheetName] = useState("Master Sheet Custom")
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Callback when Syncfusion spreadsheet is fully created and ready
  const onSpreadsheetCreated = () => {
    const ss = spreadsheetRef.current
    if (ss) {
      ssInstanceRef.current = ss
    }
  }

  // Helper to safely get the real Syncfusion instance
  const getSsInstance = () => {
    // Prefer the instance captured via created callback
    if (ssInstanceRef.current) return ssInstanceRef.current
    // Fallback: try unwrapping from React ref
    if (!spreadsheetRef.current) return null
    const curr = spreadsheetRef.current
    if (curr.ej2Instances) {
      return Array.isArray(curr.ej2Instances) ? curr.ej2Instances[0] : curr.ej2Instances
    }
    return curr
  }

  // Download helper — guaranteed to trigger a file download
  const downloadJson = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  }

  // Export spreadsheet data as JSON
  const handleExportSheet = () => {
    console.log("[MasterSheetPanelCustom] Export clicked")

    const filename = `${sheetName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`

    const ss = ssInstanceRef.current || spreadsheetRef.current
    console.log("[MasterSheetPanelCustom] ss instance:", !!ss, "saveAsJson:", typeof ss?.saveAsJson)

    if (ss && typeof ss.saveAsJson === "function") {
      const timeout = setTimeout(() => {
        console.warn("[MasterSheetPanelCustom] saveAsJson timed out, using fallback")
        exportFallbackCustom(filename, ss)
      }, 3000)

      ss.saveAsJson()
        .then((result: any) => {
          clearTimeout(timeout)
          const exportData = result?.jsonObject || result
          if (exportData && Object.keys(exportData).length > 0) {
            downloadJson(exportData, filename)
            setExportSuccess(true)
            setTimeout(() => setExportSuccess(false), 2000)
          } else {
            exportFallbackCustom(filename, ss)
          }
        })
        .catch((err: any) => {
          clearTimeout(timeout)
          console.warn("[MasterSheetPanelCustom] saveAsJson error:", err)
          exportFallbackCustom(filename, ss)
        })
    } else {
      exportFallbackCustom(filename, ss)
    }
  }

  const exportFallbackCustom = (filename: string, ss: any) => {
    let exportData: any = null

    if (ss && typeof ss.getActiveSheet === "function") {
      try {
        const sheet = ss.getActiveSheet()
        const sheetRows = sheet?.rows || []
        let columns: string[] = []
        let rows: string[][] = []

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
        if (columns.length > 0) {
          exportData = { name: sheetName, columns, sampleRows: rows }
        }
      } catch (err) {
        console.warn("[MasterSheetPanelCustom] getActiveSheet fallback failed:", err)
      }
    }

    if (!exportData) {
      alert("No spreadsheet data available to export. Please add data first.")
      return
    }

    downloadJson(exportData, filename)
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 2000)
  }

  // Import handler: Loads complete Syncfusion JSON state (matching microSheetAgent loadJson pattern)
  const handleImportTemplate = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          const ss = getSsInstance()
          if (!ss) return

          const fileToOpen = parsed.Workbook ? parsed : (parsed.jsonObject || parsed)

          if (ss.openFromJson) {
            await ss.openFromJson({ file: fileToOpen })
          } else if (ss.open) {
            await ss.open({ file: fileToOpen })
          }
        } catch (err) {
          console.error("Import failed:", err)
          alert("Failed to parse template JSON file.")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col h-full w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="size-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200 tracking-tight">
            Master Sheet Custom
          </span>
          <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-400 border-zinc-800 font-mono font-normal">
            Full State Export Active
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportTemplate}
            className="h-7 px-2.5 text-xs font-medium bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="size-3.5 text-zinc-400" />
            Import Template
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExportSheet}
            className="h-7 px-2.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
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
          </Button>
        </div>
      </div>

      {/* Syncfusion spreadsheet container */}
      <div className="flex-1 w-full h-full min-h-0 bg-white">
        {isMounted ? (
          <SpreadsheetComponent
            ref={spreadsheetRef}
            created={onSpreadsheetCreated}
            className="w-full h-full"
            height="100%"
            width="100%"
            sheets={[{ name: "Sheet1", showGridLines: true }]}
            showRibbon={true}
            showFormulaBar={true}
            allowEditing={true}
            allowOpen={false}
            allowSave={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-mono bg-zinc-950">
            Loading spreadsheet...
          </div>
        )}
      </div>
    </div>
  )
}

export default MasterSheetPanelCustom
