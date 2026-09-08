"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import {
  Plus, Camera, X,
  Settings2, Loader2, ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/components"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-client"
import { useDeskStore } from "@/stores/desk-store"
import { scanTableImage } from "./ocr-actions"
import {
  getSharedDeskAccess,
} from "./desk-share-actions"
import {
  getDeskBlocks,
  createDeskBlock,
  initializeDefaultDesk,
  updateDeskBlockInputs,
  updateDeskBlockOutput,
  deleteDeskBlock,
} from "./desk-block-actions"
import { useMasterSheetStore } from "@/stores/master-sheet-store"
import { usePathname, useRouter, useParams } from "next/navigation"
import { DeskBlock } from "./_components/DeskBlock"
import { InviteNotification } from "./_components/InviteNotification"
import { MasterSheetPanel } from "./_components/MasterSheetPanel"
import { MasterSheetHistoryPanel } from "./_components/MasterSheetHistoryPanel"
import { UpdatedMergedPreview } from "./_components/UpdatedMergedPreview"
import { executeWorkflow } from "../editor/_components/nodes/executions/nodeExecutions"
import { getWorkFlow } from "../editor/_actions/editor.service"
import { HelixLoader, RoseLoader } from "curls-loaders"

// ─── Main Component ─────────────────────────────────────────
export default function DeskPage() {
  const { data: sessionData } = useSession()
  const userId = sessionData?.user?.id
  const userEmail = sessionData?.user?.email ?? ""
  const params = useParams()
  const dashid = params?.dashid as string

  const {
    blocks,
    isLoading,
    isGuest,
    isViewer,
    ocrResult,
    isOcrProcessing,
    setBlocks,
    setProjectWorkflowId,
    setIsLoading,
    setIsGuest,
    setDeskAccess,
    addBlock,
    removeBlock,
    setBlockOutput,
    setBlockExecuting,
    setOcrResult,
    setOcrProcessing,
  } = useDeskStore()

  const [isAddingBlock, setIsAddingBlock] = useState(false)

  // OCR file input ref
  const ocrFileRef = useRef<HTMLInputElement>(null)

  // Master sheet store
  const { sheets: masterSheets, activeSheetName } = useMasterSheetStore()
  const activeMasterSheet = activeSheetName ? masterSheets[activeSheetName] : null

  const router = useRouter()
  const pathname = usePathname()

  // ─── Load blocks from DB on mount ─────────────────────────
  useEffect(() => {
    if (!dashid || !userId) return

    const loadDesk = async () => {
      setIsLoading(true)
      try {
        setProjectWorkflowId(dashid)

        // Check viewer/editor permission for this desk
        if (userEmail) {
          const access = await getSharedDeskAccess(dashid, userEmail)
          setDeskAccess(access)
        }

        const dbBlocks = await initializeDefaultDesk(dashid, userId)
        setBlocks(
          dbBlocks.map((b) => ({
            ...b,
            actionButtons: [],
            isExecuting: false,
          }))
        )
      } catch (err) {
        console.error("Failed to load desk blocks:", err)
        toast.error("Failed to load desk")
      } finally {
        setIsLoading(false)
      }
    }

    loadDesk()
  }, [dashid, userId])

  // ─── Auto-save block state to DB (debounced) ──────────────
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const debouncedSaveBlock = useCallback(
    (blockId: string) => {
      if (saveTimerRef.current[blockId]) {
        clearTimeout(saveTimerRef.current[blockId])
      }
      saveTimerRef.current[blockId] = setTimeout(async () => {
        const block = useDeskStore.getState().blocks.find((b) => b.id === blockId)
        if (!block) return
        try {
          await updateDeskBlockInputs(blockId, {
            textInputs: block.textInputs,
            sheets: block.sheets,
            checkboxFields: block.checkboxFields,
          })
        } catch (err) {
          console.error("Failed to save block:", err)
        }
      }, 2000)
    },
    []
  )

  // Watch blocks for changes and trigger save
  useEffect(() => {
    blocks.forEach((block) => {
      debouncedSaveBlock(block.id)
    })
  }, [blocks, debouncedSaveBlock])



  // ─── Add new BigBlock (root block + first child tab) ──────
  const handleAddBlock = useCallback(async () => {
    if (!dashid || !userId) return
    if (isViewer) {
      toast.error("Viewers cannot add blocks")
      return
    }
    setIsAddingBlock(true)
    try {
      // Create root BigBlock
      const rootBlock = await createDeskBlock(dashid, userId, undefined, undefined, `BigBlock ${blocks.filter(b => !b.parentId).length + 1}`)
      addBlock({ ...rootBlock, actionButtons: [], isExecuting: false })

      // Create first child tab inside the BigBlock
      const firstTab = await createDeskBlock(dashid, userId, 0, rootBlock.id, "Tab 1")
      addBlock({ ...firstTab, actionButtons: [], isExecuting: false })

      toast.success("BigBlock added with first tab")
    } catch (err: any) {
      toast.error(err?.message || "Failed to add block")
    } finally {
      setIsAddingBlock(false)
    }
  }, [dashid, userId, addBlock, blocks])

  // ─── Execute a block ──────────────────────────────────────
  const handleExecuteBlock = useCallback(
    async (blockId: string) => {
      const block = useDeskStore.getState().blocks.find((b) => b.id === blockId)
      if (!block) return

      setBlockExecuting(blockId, true)
      try {
        // Load the block's editor workflow
        const workflow = await getWorkFlow(block.editorWorkflowId)
        if (!workflow?.definition) {
          toast.error("No workflow found for this block")
          return
        }

        const def = workflow.definition as any
        const nodes = def?.reactFlow?.nodes ?? []
        const edges = def?.reactFlow?.edges ?? []

        if (nodes.length === 0) {
          toast.info("No nodes in this block's editor. Add nodes via Settings.")
          return
        }

        // Prepare a mock setNodes for execution
        let currentNodes = [...nodes]
        const mockSetNodes: React.Dispatch<React.SetStateAction<any[]>> = (updater) => {
          if (typeof updater === "function") {
            currentNodes = updater(currentNodes)
          } else {
            currentNodes = updater
          }
        }

        // Execute the workflow
        await executeWorkflow(currentNodes, edges, mockSetNodes, sessionData?.user?.id)

        // Save updated execution states/results back to workflow definition so editor stays updated
        try {
          const { saveWorkflow } = await import("../editor/_actions/editor.service")
          await saveWorkflow(block.editorWorkflowId, currentNodes, edges)

          const { useWorkflowEditorStore } = await import("@/stores/workflow-editor-store")
          useWorkflowEditorStore.getState().initWorkflow(block.editorWorkflowId, currentNodes, edges)
        } catch {
          // non-critical
        }

        // Find OutputPreviewNode result and set as block output
        const outputNode = currentNodes.find(
          (n: any) => n.type === "OutputPreviewNode" && n.data?.result && n.data?.previewEnabled !== false
        )
        if (outputNode?.data?.result) {
          const outputData = outputNode.data.result
          setBlockOutput(blockId, outputData)
          await updateDeskBlockOutput(blockId, outputData)

          // Also propagate to parent BigBlock's outputPreview & per-tab outputs
          if (block.parentId) {
            setBlockOutput(block.parentId, outputData)
            useDeskStore.getState().setTabOutput(block.parentId, block.name, outputData)
            await updateDeskBlockOutput(block.parentId, outputData)
          }
        }

        toast.success(`Block executed successfully`)
      } catch (err: any) {
        console.error("Block execution failed:", err)
        toast.error(err?.message || "Execution failed")
      } finally {
        setBlockExecuting(blockId, false)
      }
    },
    [setBlockExecuting, setBlockOutput]
  )

  // ─── Add a child tab to a BigBlock ────────────────────────
  const handleAddTab = useCallback(
    async (bigBlockId: string) => {
      if (!dashid || !userId) {
        toast.error("User session not available")
        return
      }
      try {
        const childCount = blocks.filter((b) => b.parentId === bigBlockId).length
        const newChild = await createDeskBlock(
          dashid,
          userId,
          childCount,
          bigBlockId,
          `Tab ${childCount + 1}`
        )
        addBlock({ ...newChild, actionButtons: [], isExecuting: false })
        toast.success(`Tab "${newChild.name}" created`)
        return newChild.id
      } catch (err: any) {
        console.error("Failed to add tab:", err)
        toast.error(err?.message || "Failed to add tab")
      }
    },
    [dashid, userId, blocks, addBlock]
  )

  // ─── Rename a child tab ───────────────────────────────────
  const handleRenameTab = useCallback(
    async (blockId: string, newName: string) => {
      try {
        const { renameDeskBlock } = await import("./desk-block-actions")
        await renameDeskBlock(blockId, newName)
        useDeskStore.getState().updateBlockName(blockId, newName)
      } catch (err: any) {
        console.error("Failed to rename tab:", err)
        toast.error(err?.message || "Failed to rename")
      }
    },
    []
  )

  // ─── Delete a child tab (and auto-delete BigBlock if last tab) ────
  const handleDeleteTab = useCallback(
    async (blockId: string) => {
      try {
        const allBlocks = useDeskStore.getState().blocks
        const targetBlock = allBlocks.find((b) => b.id === blockId)

        await deleteDeskBlock(blockId)
        useDeskStore.getState().removeBlock(blockId)

        if (targetBlock?.parentId) {
          const parentId = targetBlock.parentId
          const remainingChildren = useDeskStore.getState().blocks.filter((b) => b.parentId === parentId)
          if (remainingChildren.length === 0) {
            await deleteDeskBlock(parentId)
            useDeskStore.getState().removeBlock(parentId)
            toast.success("BigBlock deleted (no tabs left)")
            return
          }
        }
        toast.success("Tab deleted")
      } catch (err: any) {
        console.error("Failed to delete tab:", err)
        toast.error(err?.message || "Failed to delete")
      }
    },
    []
  )

  // ─── Delete a BigBlock and all its child tabs ──────────────
  const handleDeleteBigBlock = useCallback(
    async (bigBlockId: string) => {
      try {
        const allBlocks = useDeskStore.getState().blocks
        const children = allBlocks.filter((b) => b.parentId === bigBlockId)

        for (const child of children) {
          await deleteDeskBlock(child.id)
          useDeskStore.getState().removeBlock(child.id)
        }

        await deleteDeskBlock(bigBlockId)
        useDeskStore.getState().removeBlock(bigBlockId)
        toast.success("BigBlock deleted")
      } catch (err: any) {
        console.error("Failed to delete BigBlock:", err)
        toast.error(err?.message || "Failed to delete BigBlock")
      }
    },
    []
  )

  // Watch for triggered action buttons to auto-execute their block
  useEffect(() => {
    blocks.forEach((block) => {
      if (block.actionButtons?.some(a => a.triggered) && !block.isExecuting) {
        // Run the block execution
        handleExecuteBlock(block.id).then(() => {
          // Reset the triggered buttons after execution
          block.actionButtons?.forEach(a => {
            if (a.triggered) {
              useDeskStore.getState().resetActionButton(block.id, a.id);
            }
          });
        });
      }
    });
  }, [blocks, handleExecuteBlock]);

  // ─── OCR Handler ──────────────────────────────────────────
  const handleOcrUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)")
      return
    }
    setOcrProcessing(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await scanTableImage(base64)
      if (result.success && result.data) {
        setOcrResult(result.data)
        toast.success(`Scanned: ${result.data.data.length} rows × ${result.data.columns.length} columns`)
      } else {
        toast.error(result.error || "Failed to extract table from image")
      }
    } catch (err: any) {
      toast.error(err?.message || "OCR processing failed")
    } finally {
      setOcrProcessing(false)
      if (ocrFileRef.current) ocrFileRef.current.value = ""
    }
  }, [setOcrResult, setOcrProcessing])



  // ─── Render ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RoseLoader
            size={141}
            color="#707070"
            secondaryColor="#00313d"
            speed={3.5}
            strokeWidth={3}
            petals={10}
            denominator={4}
          />
          <p className="text-sm text-muted-foreground">Loading desk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* ─── Top Bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
            <Settings2 className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Desk</h1>
            <p className="text-xs text-muted-foreground">
              Configure inputs, scan tables, preview outputs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* OCR Upload */}
          <input
            ref={ocrFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleOcrUpload}
          />
          <Button
            variant="outline"
            onClick={() => ocrFileRef.current?.click()}
            disabled={isOcrProcessing}
            className="gap-1.5"
          >
            {isOcrProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {isOcrProcessing ? "Scanning..." : "Scan Table Image"}
          </Button>


        </div>
      </div>

      {/* ─── Invite Notification Banner ──────────────────── */}
      {userEmail && <InviteNotification userEmail={userEmail} />}

      {/* ─── OCR Result Banner ───────────────────────────── */}
      {ocrResult && (
        <div className="mx-4 mt-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-3 animate-in slide-in-from-top">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                OCR Result — {ocrResult.data.length} rows × {ocrResult.columns.length} columns
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOcrResult(null)}
                className="size-7"
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
          <div className="max-h-[120px] overflow-auto border rounded bg-background">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted sticky top-0">
                  {ocrResult.columns.map((col, i) => (
                    <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap border-r last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ocrResult.data.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-t">
                    {row.map((cell: any, ci: number) => (
                      <td key={ci} className="px-2 py-0.5 whitespace-nowrap border-r last:border-r-0">
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {ocrResult.data.length > 5 && (
                  <tr>
                    <td colSpan={ocrResult.columns.length} className="px-2 py-1 text-center text-muted-foreground italic">
                      ... and {ocrResult.data.length - 5} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Blocks Pipeline ─────────────────────────────── */}
      <div className="flex-1 min-h-full max-h-full overflow-y-auto p-4 space-y-3">
        {blocks.filter(b => !b.parentId).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <p className="text-sm">No blocks yet.</p>
            {!isViewer && (
              <Button onClick={handleAddBlock} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="size-4" />
                Add First BigBlock
              </Button>
            )}
            {isViewer && (
              <p className="text-xs text-amber-500/80">You have view-only access to this desk.</p>
            )}
          </div>
        ) : (
          <>
            {blocks.filter(b => !b.parentId).sort((a, b) => a.blockOrder - b.blockOrder).map((block, index, rootArr) => (
              <React.Fragment key={block.id}>
                <DeskBlock
                  block={block}
                  blockIndex={index}
                  totalBlocks={rootArr.length}
                  allBlocks={blocks}
                  isGuest={isGuest}
                  dashid={dashid}
                  userId={userId}
                  onExecute={handleExecuteBlock}
                  onAddTab={handleAddTab}
                  onRenameTab={handleRenameTab}
                  onDeleteTab={handleDeleteTab}
                  onDeleteBigBlock={handleDeleteBigBlock}
                  previousBlockOutput={index > 0 ? rootArr[index - 1]?.outputPreview : undefined}
                />

                {/* Arrow connector between BigBlocks */}
                {index < rootArr.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center text-zinc-500">
                      <ArrowDown className="size-5" />
                      <span className="text-[9px] text-muted-foreground">data flows</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Add BigBlock Button — hidden for viewers */}
            {!isViewer && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={handleAddBlock}
                  disabled={isAddingBlock}
                  className="gap-1.5 border-dashed border-2"
                >
                  {isAddingBlock ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add BigBlock
                </Button>
              </div>
            )}
          </>
        )}

        {/* ─── AI Updated Merged Preview ───────────────── */}
        <UpdatedMergedPreview />

        {/* ─── Master Sheet Panel ────────────────────────── */}
        <MasterSheetPanel />

        {/* ─── Sheet Version History ──────────────────────── */}
        <MasterSheetHistoryPanel />
      </div>


    </div>
  )
}