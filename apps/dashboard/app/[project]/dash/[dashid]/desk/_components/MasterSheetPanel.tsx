"use client"

import React, { useRef, useEffect, useState } from "react"
import { Table2, Search, RefreshCw, Save, Upload, Lock, Download, Check, BookmarkPlus, Loader2 } from "lucide-react"
import { useDeskStore, type Dataset } from "@/stores/desk-store"
import { useMasterSheetStore } from "@/stores/master-sheet-store"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
import { useSession } from "@/lib/auth-client"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog"
import {
  getMasterSheets,
  upsertMasterSheetByName,
  createMasterSheet,
  checkIsDeskOwner,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions"
import dynamic from "next/dynamic"

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
)

import {
  openSheetInSyncfusion,
  extractSyncfusionSaveData,
  unwrapSyncfusionJson,
  extractSyncfusionInstanceData,
  extractSingleSheetSnapshot,
  countSheetRowsCols,
} from "@/lib/sheet-utils"

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
  const isViewer = useDeskStore((s) => s.isViewer)
  const spreadsheetRef = useRef<any>(null)
  const ssInstanceRef = useRef<any>(null)
  const dataLoadedRef = useRef(false)
  const [mastersheetId, setMastersheetId] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [sheetName, setSheetName] = useState("Master Sheet")
  const [isLoadingDb, setIsLoadingDb] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [isSaveLibraryOpen, setIsSaveLibraryOpen] = useState(false)
  const [librarySheetName, setLibrarySheetName] = useState("")
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)

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

  // Helper to safely get the real Syncfusion instance (microSheetAgent pattern: use ref directly)
  const getSsInstance = () => {
    return ssInstanceRef.current || spreadsheetRef.current
  }

  const [dbSheetJson, setDbSheetJson] = useState<any>(null)

  // Helper to open sheet JSON in Syncfusion instance
  const openSheetJson = (ss: any, rawData: any) => {
    const target = getSsInstance() || ss
    if (!target || !rawData) return
    openSheetInSyncfusion(target, rawData)
  }

  // Auto-fetch MasterSheet from DB for this desk on mount
  useEffect(() => {
    if (!dashid || !userId) return
    const fetchDeskSheet = async () => {
      setIsLoadingDb(true)
      try {
        const sheets = await getMasterSheets(dashid, userId, userEmail)
        if (sheets && sheets.length > 0) {
          const mainSheet = sheets[0]
          if (mainSheet.data) {
            const name = mainSheet.name || "Master Sheet"
            setSheetName(name)
            dataLoadedRef.current = false
            setDbSheetJson(mainSheet.data)
            useDeskStore.getState().setDeskMasterSheetData(mainSheet.data)
            useMasterSheetStore.getState().setSheetData(name, mainSheet.data)

            // Load persisted sheet histories from metadata
            const metadata = mainSheet.metadata as any
            if (metadata?.sheetHistories && typeof metadata.sheetHistories === "object") {
              useMasterSheetStore.getState().setSheetHistories(metadata.sheetHistories)
            }
          }
        }
      } catch (err) {
        console.warn("Could not load desk master sheet:", err)
      } finally {
        setIsLoadingDb(false)
      }
    }

    fetchDeskSheet()
  }, [dashid, userId, userEmail])

  // Whenever dbSheetJson is set or updated (from DB or import), open it in Syncfusion instance
  useEffect(() => {
    if (!dbSheetJson || !isMounted || dataLoadedRef.current) return

    const timer = setTimeout(() => {
      const ss = ssInstanceRef.current || spreadsheetRef.current
      if (ss) {
        if (typeof window !== "undefined") {
          (window as any).__masterSheetSpreadsheet = ss
        }
        openSheetInSyncfusion(ss, dbSheetJson)
        dataLoadedRef.current = true
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [dbSheetJson, isMounted])

  const deskMasterSheetData = useDeskStore((s) => s.activeMasterSheetData)

  // Listen to activeMasterSheetData from desk store (e.g. when confirmed from UpdatedMergedPreview)
  useEffect(() => {
    if (!deskMasterSheetData || !isMounted) return
    const timer = setTimeout(() => {
      const ss = getSsInstance()
      if (ss) {
        if (typeof window !== "undefined") {
          (window as any).__masterSheetSpreadsheet = ss
        }
        openSheetInSyncfusion(ss, deskMasterSheetData)
        dataLoadedRef.current = true
        setDbSheetJson(deskMasterSheetData)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [deskMasterSheetData, isMounted])

  // ── Helper: Sync all sheet tabs from the Syncfusion instance ──
  const syncSheetTabs = (ss: any) => {
    if (!ss || !Array.isArray(ss.sheets)) return
    const tabNames = ss.sheets.map((s: any) => s.name || `Sheet${(s.index ?? 0) + 1}`)
    useMasterSheetStore.getState().setAllSheetTabs(tabNames)
  }

  // ── Syncfusion actionComplete handler — detects tab lifecycle events ──
  const handleActionComplete = (args: any) => {
    const ss = getSsInstance()
    if (!ss || !args) return

    const action = args.action || args.eventArgs?.action || ""

    switch (action) {
      case "gotoSheet": {
        // User switched tabs
        const activeSheet = typeof ss.getActiveSheet === "function" ? ss.getActiveSheet() : null
        const activeTabName = activeSheet?.name || ss.sheets?.[ss.activeSheetIndex || 0]?.name || "Sheet1"
        useMasterSheetStore.getState().setActiveSheetTab(activeTabName)
        syncSheetTabs(ss)
        break
      }
      case "duplicateSheet": {
        // A sheet was duplicated — sync tabs and duplicate history
        syncSheetTabs(ss)
        const sheets = ss.sheets || []
        // The new duplicate is typically the last sheet or near the source
        // We detect it by finding a sheet name not in allSheetTabs
        const currentTabs = useMasterSheetStore.getState().allSheetTabs
        const newTabNames = sheets.map((s: any) => s.name)
        const addedTab = newTabNames.find((name: string) => !currentTabs.includes(name))
        if (addedTab) {
          // Try to infer source from the duplicate name pattern "Sheet1 (2)" -> "Sheet1"
          const match = addedTab.match(/^(.+?)\s*\(\d+\)$/)
          const sourceTab = match ? match[1].trim() : currentTabs[0] || "Sheet1"
          useMasterSheetStore.getState().duplicateSheetHistory(sourceTab, addedTab)
          useMasterSheetStore.getState().setAllSheetTabs(newTabNames)
        }
        break
      }
      case "removeSheet": {
        // A sheet was deleted — sync tabs and delete history
        const currentTabs = useMasterSheetStore.getState().allSheetTabs
        const newTabNames = (ss.sheets || []).map((s: any) => s.name)
        const removedTab = currentTabs.find((name: string) => !newTabNames.includes(name))
        if (removedTab) {
          useMasterSheetStore.getState().deleteSheetHistory(removedTab)
        }
        syncSheetTabs(ss)
        // Update active tab
        const activeSheet = typeof ss.getActiveSheet === "function" ? ss.getActiveSheet() : null
        if (activeSheet) {
          useMasterSheetStore.getState().setActiveSheetTab(activeSheet.name)
        }
        break
      }
      case "renameSheet": {
        // A sheet was renamed — sync tabs and rename history
        const currentTabs = useMasterSheetStore.getState().allSheetTabs
        const newTabNames = (ss.sheets || []).map((s: any) => s.name)
        const oldName = currentTabs.find((name: string) => !newTabNames.includes(name))
        const newName = newTabNames.find((name: string) => !currentTabs.includes(name))
        if (oldName && newName) {
          useMasterSheetStore.getState().renameSheetHistory(oldName, newName)
        }
        syncSheetTabs(ss)
        break
      }
      case "insertSheet": {
        // A new sheet was added
        syncSheetTabs(ss)
        break
      }
      default:
        break
    }
  }

  // Callback when Syncfusion spreadsheet is fully created and ready (microSheetAgent pattern)
  const onSpreadsheetCreated = () => {
    const ss = spreadsheetRef.current
    if (!ss) return
    ssInstanceRef.current = ss
    if (typeof window !== "undefined") {
      (window as any).__masterSheetSpreadsheet = ss
    }

    // Initialize sheet tabs from Syncfusion
    syncSheetTabs(ss)
    const activeSheet = typeof ss.getActiveSheet === "function" ? ss.getActiveSheet() : null
    if (activeSheet?.name) {
      useMasterSheetStore.getState().setActiveSheetTab(activeSheet.name)
    }

    // If DB data already loaded, render it now
    const targetData = deskMasterSheetData || dbSheetJson
    if (targetData && !dataLoadedRef.current) {
      openSheetInSyncfusion(ss, targetData)
      dataLoadedRef.current = true

      // Re-sync tabs after data load (delayed to let Syncfusion finish rendering)
      setTimeout(() => syncSheetTabs(ss), 300)
    }
  }

  // Save current spreadsheet data back to DB as full Syncfusion workbook state (matching microSheetAgent pattern)
  const handleSaveSheet = async () => {
    if (!userId) return
    if (isViewer) {
      toast.error("Viewers cannot modify this sheet")
      return
    }
    const ss = getSsInstance()
    if (!ss) {
      alert("Spreadsheet is not ready yet.")
      return
    }

    setIsSaving(true)
    try {
      // ── Pre-Save Snapshot: capture the current active sheet before saving ──
      const activeTabName = useMasterSheetStore.getState().activeSheetTab || "Sheet1"
      const snapshotData = extractSingleSheetSnapshot(ss, activeTabName)
      if (snapshotData) {
        const dims = countSheetRowsCols(snapshotData)
        useMasterSheetStore.getState().addSheetSnapshot(activeTabName, {
          sheetName: activeTabName,
          timestamp: Date.now(),
          action: "Pre-Save Snapshot",
          changeSummary: `Snapshot before save`,
          data: snapshotData,
          rowCount: dims.rowCount,
          colCount: dims.colCount,
          savedBy: userEmail || userId,
        })
      }

      let sheetData: any = null

      if (typeof ss.saveAsJson === "function") {
        try {
          const res: any = await ss.saveAsJson()
          sheetData = res?.jsonObject || res
        } catch (e) {
          console.warn("saveAsJson warning:", e)
        }
      }

      if (!sheetData || (typeof sheetData === "object" && Object.keys(sheetData).length === 0)) {
        sheetData = extractSyncfusionInstanceData(ss) || dbSheetJson
      }

      // ── Persist sheetHistories in metadata ──
      const currentHistories = useMasterSheetStore.getState().sheetHistories
      const metadata = { sheetHistories: currentHistories }

      await upsertMasterSheetByName({
        userId,
        name: sheetName || "Master Sheet",
        data: sheetData,
        metadata,
        dashid,
      })

      setDbSheetJson(sheetData)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error("Failed to save MasterSheet:", err)
      alert("Failed to save MasterSheet.")
    } finally {
      setIsSaving(false)
    }
  }

  // Save current sheet state to Sheet Library as a new standalone entry
  const handleSaveToLibrary = async () => {
    if (!userId) {
      toast.error("Please log in to save to Sheet Library")
      return
    }
    if (isViewer) {
      toast.error("Viewers cannot save to Sheet Library")
      return
    }
    const ss = getSsInstance()
    if (!ss) {
      toast.error("Spreadsheet is not ready yet.")
      return
    }
    const targetName = librarySheetName.trim() || `${sheetName || "Master Sheet"} (Library)`

    setIsSavingToLibrary(true)
    try {
      let sheetData: any = null
      if (typeof ss.saveAsJson === "function") {
        try {
          const res: any = await ss.saveAsJson()
          sheetData = res?.jsonObject || res
        } catch (e) {
          console.warn("saveAsJson warning:", e)
        }
      }

      if (!sheetData || (typeof sheetData === "object" && Object.keys(sheetData).length === 0)) {
        sheetData = extractSyncfusionInstanceData(ss) || dbSheetJson
      }

      const activeTabName = useMasterSheetStore.getState().activeSheetTab || "Sheet1"
      const snapshotData = extractSingleSheetSnapshot(ss, activeTabName)
      const dims = snapshotData ? countSheetRowsCols(snapshotData) : { rowCount: 0, colCount: 0 }
      const currentHistories = useMasterSheetStore.getState().sheetHistories

      const metadata = {
        sheetHistories: currentHistories,
        rowCount: dims.rowCount,
        colCount: dims.colCount,
        activeSheetTab: activeTabName,
        savedAt: new Date().toISOString(),
        savedBy: userEmail || userId,
      }

      await createMasterSheet({
        userId,
        name: targetName,
        data: sheetData,
        metadata,
        dashid,
      })

      toast.success(`Saved "${targetName}" to Sheet Library!`)
      setIsSaveLibraryOpen(false)
    } catch (err: any) {
      console.error("Failed to save to sheet library:", err)
      toast.error("Failed to save to Sheet Library: " + (err?.message || "Unknown error"))
    } finally {
      setIsSavingToLibrary(false)
    }
  }

  // Download helper — guaranteed to trigger a file download safely without circular structure errors
  const downloadJson = (data: any, filename: string) => {
    const getCircularReplacer = () => {
      const seen = new WeakSet()
      return (_key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return
          }
          seen.add(value)
        }
        return value
      }
    }
    const json = JSON.stringify(data, getCircularReplacer(), 2)
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
    if (!ss) {
      alert("Spreadsheet is not ready yet. Please wait a moment and try again.")
      return
    }

    const filename = `${(sheetName || "master-sheet").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`

    try {
      let workbookData: any = null

      if (typeof ss.saveAsJson === "function") {
        try {
          const res: any = await ss.saveAsJson()
          workbookData = res?.jsonObject || res
        } catch (e) {
          console.warn("saveAsJson failed, falling back to direct extraction:", e)
        }
      }

      if (!workbookData || typeof workbookData !== "object" || Object.keys(workbookData).length === 0) {
        workbookData = extractSyncfusionInstanceData(ss) || dbSheetJson
      }

      if (!workbookData) {
        alert("No data available to export. Please add content first.")
        return
      }

      // Wrap in the expected output format with id, name, data, timestamps
      const exportPayload = {
        id: dashid || crypto.randomUUID(),
        name: sheetName || "Master Sheet",
        data: unwrapSyncfusionJson(workbookData) || workbookData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      downloadJson(exportPayload, filename)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (err: any) {
      console.error("Export error:", err)
      alert(err?.message || "Export failed. Please try again.")
    }
  }

  // Import Syncfusion JSON template — OWNER ONLY (preserves merged cells, styles, spans, formulas)
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
          const parsed = JSON.parse(ev.target?.result as string)
          const ss = getSsInstance()

          if (!ss) {
            alert("Spreadsheet is not ready. Please wait and try again.")
            return
          }

          openSheetInSyncfusion(ss, parsed)

          // Store locally so it shows on sheet; user must click "Save Sheet" to persist to DB
          dataLoadedRef.current = false
          setDbSheetJson(parsed)
          alert("Template imported! Click 'Save Sheet' to persist your changes.")
        } catch (err: any) {
          console.error("Import failed:", err)
          alert("Failed to import template: " + (err?.message || "Invalid JSON file"))
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

          {/* Save Sheet Button — hidden for viewers */}
          {!isViewer && (
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
          )}

          {/* Save to Sheet Library Button (Right of Save Button) — hidden for viewers */}
          {!isViewer && (
            <button
              onClick={() => {
                setLibrarySheetName(`${sheetName || "Master Sheet"} (Library)`)
                setIsSaveLibraryOpen(true)
              }}
              title="Save current sheet to Sheet Library"
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <BookmarkPlus className="size-3.5 text-white" />
              Save to Library
            </button>
          )}
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
            created={onSpreadsheetCreated}
            actionComplete={handleActionComplete}
            className="w-full h-full"
            height="100%"
            width="100%"
            allowEditing={true}
            allowOpen={true}
            allowSave={true}
            saveUrl="https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/save"
            sheets={[{ name: 'Sheet1', showGridLines: true }]}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Loading spreadsheet...
          </div>
        )}
      </div>

      {/* Save to Sheet Library Dialog */}
      <Dialog open={isSaveLibraryOpen} onOpenChange={setIsSaveLibraryOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <BookmarkPlus className="size-5 text-violet-400" />
              Save to Sheet Library
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Save the current spreadsheet state as a new entry in your desk&apos;s Sheet Library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Sheet Name</label>
              <Input
                value={librarySheetName}
                onChange={(e) => setLibrarySheetName(e.target.value)}
                placeholder="e.g. Q3 Performance MasterSheet"
                className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs h-9 focus-visible:ring-violet-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSavingToLibrary) {
                    e.preventDefault()
                    handleSaveToLibrary()
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsSaveLibraryOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToLibrary}
              disabled={isSavingToLibrary || !librarySheetName.trim()}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isSavingToLibrary ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving to Library...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Save to Library
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
