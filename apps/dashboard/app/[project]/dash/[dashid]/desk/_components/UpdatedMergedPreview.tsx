"use client"

import React, { useState } from "react"
import { Sparkles, CheckCircle2, ArrowRight, Table2, X, RefreshCw, Layers, Database, Compass, Check } from "lucide-react"
import { Button } from "@/components/ui/components"
import { Badge } from "@repo/ui/components/ui/badge"
import { useDeskStore } from "@/stores/desk-store"
import { useMasterSheetStore } from "@/stores/master-sheet-store"
import { toast } from "sonner"

export function UpdatedMergedPreview() {
  const mergedPreview = useDeskStore((s) => s.mergedPreview)
  const setMergedPreview = useDeskStore((s) => s.setMergedPreview)
  const setDeskMasterSheetData = useDeskStore((s) => s.setDeskMasterSheetData)

  const [isMerging, setIsMerging] = useState(false)
  const [mergedSuccess, setMergedSuccess] = useState(false)

  if (!mergedPreview || !mergedPreview.columns || mergedPreview.columns.length === 0) {
    return null
  }

  const columns = mergedPreview.columns || []
  const data = mergedPreview.data || []
  const updates = mergedPreview.updates || []
  const sheetName = mergedPreview.sheetName || "Sheet1"
  const targetPath = mergedPreview.targetPath || "CO24554/Th."

  const handleConfirmMerge = async () => {
    setIsMerging(true)
    try {
      const msStore = useMasterSheetStore.getState()
      const deskStore = useDeskStore.getState()
      const {
        applyUpdatesToMasterSheet,
        applyUpdatesDirectlyToSyncfusion,
        extractSyncfusionInstanceData,
        openSheetInSyncfusion,
      } = await import("@/lib/sheet-utils")

      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null

      // 1. Direct cell updates to visible Syncfusion spreadsheet
      let updatedDirectly = false
      if (ss) {
        updatedDirectly = applyUpdatesDirectlyToSyncfusion(ss, updates)
      }

      // 2. Extract or calculate full updated workbook JSON
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
        updatedMasterSheet = applyUpdatesToMasterSheet(currentRaw, updates, targetPath)
      }

      // 3. Update desk store & master-sheet-store
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

      // 4. If direct update was not available, reload via openSheetInSyncfusion
      if (!updatedDirectly && ss && updatedMasterSheet) {
        openSheetInSyncfusion(ss, updatedMasterSheet)
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
        <div className="flex items-center gap-2">
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
            const isMetric = col.includes(":") || col.toLowerCase().includes("total") || col.toLowerCase().includes("attend") || col.includes("%")
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
              <tr
                key={ri}
                className="hover:bg-muted/50 transition-colors"
              >
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
          Click <strong>Confirm Merge in MasterSheet</strong> to apply these calculated columns directly into your sheet below.
        </span>
        <span className="font-mono text-[11px]">
          {data.length} records
        </span>
      </div>
    </div>
  )
}

