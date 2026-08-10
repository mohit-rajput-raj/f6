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

  const [isMounted, setIsMounted] = useState(false)
  const [sheetName] = useState("Master Sheet Custom")
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Export handler: Saves 100% full Syncfusion spreadsheet JSON object (preserving all merged cells, styles, headers, colors, images)
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
      a.download = `${sheetName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (err) {
      console.error("Export failed:", err)
      alert("Failed to export complete spreadsheet template.")
    }
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
          const ss = spreadsheetRef.current
          if (!ss || !ss.element) return

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
