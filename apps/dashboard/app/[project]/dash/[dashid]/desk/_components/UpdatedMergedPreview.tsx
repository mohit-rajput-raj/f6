"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import {
  Sparkles,
  ArrowRight,
  Table2,
  X,
  RefreshCw,
  Layers,
  Database,
  Check,
  FolderPlus,
  FileSpreadsheet,
  FileText,
  Save,
  Code2,
  Zap,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog"
import { useDeskStore, type MergedPreviewTabData, type CodeMappingEntry } from "@/stores/desk-store"
import { useMasterSheetStore } from "@/stores/master-sheet-store"
import { useSession } from "@/lib/auth-client"
import { createDataLibraryFile } from "@/app/[project]/dash/[dashid]/(documents)/data-library/actions"
import {
  createOrOverwriteWorkspaceFile,
  getWorkspaceFileByPath,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions"
import {
  getCodeMappings,
  upsertCodeMapping,
  updateMergeConfig,
} from "../code-mapping-actions"
import { FileTreePicker, type FileTreePickerResult } from "./FileTreePicker"
import { MergeConfigDrawer, type MergeConfigMap, type MergeOp } from "./MergeConfigDrawer"
import { toast } from "sonner"

// ─── Leaf Key Extractor ─────────────────────────────────────

function extractLeafKey(colHeader: string, codePath: string): string {
  if (!colHeader) return ""
  const normCode = codePath.replace(/[:\/]+/g, "/").trim().toLowerCase()
  const normCol = colHeader.replace(/[:\/]+/g, "/").trim()

  if (normCode && normCol.toLowerCase().startsWith(normCode + "/")) {
    const remainder = normCol.slice(normCode.length + 1).trim()
    const clean = remainder.replace(/[^a-zA-Z0-9_%+-]+/g, "_").replace(/^_+|_+$/g, "")
    return clean || remainder
  }

  if (colHeader.includes(":") || colHeader.includes("/")) {
    const parts = colHeader.split(/[:\/]/).map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      const leaf = parts[parts.length - 1]
      const clean = leaf.replace(/[^a-zA-Z0-9_%+-]+/g, "_").replace(/^_+|_+$/g, "")
      return clean || leaf
    }
  }

  return colHeader.replace(/[^a-zA-Z0-9_%+-]+/g, "_").replace(/^_+|_+$/g, "") || colHeader
}

// ─── Mathematical Merge Helper ──────────────────────────────

function applyMathOperation(existingVal: any, incomingVal: any, op: MergeOp): any {
  const toNum = (v: any): number => {
    if (typeof v === "number") return isNaN(v) ? 0 : v
    const matches = String(v ?? "").match(/[-+]?\d*\.?\d+/)
    return matches ? parseFloat(matches[0]) : 0
  }

  if (op === "replace") return incomingVal
  if (op === "+") return toNum(existingVal) + toNum(incomingVal)
  if (op === "-") return toNum(existingVal) - toNum(incomingVal)
  if (op === "*") return toNum(existingVal) * toNum(incomingVal)
  if (op === "/") {
    const denom = toNum(incomingVal)
    return denom !== 0 ? Math.round((toNum(existingVal) / denom) * 100) / 100 : 0
  }
  return incomingVal
}

// ─── Main Component ─────────────────────────────────────────

