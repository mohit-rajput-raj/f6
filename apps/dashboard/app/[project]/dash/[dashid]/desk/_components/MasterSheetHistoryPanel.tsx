"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  History,
  RotateCcw,
  Plus,
  Clock,
  FileText,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Eye,
} from "lucide-react"
import { useMasterSheetStore, type SheetHistorySnapshot } from "@/stores/master-sheet-store"
import { useDeskStore } from "@/stores/desk-store"
import { Badge } from "@repo/ui/components/ui/badge"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog"
import dynamic from "next/dynamic"
import { openSheetInSyncfusion } from "@/lib/sheet-utils"

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
)

// ── Relative time helper ──
function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Date formatter ──
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

// ── Action badge color mapping ──
function getActionStyle(action: string): { bg: string; text: string; border: string } {
  const lower = action.toLowerCase()
  if (lower.includes("merge")) return { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" }
  if (lower.includes("save")) return { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" }
  if (lower.includes("checkpoint") || lower.includes("manual")) return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" }
  return { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" }
}

export function MasterSheetHistoryPanel() {
  const sheetHistories = useMasterSheetStore((s) => s.sheetHistories)
  const activeSheetTab = useMasterSheetStore((s) => s.activeSheetTab)
  const allSheetTabs = useMasterSheetStore((s) => s.allSheetTabs)
  const setActiveSheetTab = useMasterSheetStore((s) => s.setActiveSheetTab)
  const addSheetSnapshot = useMasterSheetStore((s) => s.addSheetSnapshot)
  const isViewer = useDeskStore((s) => s.isViewer)

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false)
  const [previewingSnapshot, setPreviewingSnapshot] = useState<SheetHistorySnapshot | null>(null)
  const historySpreadsheetRef = useRef<any>(null)

  // Load preview data into history spreadsheet component
  const onHistorySpreadsheetCreated = () => {
    const ss = historySpreadsheetRef.current
    if (!ss || !previewingSnapshot?.data) return
    openSheetInSyncfusion(ss, previewingSnapshot.data)
  }

  useEffect(() => {
    if (!previewingSnapshot) return
    const timer = setTimeout(() => {
      const ss = historySpreadsheetRef.current
      if (ss && previewingSnapshot.data) {
        openSheetInSyncfusion(ss, previewingSnapshot.data)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [previewingSnapshot])

  // Current sheet's snapshots
  const snapshots = sheetHistories[activeSheetTab] || []

  // ── ReOpen (Restore) handler ──
  const handleReOpen = async (snapshot: SheetHistorySnapshot) => {
    if (isViewer) {
      toast.error("Viewers cannot restore snapshots")
      return
    }
    setRestoringId(snapshot.id)
    try {
      const { restoreSheetFromSnapshot } = await import("@/lib/sheet-utils")
      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null

      if (!ss) {
        toast.error("Spreadsheet not available. Please wait and try again.")
        return
      }

      const success = await restoreSheetFromSnapshot(ss, snapshot.sheetName, snapshot.data)
      if (success) {
        setRestoredId(snapshot.id)
        toast.success(`Restored "${snapshot.sheetName}" to version from ${relativeTime(snapshot.timestamp)}`)
        setTimeout(() => setRestoredId(null), 3000)
      } else {
        toast.error("Failed to restore snapshot. Sheet may not exist.")
      }
    } catch (err: any) {
      console.error("ReOpen failed:", err)
      toast.error("Restore failed: " + (err?.message || "Unknown error"))
    } finally {
      setRestoringId(null)
    }
  }

  // ── Manual Checkpoint handler ──
  const handleCreateCheckpoint = async () => {
    if (isViewer) {
      toast.error("Viewers cannot create checkpoints")
      return
    }
    setIsCreatingCheckpoint(true)
    try {
      const { extractSingleSheetSnapshot, countSheetRowsCols } = await import("@/lib/sheet-utils")
      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null

      if (!ss) {
        toast.error("Spreadsheet not available.")
        return
      }

      const snapshotData = extractSingleSheetSnapshot(ss, activeSheetTab)
      if (!snapshotData) {
        toast.error("Could not capture snapshot. Sheet may be empty.")
        return
      }

      const dims = countSheetRowsCols(snapshotData)
      addSheetSnapshot(activeSheetTab, {
        sheetName: activeSheetTab,
        timestamp: Date.now(),
        action: "Manual Checkpoint",
        changeSummary: "Manual checkpoint created by user",
        data: snapshotData,
        rowCount: dims.rowCount,
        colCount: dims.colCount,
      })

      toast.success(`Checkpoint created for "${activeSheetTab}"`)
    } catch (err: any) {
      console.error("Checkpoint failed:", err)
      toast.error("Failed to create checkpoint")
    } finally {
      setIsCreatingCheckpoint(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-card overflow-hidden flex flex-col mt-3">
      {/* ── Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 rounded-md bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20">
            <History className="size-3.5 text-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 tracking-tight">
              Sheet Version History
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-zinc-900 text-zinc-500 border-zinc-800 font-mono font-normal"
            >
              {snapshots.length} {snapshots.length === 1 ? "Snapshot" : "Snapshots"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Create Checkpoint Button — hidden for viewers */}
          {!isViewer && (
            <button
              onClick={handleCreateCheckpoint}
              disabled={isCreatingCheckpoint}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingCheckpoint ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
              Create Checkpoint
            </button>
          )}
          {isViewer && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
            >
              View Only
            </Badge>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* ── Sheet Tab Pills ── */}
          {allSheetTabs.length > 1 && (
            <div className="px-4 py-2 border-b border-zinc-800/60 bg-zinc-950/50 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-zinc-600 font-medium shrink-0 mr-1">Sheet:</span>
              {allSheetTabs.map((tab) => {
                const isActive = tab === activeSheetTab
                const count = (sheetHistories[tab] || []).length
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveSheetTab(tab)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border whitespace-nowrap ${
                      isActive
                        ? "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-500/10"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {tab}
                    {count > 0 && (
                      <span className={`ml-1.5 text-[9px] ${isActive ? "text-violet-400/70" : "text-zinc-600"}`}>
                        ({count})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Snapshots List ── */}
          {snapshots.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="flex items-center justify-center size-12 rounded-xl bg-zinc-900 border border-zinc-800 mb-3">
                <FileText className="size-5 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400 mb-1">
                No snapshots yet for &quot;{activeSheetTab}&quot;
              </p>
              <p className="text-xs text-zinc-600 max-w-[280px]">
                Snapshots are automatically created before each save and merge.
                You can also create manual checkpoints.
              </p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              <div className="divide-y divide-zinc-800/60">
                {snapshots.map((snap, idx) => {
                  const version = snapshots.length - idx
                  const actionStyle = getActionStyle(snap.action)
                  const isRestoring = restoringId === snap.id
                  const isRestored = restoredId === snap.id

                  return (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-900/50 transition-colors group"
                    >
                      {/* Left: Version + Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Version Badge */}
                        <div className="flex items-center justify-center size-7 rounded-md bg-zinc-900 border border-zinc-800 shrink-0">
                          <span className="text-[10px] font-bold text-zinc-400 font-mono">
                            v{version}
                          </span>
                        </div>

                        <div className="min-w-0">
                          {/* Action Badge + Timestamp */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                            >
                              {snap.action}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono">
                              {formatDate(snap.timestamp)}
                            </span>
                            <span className="text-[10px] text-zinc-700">
                              ({relativeTime(snap.timestamp)})
                            </span>
                          </div>

                          {/* Change Summary + Stats */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-zinc-500 truncate max-w-[260px]">
                              {snap.changeSummary}
                            </span>
                            {(snap.rowCount || snap.colCount) && (
                              <span className="text-[10px] text-zinc-700 font-mono shrink-0">
                                {snap.rowCount ?? "?"} × {snap.colCount ?? "?"} 
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Preview + ReOpen) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Preview Overlay Button */}
                        <button
                          onClick={() => setPreviewingSnapshot(snap)}
                          className="px-2 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all border border-zinc-800 bg-zinc-900 hover:bg-violet-600/15 text-zinc-400 hover:text-violet-300 hover:border-violet-500/30 cursor-pointer shadow-sm opacity-0 group-hover:opacity-100"
                          title="Preview snapshot in spreadsheet overlay"
                        >
                          <Eye className="size-3 text-zinc-400" />
                          Preview
                        </button>

                        {/* ReOpen (Restore) Button — hidden for viewers */}
                        {!isViewer && (
                          <button
                            onClick={() => handleReOpen(snap)}
                            disabled={isRestoring}
                            title="Restore this snapshot"
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all border shadow-sm cursor-pointer ${
                              isRestored
                                ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                                : isRestoring
                                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                : "bg-zinc-900 hover:bg-violet-600/15 text-zinc-400 hover:text-violet-300 border-zinc-800 hover:border-violet-500/30 opacity-0 group-hover:opacity-100"
                            } disabled:cursor-not-allowed`}
                          >
                            {isRestored ? (
                              <>
                                <Check className="size-3" />
                                Restored
                              </>
                            ) : isRestoring ? (
                              <>
                                <Loader2 className="size-3 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="size-3" />
                                ReOpen
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Snapshot Preview Overlay Modal */}
      <Dialog
        open={Boolean(previewingSnapshot)}
        onOpenChange={(open) => {
          if (!open) setPreviewingSnapshot(null)
        }}
      >
        <DialogContent className="min-w-[92%] max-w-[92%] min-h-[90vh] max-h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-6 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4 text-violet-400" />
                <span>Snapshot Preview: {previewingSnapshot?.sheetName}</span>
                {previewingSnapshot && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      getActionStyle(previewingSnapshot.action).bg
                    } ${getActionStyle(previewingSnapshot.action).text} ${
                      getActionStyle(previewingSnapshot.action).border
                    }`}
                  >
                    {previewingSnapshot.action}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Taken {previewingSnapshot ? formatDate(previewingSnapshot.timestamp) : ""}</span>
                <span>•</span>
                <span>({previewingSnapshot ? relativeTime(previewingSnapshot.timestamp) : ""})</span>
                {previewingSnapshot?.changeSummary && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 italic">{previewingSnapshot.changeSummary}</span>
                  </>
                )}
                {(previewingSnapshot?.rowCount || previewingSnapshot?.colCount) && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">
                      {previewingSnapshot.rowCount ?? "?"} rows × {previewingSnapshot.colCount ?? "?"} cols
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>

            {previewingSnapshot && !isViewer && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const snap = previewingSnapshot
                    setPreviewingSnapshot(null)
                    handleReOpen(snap)
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  Restore this Version
                </button>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden w-full h-[65vh] min-h-[480px]">
            {previewingSnapshot ? (
              <SpreadsheetComponent
                ref={historySpreadsheetRef}
                created={onHistorySpreadsheetCreated}
                className="w-full h-full"
                height="100%"
                width="100%"
                allowEditing={false}
                allowOpen={true}
                allowSave={false}
                showFormulaBar={true}
                showRibbon={false}
                sheets={[{ name: previewingSnapshot.sheetName || 'Sheet1', showGridLines: true }]}
              />
            ) : (
              <div className="py-8 text-center text-sm text-zinc-500">
                No snapshot data available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
