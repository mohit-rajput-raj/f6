"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Search } from "lucide-react"
import { useDeskStore, type Dataset } from "@/stores/desk-store"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
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
  const blocks = useDeskStore((s) => s.blocks)
  const spreadsheetRef = useRef<any>(null)
  const [mastersheetId, setMastersheetId] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  // Wait for mount before rendering Syncfusion to avoid querySelectorAll on null
  useEffect(() => {
    setIsMounted(true)
  }, [])

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

  return (
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-gradient-to-r from-zinc-900 to-zinc-800">
        <div className="flex items-center gap-2">
          <Table2 className="size-4 text-purple-500" />
          <span className="text-sm font-semibold text-zinc-200">Master Sheet</span>
          {masterSheetPreview && (
            <Badge variant="secondary" className="text-[9px]">
              {masterSheetPreview.data.length} rows × {masterSheetPreview.columns.length} cols
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 ml-4 flex-wrap">
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
        </div>

        {/* Master Sheet ID input */}
        <div className="ml-auto flex items-center gap-1.5">
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
      <div className="h-[300px]">
        {isMounted ? (
          <SpreadsheetComponent
            ref={spreadsheetRef}
            className="w-full h-full"
            height="100%"
            width="100%"
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