export function UpdatedMergedPreview() {
  const params = useParams()
  const dashid = (params?.dashid as string) || ""
  const { data: session } = useSession()
  const userId = session?.user?.id || ""

  // ── Legacy single merged preview (backward compat) ──
  const mergedPreview = useDeskStore((s) => s.mergedPreview)
  const setMergedPreview = useDeskStore((s) => s.setMergedPreview)
  const setDeskMasterSheetData = useDeskStore((s) => s.setDeskMasterSheetData)

  // ── Multi-tab state ──
  const mergedPreviewTabs = useDeskStore((s) => s.mergedPreviewTabs)
  const activePreviewTabCode = useDeskStore((s) => s.activePreviewTabCode)
  const setActivePreviewTabCode = useDeskStore((s) => s.setActivePreviewTabCode)
  const addMergedPreviewTab = useDeskStore((s) => s.addMergedPreviewTab)
  const updateMergedPreviewTab = useDeskStore((s) => s.updateMergedPreviewTab)
  const removeMergedPreviewTab = useDeskStore((s) => s.removeMergedPreviewTab)
  const codeMappings = useDeskStore((s) => s.codeMappings)
  const upsertCodeMappingStore = useDeskStore((s) => s.upsertCodeMapping)
  const setTabMergeConfigEnabled = useDeskStore((s) => s.setTabMergeConfigEnabled)

  const [isMerging, setIsMerging] = useState(false)
  const [mergedSuccess, setMergedSuccess] = useState(false)

  // ── Data Library Modal State ──
  const [libraryModalOpen, setLibraryModalOpen] = useState(false)
  const [libraryFileName, setLibraryFileName] = useState("")
  const [libraryFileType, setLibraryFileType] = useState<"csv" | "json">("csv")
  const [libraryDesc, setLibraryDesc] = useState("")
  const [isSavingLibrary, setIsSavingLibrary] = useState(false)

  // ── File Tree Picker State ──
  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [filePickerCodePath, setFilePickerCodePath] = useState("")

  // ── Merge Config Drawer State ──
  const [mergeDrawerOpen, setMergeDrawerOpen] = useState(false)
  const [mergeDrawerCodePath, setMergeDrawerCodePath] = useState("")

  // Ref for debouncing column key persistence
  const saveKeyTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Load code mappings from DB on mount ──
  useEffect(() => {
    if (!dashid) return
    getCodeMappings(dashid)
      .then((mappings) => {
        const map: Record<string, CodeMappingEntry> = {}
        for (const m of mappings) {
          map[m.codePath] = {
            id: m.id,
            codePath: m.codePath,
            columnKeyMap: m.columnKeyMap,
            mergeConfig: m.mergeConfig,
            filePath: m.filePath,
            fileId: m.fileId,
            fileName: m.fileName,
            metadata: m.metadata,
          }
        }
        useDeskStore.getState().setCodeMappings(map)
      })
      .catch((e) => console.error("Error loading code mappings:", e))
  }, [dashid])

  // ── Convert mergedPreview into tab & check if code already exists ──
  useEffect(() => {
    if (!mergedPreview?.columns || mergedPreview.columns.length === 0) return

    const rawTargetPath = (mergedPreview.targetPath || mergedPreview.stackName || "default").trim()
    if (!rawTargetPath || rawTargetPath === "default") return

    let isMounted = true

    const checkAndInitTab = async () => {
      // 1. Check in-memory store
      let mapping = useDeskStore.getState().codeMappings[rawTargetPath]

      // 2. If not found, fetch from Supabase database
      if (!mapping && dashid) {
        try {
          const dbMappings = await getCodeMappings(dashid)
          const map: Record<string, CodeMappingEntry> = {}
          for (const m of dbMappings) {
            map[m.codePath] = {
              id: m.id,
              codePath: m.codePath,
              columnKeyMap: m.columnKeyMap,
              mergeConfig: m.mergeConfig,
              filePath: m.filePath,
              fileId: m.fileId,
              fileName: m.fileName,
              metadata: m.metadata,
            }
          }
          useDeskStore.getState().setCodeMappings(map)
          mapping = map[rawTargetPath]
        } catch (e) {
          console.error("Error checking code mapping from DB:", e)
        }
      }

      if (!isMounted) return

      // Determine columnKeyMap:
      // If code was previously used, restore its saved column keys!
      // Otherwise auto-extract leaf keys from column headers
      let initialKeyMap = mapping?.columnKeyMap ? { ...mapping.columnKeyMap } : {}
      if (Object.keys(initialKeyMap).length === 0) {
        mergedPreview.columns.forEach((col, idx) => {
          const leaf = extractLeafKey(col, rawTargetPath)
          if (leaf) initialKeyMap[leaf] = idx
        })
      }

      // Check if this code ALREADY exists with a save location configured
      const hasSaveLocation = Boolean(mapping && mapping.filePath !== undefined && mapping.fileName)
      const isNew = !hasSaveLocation

      const tabData: MergedPreviewTabData = {
        codePath: rawTargetPath,
        columns: mergedPreview.columns || [],
        data: mergedPreview.data || [],
        updates: mergedPreview.updates || [],
        columnKeyMap: initialKeyMap,
        suggestedKeys: {},
        isNew,
        sheetName: mergedPreview.sheetName || "Sheet1",
        dataStartRow: mergedPreview.dataStartRow,
        mergeConfigEnabled: Boolean(mapping?.mergeConfig && Object.keys(mapping.mergeConfig).length > 0),
        mergeConfig: mapping?.mergeConfig || null,
      }

      addMergedPreviewTab(tabData)

      // Only open file location picker if code is truly new (never configured before)
      if (isNew) {
        setFilePickerCodePath(rawTargetPath)
        setFilePickerOpen(true)
      }
    }

    checkAndInitTab()

    return () => {
      isMounted = false
    }
  }, [mergedPreview, dashid, addMergedPreviewTab])

  // ── Active tab data ──
  const activeTab = useMemo(() => {
    if (!activePreviewTabCode) return mergedPreviewTabs[0] || null
    return mergedPreviewTabs.find((t) => t.codePath === activePreviewTabCode) || null
  }, [mergedPreviewTabs, activePreviewTabCode])

  // Use active tab data, fallback to legacy
  const columns = activeTab?.columns || mergedPreview?.columns || []
  const data = activeTab?.data || mergedPreview?.data || []
  const updates = activeTab?.updates || mergedPreview?.updates || []
  const sheetName = activeTab?.sheetName || mergedPreview?.sheetName || "Sheet1"
  const targetPath = activeTab?.codePath || mergedPreview?.targetPath || mergedPreview?.stackName || ""
  const columnKeyMap = activeTab?.columnKeyMap || {}

  // ── Helpers: Format CSV & JSON ──
  const generateCsvContent = (customCols = columns, customRows = data) => {
    const headerRow = customCols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    const dataRows = customRows.map((row) =>
      (row || []).map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    return [headerRow, ...dataRows].join("\n")
  }

  const generateJsonData = () => {
    return data.map((row) => {
      const obj: Record<string, any> = {}
      columns.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      return obj
    })
  }

  // ── Debounced auto-save column keys to database ──
  const debouncedSaveColumnKeys = useCallback(
    (code: string, keyMap: Record<string, number>) => {
      if (!dashid || !code) return
      if (saveKeyTimerRef.current) clearTimeout(saveKeyTimerRef.current)
      saveKeyTimerRef.current = setTimeout(async () => {
        try {
          await upsertCodeMapping({
            projectWorkflowId: dashid,
            codePath: code,
            columnKeyMap: keyMap,
          })
        } catch (e) {
          console.warn("Auto-save column keys to DB notice:", e)
        }
      }, 600)
    },
    [dashid]
  )

  // ── Column Key Input Handler ──
  const handleColumnKeyChange = (colIndex: number, keyName: string) => {
    if (!activeTab) return
    const updatedKeyMap = { ...activeTab.columnKeyMap }
    // Remove any old key mapping pointing to this column
    for (const [k, v] of Object.entries(updatedKeyMap)) {
      if (v === colIndex) delete updatedKeyMap[k]
    }
    const cleanKey = keyName.trim()
    if (cleanKey) {
      updatedKeyMap[cleanKey] = colIndex
    }

    // Update local tab
    updateMergedPreviewTab(activeTab.codePath, { columnKeyMap: updatedKeyMap })

    // Update global store
    upsertCodeMappingStore(activeTab.codePath, {
      codePath: activeTab.codePath,
      columnKeyMap: updatedKeyMap,
    })

    // Debounced persist to database so it's remembered next time
    debouncedSaveColumnKeys(activeTab.codePath, updatedKeyMap)
  }

  // ── Get key name for a column index ──
  const getKeyForColumn = useCallback(
    (colIndex: number): string => {
      // 1. Check if user configured an explicit key
      for (const [key, idx] of Object.entries(columnKeyMap)) {
        if (idx === colIndex) return key
      }
      // 2. Auto-extract clean leaf name
      const col = columns[colIndex]
      if (col) {
        return extractLeafKey(col, targetPath)
      }
      return ""
    },
    [columnKeyMap, columns, targetPath]
  )

  // ── Keys eligible for math operations in Merge Drawer ──
  const configurableKeys = useMemo(() => {
    return columns
      .map((_, idx) => getKeyForColumn(idx))
      .filter((k) => Boolean(k) && !/^(s_?no|enrollment|name)$/i.test(k))
  }, [columns, getKeyForColumn])

  // ── Explicit Save Column Keys to DB Button ──
  const handleSaveColumnKeys = async () => {
    if (!activeTab || !dashid) return
    try {
      await upsertCodeMapping({
        projectWorkflowId: dashid,
        codePath: activeTab.codePath,
        columnKeyMap: activeTab.columnKeyMap,
      })
      upsertCodeMappingStore(activeTab.codePath, {
        codePath: activeTab.codePath,
        columnKeyMap: activeTab.columnKeyMap,
      })
      updateMergedPreviewTab(activeTab.codePath, { isNew: false })
      toast.success(`Column keys saved for ${activeTab.codePath}`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save column keys")
    }
  }

  // ── File Picker Confirm (first-time code setup) ──
  const handleFilePickerConfirm = async (result: FileTreePickerResult) => {
    if (!filePickerCodePath || !dashid) return
    try {
      await upsertCodeMapping({
        projectWorkflowId: dashid,
        codePath: filePickerCodePath,
        columnKeyMap: activeTab?.columnKeyMap || {},
        filePath: result.folderPath,
        fileName: result.fileName,
      })
      upsertCodeMappingStore(filePickerCodePath, {
        codePath: filePickerCodePath,
        columnKeyMap: activeTab?.columnKeyMap || {},
        filePath: result.folderPath,
        fileName: result.fileName,
      })
      updateMergedPreviewTab(filePickerCodePath, { isNew: false })
      toast.success(`Auto-save location configured: /${result.folderPath || "root"}/${result.fileName}`)
      setFilePickerOpen(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save file location")
    }
  }

  // ── Merge Config Drawer Save ──
  const handleMergeConfigSave = async (config: MergeConfigMap) => {
    if (!mergeDrawerCodePath || !dashid) return
    try {
      await updateMergeConfig(dashid, mergeDrawerCodePath, config)
      const existing = codeMappings[mergeDrawerCodePath]
      upsertCodeMappingStore(mergeDrawerCodePath, {
        ...existing,
        codePath: mergeDrawerCodePath,
        columnKeyMap: activeTab?.columnKeyMap || existing?.columnKeyMap || {},
        mergeConfig: config,
      })
      updateMergedPreviewTab(mergeDrawerCodePath, {
        mergeConfig: config,
        mergeConfigEnabled: true,
      })
      toast.success(`Formulas saved for ${mergeDrawerCodePath}`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save merge formulas")
    }
  }

  // ── Confirm Merge (with math formulas or direct overwrite) ──
  const handleConfirmMerge = async () => {
    setIsMerging(true)
    try {
      const msStore = useMasterSheetStore.getState()
      const deskStore = useDeskStore.getState()
      const {
        applyUpdatesToMasterSheet,
        applyUpdatesDirectlyToSyncfusion,
        extractSyncfusionInstanceData,
        extractSingleSheetSnapshot,
        countSheetRowsCols,
      } = await import("@/lib/sheet-utils")

      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null

      // Pre-Merge Snapshot
      if (ss) {
        const activeTabName = msStore.activeSheetTab || sheetName || "Sheet1"
        const snapshotData = extractSingleSheetSnapshot(ss, activeTabName)
        if (snapshotData) {
          const dims = countSheetRowsCols(snapshotData)
          msStore.addSheetSnapshot(activeTabName, {
            sheetName: activeTabName,
            timestamp: Date.now(),
            action: `Before Merge: ${targetPath}`,
            changeSummary: `Snapshot before merging ${updates.length} records for ${targetPath}`,
            data: snapshotData,
            rowCount: dims.rowCount,
            colCount: dims.colCount,
          })
        }
      }

      // 1. Direct cell updates to visible Syncfusion spreadsheet
      if (ss) {
        applyUpdatesDirectlyToSyncfusion(ss, updates)
      }

      // 2. Full workbook JSON
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
        updatedMasterSheet = applyUpdatesToMasterSheet(
          currentRaw,
          updates,
          targetPath,
          activeTab?.dataStartRow || mergedPreview?.dataStartRow
        )
      }

      // 3. Update MasterSheet stores
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

      // 4. Auto-save to workspace file:
      // If Merge Mapping is ON: data will NOT overwrite directly.
      // Instead, it combines existing file data with incoming data via configured formulas!
      // If Merge Mapping is OFF: data overwrites directly.
      const mapping = codeMappings[targetPath] || useDeskStore.getState().codeMappings[targetPath]
      if (mapping?.filePath !== undefined && mapping?.fileName && dashid && userId) {
        try {
          let filePayload = { columns, data, rawCsv: generateCsvContent(columns, data) }

          if (activeTab?.mergeConfigEnabled && activeTab?.mergeConfig) {
            // Load existing file data
            const existingFile = await getWorkspaceFileByPath({
              dashid,
              folderPath: mapping.filePath || "",
              fileName: mapping.fileName,
            })

            if (existingFile?.data && typeof existingFile.data === "object") {
              const prevCols: string[] = (existingFile.data as any).columns || []
              const prevRows: any[][] = (existingFile.data as any).data || []

              if (prevRows.length > 0) {
                // Determine row key column (e.g. Enrollment, ID, or S.No)
                let idColIdx = columns.findIndex((c) => /enroll|id|roll|code/i.test(c))
                if (idColIdx === -1) idColIdx = 1

                let prevIdColIdx = prevCols.findIndex((c) => /enroll|id|roll|code/i.test(c))
                if (prevIdColIdx === -1) prevIdColIdx = idColIdx

                // Build lookup of previous rows
                const existingRowMap = new Map<string, any[]>()
                prevRows.forEach((r, idx) => {
                  const keyVal = String(r[prevIdColIdx] ?? idx).trim().toLowerCase()
                  if (keyVal) existingRowMap.set(keyVal, r)
                })

                // Merge incoming rows with existing records
                const mergedRows = data.map((incomingRow, rowIdx) => {
                  const keyVal = String(incomingRow[idColIdx] ?? rowIdx).trim().toLowerCase()
                  const existingRow = existingRowMap.get(keyVal)

                  if (!existingRow) return [...incomingRow]

                  return incomingRow.map((inCell, colIdx) => {
                    const colKey = getKeyForColumn(colIdx)
                    const opCfg = activeTab.mergeConfig?.[colKey]
                    if (!opCfg) return inCell

                    const existingCell = existingRow[colIdx] ?? 0
                    return applyMathOperation(existingCell, inCell, opCfg.op)
                  })
                })

                filePayload = {
                  columns,
                  data: mergedRows,
                  rawCsv: generateCsvContent(columns, mergedRows),
                }
              }
            }
          }

          await createOrOverwriteWorkspaceFile({
            dashid,
            userId,
            fileName: mapping.fileName,
            folderPath: mapping.filePath || "",
            fileType: "json",
            data: filePayload,
            metadata: {
              columns,
              rowCount: filePayload.data.length,
              sheetName,
              targetPath,
              codePath: targetPath,
              mergedWithFormulas: Boolean(activeTab?.mergeConfigEnabled),
              source: "UpdatedMergedPreview-AutoSave",
              exportedAt: new Date().toISOString(),
            },
          })
        } catch (e) {
          console.warn("Auto-save file notice:", e)
        }
      }

      setMergedSuccess(true)
      toast.success(
        `Merged ${updates.length || data.length} records into MasterSheet "${sheetName}"! Click "Save Sheet" to persist changes.`
      )
      setTimeout(() => setMergedSuccess(false), 5000)
    } catch (err: any) {
      console.error("Confirm merge failed:", err)
      toast.error("Failed to merge into MasterSheet: " + (err?.message || err))
    } finally {
      setIsMerging(false)
    }
  }

  // ── Open Data Library Modal ──
  const handleOpenLibraryModal = () => {
    const cleanDefault = (targetPath || sheetName || "merged_data")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
    setLibraryFileName(`${cleanDefault}_merged`)
    setLibraryFileType("csv")
    setLibraryDesc(`Merged dataset with ${columns.length} columns and ${data.length} records.`)
    setLibraryModalOpen(true)
  }

  // ── Save to Data Library ──
  const handleSaveToDataLibrary = async () => {
    if (!userId) {
      toast.error("User session missing. Please re-login.")
      return
    }
    const finalName = libraryFileName.trim()
    if (!finalName) {
      toast.error("Please enter a file name.")
      return
    }
    setIsSavingLibrary(true)
    try {
      const filePayload = libraryFileType === "csv" ? generateCsvContent() : generateJsonData()
      await createDataLibraryFile({
        userId,
        name: finalName,
        description: libraryDesc.trim(),
        fileType: libraryFileType,
        data: filePayload,
        metadata: {
          columns,
          rowCount: data.length,
          sheetName,
          targetPath,
          source: "UpdatedMergedPreview",
          exportedAt: new Date().toISOString(),
        },
        workflowId: dashid,
      })
      toast.success(`Saved "${finalName}" to Data Library successfully!`)
      setLibraryModalOpen(false)
    } catch (err: any) {
      toast.error("Failed to save to Data Library: " + (err?.message || err))
    } finally {
      setIsSavingLibrary(false)
    }
  }

  // ── Dismiss a tab ──
  const handleDismissTab = (codePath: string) => {
    removeMergedPreviewTab(codePath)
    if (mergedPreviewTabs.length <= 1) {
      setMergedPreview(null)
    }
  }

  const currentMapping = codeMappings[targetPath] || useDeskStore.getState().codeMappings[targetPath]

  // If no tabs or columns, don't render preview
  const shouldRender =
    (mergedPreviewTabs.length > 0 ||
      (mergedPreview && mergedPreview.columns && mergedPreview.columns.length > 0)) &&
    columns.length > 0

  if (!shouldRender) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden mb-4 animate-in fade-in-50 duration-200">
      {/* ── Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary border border-primary/20">
            <Table2 className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Merged Preview
              </h3>
              <Badge variant="secondary" className="text-[11px] font-normal">
                {updates.length > 0 ? `${updates.length} Updates` : "Preview"}
              </Badge>
              {activeTab?.isNew && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-amber-500 border-amber-500/40 bg-amber-500/10"
                >
                  <Sparkles className="size-3 mr-1" />
                  New Code
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>
                Sheet: <strong className="font-mono font-medium text-foreground">{sheetName}</strong>
              </span>
              <span>•</span>
              <span>
                Code: <strong className="font-mono font-medium text-foreground">{targetPath}</strong>
              </span>
              <span>•</span>
              <span>{data.length} records</span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save Column Keys */}
          {activeTab && Object.keys(activeTab.columnKeyMap).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveColumnKeys}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs hover:bg-teal-500/10 hover:text-teal-500 hover:border-teal-500/30"
            >
              <Code2 className="size-3.5 text-teal-500" />
              <span>Save Keys</span>
            </Button>
          )}

          {/* Save to Data Library */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenLibraryModal}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30"
          >
            <Database className="size-3.5 text-blue-500" />
            <span>Data Library</span>
          </Button>

          {/* Set File Location */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilePickerCodePath(targetPath)
              setFilePickerOpen(true)
            }}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30"
          >
            <FolderPlus className="size-3.5 text-amber-500" />
            <span>Save to Files</span>
          </Button>

          {/* Confirm Merge */}
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
                <span>Merged!</span>
              </>
            ) : (
              <>
                <ArrowRight className="size-3.5" />
                <span>Confirm Merge</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (activeTab) handleDismissTab(activeTab.codePath)
              else setMergedPreview(null)
            }}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Dismiss preview"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Tab Bar (Multi-code tabs, fixed hydration button nesting) ── */}
      {mergedPreviewTabs.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-muted/20 overflow-x-auto">
          {mergedPreviewTabs.map((tab) => (
            <div
              key={tab.codePath}
              role="button"
              tabIndex={0}
              onClick={() => setActivePreviewTabCode(tab.codePath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActivePreviewTabCode(tab.codePath)
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 select-none ${
                activePreviewTabCode === tab.codePath
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "hover:bg-muted/70 text-muted-foreground"
              }`}
            >
              <Code2 className="size-3" />
              <span className="font-mono">{tab.codePath}</span>
              {tab.isNew && (
                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDismissTab(tab.codePath)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    handleDismissTab(tab.codePath)
                  }
                }}
                className="ml-1 p-0.5 rounded hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Close tab"
              >
                <X className="size-3" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Merge Mapping Toggle + Column Keys Row ── */}
      <div className="px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-xs shrink-0">
            <Layers className="size-3.5" /> Column Keys:
          </span>

          <div className="flex items-center gap-3">
            {/* Merge Mapping Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-muted-foreground cursor-pointer" htmlFor="merge-toggle">
                Merge Mapping
              </Label>
              <Switch
                id="merge-toggle"
                checked={activeTab?.mergeConfigEnabled || false}
                onCheckedChange={(checked) => {
                  if (activeTab) setTabMergeConfigEnabled(activeTab.codePath, checked)
                }}
              />
            </div>

            {/* Launch Merge button (visible when toggle is ON) */}
            {activeTab?.mergeConfigEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMergeDrawerCodePath(activeTab.codePath)
                  setMergeDrawerOpen(true)
                }}
                className="h-7 gap-1.5 text-[11px] font-medium cursor-pointer border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 animate-in fade-in-50 duration-200"
              >
                <Zap className="size-3.5 text-emerald-400" />
                <span>Launch Merge</span>
              </Button>
            )}

            {/* File location indicator */}
            {currentMapping?.filePath !== undefined && (
              <Badge
                variant="outline"
                onClick={() => {
                  setFilePickerCodePath(targetPath)
                  setFilePickerOpen(true)
                }}
                className="text-[10px] font-mono bg-background gap-1 cursor-pointer hover:bg-muted transition-colors"
                title="Click to view/change auto-save location"
              >
                <FolderPlus className="size-3 text-amber-500" />
                {currentMapping?.filePath
                  ? `/${currentMapping.filePath}/${currentMapping?.fileName || ""}`
                  : `/ ${currentMapping?.fileName || "root"}`}
              </Badge>
            )}
          </div>
        </div>

        {/* Column Key Inputs (Showing clean leaf keys e.g. Total, Attended, %) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {columns.map((col, idx) => {
            const currentKey = getKeyForColumn(idx)
            const isMetric =
              col.includes(":") ||
              col.toLowerCase().includes("total") ||
              col.toLowerCase().includes("attend") ||
              col.includes("%")

            return (
              <div key={idx} className="flex flex-col items-center gap-0.5 shrink-0">
                <Input
                  value={currentKey}
                  onChange={(e) => handleColumnKeyChange(idx, e.target.value)}
                  className={`h-6 w-24 text-[10px] font-mono text-center px-1 ${
                    isMetric
                      ? "border-primary/40 bg-primary/5 text-primary font-semibold"
                      : "border-border bg-background"
                  }`}
                  placeholder={`col_${idx}`}
                  title={`Column ${idx}: ${col} (Type to customize key)`}
                />
                <span
                  className={`text-[9px] truncate max-w-24 ${
                    isMetric ? "text-primary font-medium" : "text-muted-foreground"
                  }`}
                  title={col}
                >
                  {col}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Table Preview ── */}
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
              <tr key={ri} className="hover:bg-muted/50 transition-colors">
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

      {/* ── Footer Banner ── */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Click <strong>Confirm Merge</strong> to apply, or use <strong>Data Library / Save to Files</strong> to store this dataset.
        </span>
        <span className="font-mono text-[11px]">{data.length} records</span>
      </div>

      {/* ── MODAL: Save to Data Library ── */}
      <Dialog open={libraryModalOpen} onOpenChange={setLibraryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Database className="size-5 text-blue-500" />
              <span>Save to Data Library</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Persist this merged preview dataset into your workspace Data Library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <span className="font-medium text-foreground">
                Sheet: <strong className="font-mono">{sheetName}</strong>
              </span>
              <Badge variant="outline" className="text-[11px] font-mono">
                {columns.length} columns • {data.length} rows
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">File Name</Label>
              <Input
                value={libraryFileName}
                onChange={(e) => setLibraryFileName(e.target.value)}
                placeholder="e.g. attendance_merged"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={libraryFileType === "csv" ? "default" : "outline"}
                  onClick={() => setLibraryFileType("csv")}
                  className="h-7 text-xs flex-1 gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="size-3.5" />
                  <span>CSV</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={libraryFileType === "json" ? "default" : "outline"}
                  onClick={() => setLibraryFileType("json")}
                  className="h-7 text-xs flex-1 gap-1.5 cursor-pointer"
                >
                  <FileText className="size-3.5" />
                  <span>JSON</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (Optional)</Label>
              <Input
                value={libraryDesc}
                onChange={(e) => setLibraryDesc(e.target.value)}
                placeholder="Brief notes about this dataset"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLibraryModalOpen(false)}
              disabled={isSavingLibrary}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToDataLibrary}
              disabled={isSavingLibrary}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              {isSavingLibrary ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save to Data Library</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── File Tree Picker (first-time code detection) ── */}
      <FileTreePicker
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        dashid={dashid}
        userId={userId}
        title={`Set Auto-Save Location — ${filePickerCodePath}`}
        description={`First time seeing code path "${filePickerCodePath}". Select workspace folder and file name. Future merges will auto-save here without prompting.`}
        defaultFileName={`${filePickerCodePath.replace(/[^a-zA-Z0-9]/g, "_")}_data.json`}
        defaultFolderPath={codeMappings[filePickerCodePath]?.filePath || ""}
        onConfirm={handleFilePickerConfirm}
      />

      {/* ── Merge Config Drawer (Math operations & formula engine) ── */}
      <MergeConfigDrawer
        open={mergeDrawerOpen}
        onOpenChange={setMergeDrawerOpen}
        codePath={mergeDrawerCodePath}
        columnKeys={
          configurableKeys.length > 0
            ? configurableKeys
            : columns.map((_, i) => getKeyForColumn(i)).filter(Boolean)
        }
        csvHeaders={columns}
        initialConfig={activeTab?.mergeConfig || codeMappings[mergeDrawerCodePath]?.mergeConfig || null}
        onSave={handleMergeConfigSave}
      />
    </div>
  )
}
