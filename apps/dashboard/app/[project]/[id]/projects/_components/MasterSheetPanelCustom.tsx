"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Download, Upload, Check } from "lucide-react"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import dynamic from "next/dynamic"
import { unwrapSyncfusionJson, openSheetInSyncfusion, extractSyncfusionSaveData } from "@/lib/sheet-utils"

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
    const raw = spreadsheetRef.current
    const ss = raw?.ej2Instances?.[0] || raw
    if (ss) {
      ssInstanceRef.current = ss
    }
  }

  // Helper to safely get the real Syncfusion instance
  const getSsInstance = () => {
    const raw = ssInstanceRef.current || spreadsheetRef.current
    if (!raw) return null
    if (raw.ej2Instances) {
      return Array.isArray(raw.ej2Instances) ? raw.ej2Instances[0] : raw.ej2Instances
    }
    return raw
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

  // Export full Syncfusion workbook state as JSON (preserves merged cells, styles, spans, formulas)
  const handleExportSheet = async () => {
    const ss = getSsInstance()
    if (!ss || typeof ss.saveAsJson !== "function") {
      alert("Spreadsheet is not ready yet. Please wait a moment and try again.")
      return
    }

    const filename = `${sheetName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`

    try {
      const savePromise = ss.saveAsJson()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Export timed out. Please try again.")), 15000)
      )

      const result = await Promise.race([savePromise, timeoutPromise])
      const jsonObject = extractSyncfusionSaveData(result)

      if (!jsonObject || Object.keys(jsonObject).length === 0) {
        alert("Spreadsheet returned empty data. Please add content first.")
        return
      }

      downloadJson(jsonObject, filename)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (err: any) {
      console.error("Export error:", err)
      alert(err?.message || "Export failed. Please try again.")
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
          const ss = getSsInstance()
          if (!ss) return

          openSheetInSyncfusion(ss, parsed)
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
