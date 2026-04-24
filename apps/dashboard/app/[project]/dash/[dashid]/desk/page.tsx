"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import {
  Plus, Camera, Users, X,
  Settings2, Loader2, ArrowDown,
} from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { Button } from "@/components/ui/components"
import { Label } from "@repo/ui/components/ui/label"
import { Badge } from "@repo/ui/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/components/ui/dialog"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-client"
import { useDeskStore } from "@/stores/desk-store"
import { scanTableImage } from "./ocr-actions"
import {
  inviteToDesk,
  getDeskCollaborators,
  removeCollaborator,
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
import { executeWorkflow } from "../editor/_components/nodes/executions/nodeExecutions"
import { getWorkFlow } from "../editor/_actions/editor.service"

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
    ocrResult,
    isOcrProcessing,
    setBlocks,
    setProjectWorkflowId,
    setIsLoading,
    setIsGuest,
    addBlock,
    removeBlock,
    setBlockOutput,
    setBlockExecuting,
    setOcrResult,
    setOcrProcessing,
  } = useDeskStore()

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loadingCollabs, setLoadingCollabs] = useState(false)
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



  // ─── Add new block ────────────────────────────────────────
  const handleAddBlock = useCallback(async () => {
    if (!dashid || !userId) return
    setIsAddingBlock(true)
    try {
      const newBlock = await createDeskBlock(dashid, userId)
      addBlock({ ...newBlock, actionButtons: [], isExecuting: false })
      toast.success("Block added")
    } catch (err: any) {
      toast.error(err?.message || "Failed to add block")
    } finally {
      setIsAddingBlock(false)
    }
  }, [dashid, userId, addBlock])

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
        await executeWorkflow(currentNodes, edges, mockSetNodes)

        // Find OutputPreviewNode result and set as block output
        const outputNode = currentNodes.find(
          (n: any) => n.type === "OutputPreviewNode" && n.data?.result
        )
        if (outputNode?.data?.result) {
          const outputData = outputNode.data.result
          setBlockOutput(blockId, outputData)
          await updateDeskBlockOutput(blockId, outputData)
        }

        toast.success(`Block ${block.blockOrder + 1} executed successfully`)
      } catch (err: any) {
        console.error("Block execution failed:", err)
        toast.error(err?.message || "Execution failed")
      } finally {
        setBlockExecuting(blockId, false)
      }
    },
    [setBlockExecuting, setBlockOutput]
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

  // ─── Sharing handlers ─────────────────────────────────────
  const handleInvite = useCallback(async () => {
    if (!shareEmail.trim()) return
    if (!activeMasterSheet?.sheetId) {
      toast.error("No master sheet selected — merge data first to create one")
      return
    }
    try {
      await inviteToDesk({
        masterSheetId: activeMasterSheet.sheetId,
        invitedEmail: shareEmail.trim(),
        permission: "editor",
        projectWorkflowId: dashid,
      })
      toast.success(`Invited ${shareEmail}`)
      setShareEmail("")
      loadCollaborators()
    } catch (err: any) {
      toast.error(err?.message || "Failed to invite")
    }
  }, [shareEmail, activeMasterSheet, dashid])

  const loadCollaborators = useCallback(async () => {
    if (!activeMasterSheet?.sheetId) return
    setLoadingCollabs(true)
    try {
      const collabs = await getDeskCollaborators(activeMasterSheet.sheetId)
      setCollaborators(collabs)
    } catch (err) {
      console.error("Failed to load collaborators:", err)
    } finally {
      setLoadingCollabs(false)
    }
  }, [activeMasterSheet?.sheetId])

  const handleRemoveCollab = useCallback(async (shareId: string) => {
    try {
      await removeCollaborator(shareId)
      toast.success("Removed collaborator")
      loadCollaborators()
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove")
    }
  }, [loadCollaborators])

  useEffect(() => {
    if (shareOpen) loadCollaborators()
  }, [shareOpen, loadCollaborators])

  // ─── Render ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-teal-500" />
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

          {/* Share button */}
          <Button
            variant="outline"
            onClick={() => setShareOpen(true)}
            className="gap-1.5"
          >
            <Users className="size-4" />
            Invite Team
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
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <p className="text-sm">No blocks yet.</p>
            <Button onClick={handleAddBlock} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="size-4" />
              Add First Block
            </Button>
          </div>
        ) : (
          <>
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                <DeskBlock
                  block={block}
                  blockIndex={index}
                  totalBlocks={blocks.length}
                  isGuest={isGuest}
                  dashid={dashid}
                  onExecute={handleExecuteBlock}
                  previousBlockOutput={index > 0 ? blocks[index - 1]?.outputPreview : undefined}
                />

                {/* Arrow connector between blocks */}
                {index < blocks.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center text-zinc-500">
                      <ArrowDown className="size-5" />
                      <span className="text-[9px] text-muted-foreground">data flows</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Add Block Button */}
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
                Add Block
              </Button>
            </div>
          </>
        )}

        {/* ─── Master Sheet Panel ────────────────────────── */}
        <MasterSheetPanel />
      </div>

      {/* ─── Share Dialog ────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="dark bg-zinc-950 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Invite Team Members
            </DialogTitle>
            <DialogDescription>
              Share this desk so others can use it (they won't have access to editors).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Invite input */}
            <div className="flex gap-2">
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="colleague@email.com"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite()
                }}
              />
              <Button
                onClick={handleInvite}
                disabled={!shareEmail.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Invite
              </Button>
            </div>

            {/* Collaborator list */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Collaborators</Label>
              {loadingCollabs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : collaborators.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  No collaborators yet
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border"
                    >
                      <div>
                        <span className="text-sm">{collab.invitedEmail}</span>
                        <Badge variant="secondary" className="ml-2 text-[9px]">
                          {collab.permission}
                        </Badge>
                        <Badge variant="outline" className="ml-1 text-[9px]">
                          {collab.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-red-400 hover:text-red-600"
                        onClick={() => handleRemoveCollab(collab.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}