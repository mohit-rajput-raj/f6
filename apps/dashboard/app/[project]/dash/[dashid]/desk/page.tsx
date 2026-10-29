"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  Plus,
  Camera,
  X,
  Settings2,
  Loader2,
  ArrowDown,
  ShieldAlert,
  ArrowLeft,
  Search,
  Table2,
  History,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/components";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useDeskStore, type DeskBlockState } from "@/stores/desk-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scanTableImage } from "./ocr-actions";
import { getSharedDeskAccess, getWorkflowOwner } from "./desk-share-actions";
import {
  getDeskMasterSheet,
  generateDeskMasterSheet,
} from "../(documents)/data-library/master-sheet-actions";
import { DeskOwnerHeader } from "./_components/DeskOwnerHeader";
import { DeskChatBox } from "./_components/DeskChatBox";
import {
  createDeskBlock,
  initializeDefaultDesk,
  updateDeskBlockInputs,
  updateDeskBlockOutput,
  deleteDeskBlock,
  deleteDeskBigBlock,
  getActiveDeskRuns,
  pushFileToBlockHistory,
  updatePushedFileStatus,
  type PushedFileRecord,
} from "./desk-block-actions";
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { usePathname, useRouter, useParams } from "next/navigation";
import { DeskBlock } from "./_components/DeskBlock";
import { MasterSheetPanel } from "./_components/MasterSheetPanel";
import { MasterSheetHistoryPanel } from "./_components/MasterSheetHistoryPanel";
import { DeskPageSkeleton } from "./_components/DeskPageSkeleton";
import { UpdatedMergedPreview } from "./_components/UpdatedMergedPreview";
import { executeWorkflow } from "../editor/_components/nodes/executions/nodeExecutions";
import { getWorkFlow } from "../editor/_actions/editor.service";
import { HelixLoader, RoseLoader } from "curls-loaders";
import { runWorkflow, cancelWorkflow, getRunStatus } from "@/lib/server-api";
import {
  useExecutionSocket,
  type WorkflowEvent,
} from "@/lib/use-execution-socket";
import { useExecutionStore } from "@/stores/execution.store";

// ─── Main Component ─────────────────────────────────────────
export default function DeskPage() {
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const userEmail = sessionData?.user?.email ?? "";
  const params = useParams();
  const dashid = params?.dashid as string;

  const chatCurrentUser = useMemo(() => {
    if (!sessionData?.user) return null;
    return {
      id: sessionData.user.id,
      name:
        sessionData.user.name ||
        sessionData.user.email?.split("@")[0] ||
        "User",
      email: sessionData.user.email || "",
      image: sessionData.user.image,
    };
  }, [
    sessionData?.user?.id,
    sessionData?.user?.name,
    sessionData?.user?.email,
    sessionData?.user?.image,
  ]);

  // ─── Granular Zustand selectors (prevents full re-render on every store change) ───
  const blocks = useDeskStore((s) => s.blocks);
  const isLoading = useDeskStore((s) => s.isLoading);
  const isGuest = useDeskStore((s) => s.isGuest);
  const isViewer = useDeskStore((s) => s.isViewer);
  const ocrResult = useDeskStore((s) => s.ocrResult);
  const isOcrProcessing = useDeskStore((s) => s.isOcrProcessing);

  // Actions (stable references — never cause re-renders)
  const setBlocks = useDeskStore((s) => s.setBlocks);
  const setProjectWorkflowId = useDeskStore((s) => s.setProjectWorkflowId);
  const setIsLoading = useDeskStore((s) => s.setIsLoading);
  const setDeskAccess = useDeskStore((s) => s.setDeskAccess);
  const addBlock = useDeskStore((s) => s.addBlock);
  const setBlockOutput = useDeskStore((s) => s.setBlockOutput);
  const setBlockExecuting = useDeskStore((s) => s.setBlockExecuting);
  const setBlockError = useDeskStore((s) => s.setBlockError);
  const clearBlockError = useDeskStore((s) => s.clearBlockError);
  const setOcrResult = useDeskStore((s) => s.setOcrResult);
  const setOcrProcessing = useDeskStore((s) => s.setOcrProcessing);

  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // OCR file input ref
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // Auto-save, initial load & project tracking refs
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isInitialLoadRef = useRef(true);
  const prevBlockSnapshotRef = useRef<Record<string, string>>({});
  const lastDashidRef = useRef<string>(dashid);

  // Master sheet store
  const { sheets: masterSheets, activeSheetName } = useMasterSheetStore();
  const activeMasterSheet = activeSheetName
    ? masterSheets[activeSheetName]
    : null;

  // ─── Master Sheet State & Tab ──────────────────────────────
  const queryClient = useQueryClient();
  const [hasMasterSheetOverride, setHasMasterSheetOverride] = useState<boolean | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [masterSheetTab, setMasterSheetTab] = useState<"sheet" | "history">("sheet");

  // Deduplicated MasterSheet fetch via TanStack Query (shares cache with MasterSheetPanel)
  const { data: masterSheetRecord, isLoading: isCheckingSheet } = useQuery({
    queryKey: ["desk-master-sheet", dashid],
    queryFn: async () => {
      if (!dashid || !userId) return null;
      return await getDeskMasterSheet(dashid, userId);
    },
    enabled: Boolean(dashid && userId),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const hasMasterSheet = hasMasterSheetOverride ?? Boolean(masterSheetRecord);

  const handleGenerateMasterSheet = async () => {
    if (!dashid || !userId) {
      toast.error("Please log in to generate Master Sheet");
      return;
    }
    setIsGeneratingSheet(true);
    try {
      const newSheet = await generateDeskMasterSheet({
        dashid,
        userId,
        name: ownerData?.workflowName || "Master Sheet",
      });
      if (newSheet) {
        setHasMasterSheetOverride(true);
        useDeskStore.getState().setDeskMasterSheetData(newSheet.data);
        queryClient.invalidateQueries({ queryKey: ["desk-master-sheet", dashid] });
        toast.success("Master Sheet generated successfully!");
      }
    } catch (err: any) {
      console.error("Failed to generate master sheet:", err);
      toast.error(err?.message || "Failed to generate Master Sheet");
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const router = useRouter();
  const pathname = usePathname();

  // ─── Load workflow / desk owner details (cached for 5 minutes) ────
  const {
    data: ownerData,
    refetch: refetchOwner,
    isLoading: isOwnerLoading,
  } = useQuery({
    queryKey: ["desk-owner", dashid],
    queryFn: async () => {
      if (!dashid) return null;
      return await getWorkflowOwner(dashid);
    },
    enabled: !!dashid,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ─── Reset blocks ONLY when dashid actually changes to a different project ───
  useEffect(() => {
    if (lastDashidRef.current !== dashid) {
      lastDashidRef.current = dashid;
      setBlocks([]);
      setAccessDeniedError(null);
      isInitialLoadRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
    }
    setProjectWorkflowId(dashid);
  }, [dashid, setBlocks, setProjectWorkflowId, queryClient]);

  // ─── Flush pending auto-saves on unmount ───────────────────
  useEffect(() => {
    return () => {
      Object.entries(saveTimerRef.current).forEach(([blockId, timer]) => {
        clearTimeout(timer);
        const block = useDeskStore.getState().blocks.find((b) => b.id === blockId);
        if (block) {
          updateDeskBlockInputs(blockId, {
            textInputs: block.textInputs,
            sheets: block.sheets,
            checkboxFields: block.checkboxFields,
          }).catch(console.error);
        }
      });
      saveTimerRef.current = {};
    };
  }, []);

  // ─── Load blocks from DB on mount (cached with TanStack Query) ─────
  const { data: deskData, isLoading: isDeskQueryLoading } = useQuery({
    queryKey: ["desk-load", dashid, userEmail],
    queryFn: async () => {
      if (!dashid || !userEmail) return null;
      setProjectWorkflowId(dashid);

      // Check access permission first
      const access = await getSharedDeskAccess(dashid, userEmail);
      if (access?.isDenied) {
        setAccessDeniedError(access.denialReason || "Access restricted.");
        setBlocks([]);
        return { access, blocks: [], activeRuns: [], runningMap: {} };
      }

      setAccessDeniedError(null);
      setDeskAccess({
        isOwner: access.isOwner,
        isGuest: access.isGuest,
        permission: access.permission === "viewer" ? "viewer" : "editor",
      });

      // Parallel fetch: blocks initialization (skip duplicate access check) + active server runs
      const [dbBlocks, activeRuns] = await Promise.all([
        initializeDefaultDesk(dashid, userId!, true),
        getActiveDeskRuns(dashid).catch(() => []),
      ]);

      // Build active runs lookup (blockId -> runId) so running state survives browser refresh
      const runningMap: Record<string, string> = {};
      (activeRuns || []).forEach((r: any) => {
        if (r.blockId) {
          runningMap[r.blockId] = r.id;
          // Register run in execution store so progress bar & nodes state hydrate
          useExecutionStore.getState().addRun({
            runId: r.id,
            workflowId: r.workflowId,
            totalNodes: Object.keys(r.nodeStates || {}).length || 1,
          });
          if (r.nodeStates) {
            for (const [nodeId, nState] of Object.entries(
              r.nodeStates as Record<string, any>,
            )) {
              useExecutionStore
                .getState()
                .updateNodeState(r.id, nodeId, nState);
            }
          }
        }
      });

      const mappedBlocks = dbBlocks.map((b) => {
        const isRunActive = Boolean(
          runningMap[b.id] || (b.parentId && runningMap[b.parentId]),
        );
        const pFiles = b.pushedFiles?.map((pf) =>
          !isRunActive && pf.status === "processing"
            ? { ...pf, status: "success" as const }
            : pf,
        );
        return {
          ...b,
          pushedFiles: pFiles,
          actionButtons: [] as any[],
          isExecuting: isRunActive,
        };
      });

      return { access, blocks: mappedBlocks, activeRuns, runningMap };
    },
    enabled: !!dashid && !!userId,
    staleTime: 10 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // ─── Sync query data into Zustand store ────────────────────
  useEffect(() => {
    if (!deskData) return;

    if (deskData.access?.isDenied) {
      setAccessDeniedError(deskData.access.denialReason || "Access restricted.");
      setBlocks([]);
      return;
    }

    setAccessDeniedError(null);
    if (deskData.access) {
      setDeskAccess({
        isOwner: deskData.access.isOwner,
        isGuest: deskData.access.isGuest,
        permission: deskData.access.permission === "viewer" ? "viewer" : "editor",
      });
    }

    if (deskData.blocks) {
      const currentBlocks = useDeskStore.getState().blocks;
      // Sync if store is empty or on initial load
      if (currentBlocks.length === 0 || isInitialLoadRef.current) {
        setBlocks(deskData.blocks);
        if (deskData.runningMap) {
          setServerRunningBlocks(deskData.runningMap);
        }

        const snapshot: Record<string, string> = {};
        deskData.blocks.forEach((block) => {
          snapshot[block.id] = JSON.stringify({
            textInputs: block.textInputs,
            sheets: block.sheets,
            checkboxFields: block.checkboxFields,
          });
        });
        prevBlockSnapshotRef.current = snapshot;
        isInitialLoadRef.current = false;

        const blockWithMerged = deskData.blocks.find(
          (b: any) =>
            b.outputPreview && (b.outputPreview as any).updates?.length > 0,
        );
        if (blockWithMerged) {
          useDeskStore
            .getState()
            .setMergedPreview(blockWithMerged.outputPreview as any);
        }
      } else {
        // ── Merge structural changes from DB ──
        // When the user returns from the editor after adding/removing
        // DeskSheetNode or DeskTextInputNode nodes, the DB has the updated
        // textInputs/sheets (written by syncBlockFieldsFromWorkflow on save).
        // We must merge those structural changes into the live store while
        // preserving user-entered values (text input values, uploaded sheet data).
        const store = useDeskStore.getState();

        deskData.blocks.forEach((dbBlock) => {
          const storeBlock = currentBlocks.find((b) => b.id === dbBlock.id);
          if (!storeBlock) {
            // Entirely new block added from another session – add it
            store.addBlock(dbBlock);
            return;
          }

          // Compare textInputs & sheets IDs and labels to detect structural changes
          const storeInputKey = (storeBlock.textInputs || [])
            .map((t) => `${t.id}:${t.placeholder}`)
            .sort()
            .join(",");
          const dbInputKey = (dbBlock.textInputs || [])
            .map((t) => `${t.id}:${t.placeholder}`)
            .sort()
            .join(",");
          const storeSheetKey = (storeBlock.sheets || [])
            .map((s) => `${s.id}:${s.name}`)
            .sort()
            .join(",");
          const dbSheetKey = (dbBlock.sheets || [])
            .map((s) => `${s.id}:${s.name}`)
            .sort()
            .join(",");

          if (storeInputKey !== dbInputKey || storeSheetKey !== dbSheetKey) {
            // Merge: adopt DB structure, preserve user-entered values
            const mergedInputs = (dbBlock.textInputs || []).map((dbInput) => {
              const existing = (storeBlock.textInputs || []).find((t) => t.id === dbInput.id);
              return existing ? { ...dbInput, value: existing.value ?? dbInput.value ?? "" } : dbInput;
            });
            const mergedSheets = (dbBlock.sheets || []).map((dbSheet) => {
              const existing = (storeBlock.sheets || []).find((s) => s.id === dbSheet.id);
              return existing ? { ...dbSheet, data: existing.data ?? dbSheet.data ?? null } : dbSheet;
            });

            store.updateBlock(storeBlock.id, {
              textInputs: mergedInputs,
              sheets: mergedSheets,
              checkboxFields: dbBlock.checkboxFields || [],
            });

            // Update the snapshot so auto-save doesn't immediately revert
            prevBlockSnapshotRef.current[storeBlock.id] = JSON.stringify({
              textInputs: mergedInputs,
              sheets: mergedSheets,
              checkboxFields: dbBlock.checkboxFields || [],
            });
          }
        });

        // Handle blocks that were removed from DB
        const dbBlockIds = new Set(deskData.blocks.map((b) => b.id));
        currentBlocks.forEach((sb) => {
          if (!dbBlockIds.has(sb.id)) {
            store.removeBlock(sb.id);
          }
        });
      }
    }
  }, [deskData, setBlocks, setDeskAccess]);

  // Sync TanStack Query loading state with our store's isLoading
  useEffect(() => {
    const hasBlocks = useDeskStore.getState().blocks.length > 0;
    if (!hasBlocks) {
      setIsLoading(isDeskQueryLoading);
    } else {
      setIsLoading(false);
    }
  }, [isDeskQueryLoading, setIsLoading]);

  // ─── Auto-save block state to DB (debounced, targeted) ────

  const debouncedSaveBlock = useCallback((blockId: string) => {
    if (saveTimerRef.current[blockId]) {
      clearTimeout(saveTimerRef.current[blockId]);
    }
    saveTimerRef.current[blockId] = setTimeout(async () => {
      const block = useDeskStore
        .getState()
        .blocks.find((b) => b.id === blockId);
      if (!block) return;
      try {
        await updateDeskBlockInputs(blockId, {
          textInputs: block.textInputs,
          sheets: block.sheets,
          checkboxFields: block.checkboxFields,
        });
      } catch (err) {
        console.error("Failed to save block:", err);
      }
    }, 2000);
  }, []);

  // Watch blocks for changes and trigger save — ONLY for blocks that actually changed
  useEffect(() => {
    // Skip if initial load hasn't finished yet or blocks is empty
    if (isInitialLoadRef.current || blocks.length === 0) {
      if (blocks.length > 0) {
        const snapshot: Record<string, string> = {};
        blocks.forEach((block) => {
          snapshot[block.id] = JSON.stringify({
            textInputs: block.textInputs,
            sheets: block.sheets,
            checkboxFields: block.checkboxFields,
          });
        });
        prevBlockSnapshotRef.current = snapshot;
        isInitialLoadRef.current = false;
      }
      return;
    }

    // Only save blocks whose saveable fields actually changed
    blocks.forEach((block) => {
      const currentKey = JSON.stringify({
        textInputs: block.textInputs,
        sheets: block.sheets,
        checkboxFields: block.checkboxFields,
      });
      const prevKey = prevBlockSnapshotRef.current[block.id];

      // If we don't have a snapshot for this block yet, initialize it without saving
      if (prevKey === undefined) {
        prevBlockSnapshotRef.current[block.id] = currentKey;
        return;
      }

      if (currentKey !== prevKey) {
        prevBlockSnapshotRef.current[block.id] = currentKey;
        debouncedSaveBlock(block.id);
      }
    });
  }, [blocks, debouncedSaveBlock]);

  // ─── Add new BigBlock (root block + first child tab) ──────
  const handleAddBlock = useCallback(async () => {
    if (!dashid || !userId) return;
    if (isViewer) {
      toast.error("Viewers cannot add blocks");
      return;
    }
    setIsAddingBlock(true);
    try {
      // Create root BigBlock
      const rootBlock = await createDeskBlock(
        dashid,
        userId,
        undefined,
        undefined,
        `BigBlock ${blocks.filter((b) => !b.parentId).length + 1}`,
      );
      addBlock({ ...rootBlock, actionButtons: [], isExecuting: false });

      // Create first child tab inside the BigBlock
      const firstTab = await createDeskBlock(
        dashid,
        userId,
        0,
        rootBlock.id,
        "Tab 1",
      );
      addBlock({ ...firstTab, actionButtons: [], isExecuting: false });
      queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });

      toast.success("BigBlock added with first tab");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add block");
    } finally {
      setIsAddingBlock(false);
    }
  }, [dashid, userId, addBlock, blocks, queryClient]);

  // ─── Execute a block ──────────────────────────────────────
  const handleExecuteBlock = useCallback(
    async (blockId: string) => {
      const block = useDeskStore
        .getState()
        .blocks.find((b) => b.id === blockId);
      if (!block) return;

      setBlockExecuting(blockId, true);
      // Clear previous errors
      setBlockError(blockId, null);
      if (block.parentId) {
        setBlockError(block.parentId, null);
      }
      // Immediately reset previous output preview so old data doesn't linger while executing
      setBlockOutput(blockId, null);
      if (block.parentId) {
        setBlockOutput(block.parentId, null);
      }

      try {
        // Load the block's editor workflow
        const workflow = await getWorkFlow(block.editorWorkflowId);
        if (!workflow?.definition) {
          const errObj = {
            message: "No workflow found for this block",
            code: "WORKFLOW_NOT_FOUND",
            timestamp: new Date().toISOString(),
          };
          setBlockError(blockId, errObj);
          if (block.parentId) setBlockError(block.parentId, errObj);
          toast.error("No workflow found for this block");
          return;
        }

        const def = workflow.definition as any;
        const nodes = def?.reactFlow?.nodes ?? [];
        const edges = def?.reactFlow?.edges ?? [];

        if (nodes.length === 0) {
          const errObj = {
            message: "Workflow has no nodes",
            code: "INTERNAL_ERROR",
            details: {
              reason:
                "This block has an empty editor workflow canvas. Open the editor and add nodes to build your workflow.",
            },
            timestamp: new Date().toISOString(),
          };
          setBlockError(blockId, errObj);
          if (block.parentId) setBlockError(block.parentId, errObj);
          toast.error("Workflow has no nodes");
          return;
        }

        // Prepare a mock setNodes for execution
        let currentNodes = [...nodes];
        const mockSetNodes: React.Dispatch<React.SetStateAction<any[]>> = (
          updater,
        ) => {
          if (typeof updater === "function") {
            currentNodes = updater(currentNodes);
          } else {
            currentNodes = updater;
          }
        };

        // Execute the workflow
        await executeWorkflow(
          currentNodes,
          edges,
          mockSetNodes,
          sessionData?.user?.id,
        );

        // Check if any node returned an error during execution
        const failedNode = currentNodes.find(
          (n: any) =>
            n.data?.error ||
            (Array.isArray(n.data?.errors) && n.data.errors.length > 0),
        );
        if (failedNode) {
          const errObj = {
            message:
              failedNode.data?.error ||
              `${failedNode.type || "Node"} execution error`,
            code: "NODE_ERROR",
            nodeId: failedNode.id,
            nodeType: failedNode.type,
            details: failedNode.data?.errors || failedNode.data?.error,
            timestamp: new Date().toISOString(),
          };
          setBlockError(blockId, errObj);
          if (block.parentId) setBlockError(block.parentId, errObj);
        }

        // Save updated execution states/results back to workflow definition so editor stays updated
        try {
          const { saveWorkflow } =
            await import("../editor/_actions/editor.service");
          await saveWorkflow(block.editorWorkflowId, currentNodes, edges);

          const { useWorkflowEditorStore } =
            await import("@/stores/workflow-editor-store");
          useWorkflowEditorStore
            .getState()
            .initWorkflow(block.editorWorkflowId, currentNodes, edges);
        } catch {
          // non-critical
        }

        // Find OutputPreviewNode result and set as block output
        const outputNode = currentNodes.find(
          (n: any) =>
            n.type === "OutputPreviewNode" &&
            n.data?.result &&
            n.data?.previewEnabled !== false,
        );
        if (outputNode?.data?.result) {
          const outputData = outputNode.data.result;
          setBlockOutput(blockId, outputData);
          await updateDeskBlockOutput(blockId, outputData);

          // Also propagate to parent BigBlock's outputPreview & per-tab outputs
          if (block.parentId) {
            setBlockOutput(block.parentId, outputData);
            useDeskStore
              .getState()
              .setTabOutput(block.parentId, block.name, outputData);
            await updateDeskBlockOutput(block.parentId, outputData);
          }
        } else {
          setBlockOutput(blockId, null);
          await updateDeskBlockOutput(blockId, null);
          if (block.parentId) {
            setBlockOutput(block.parentId, null);
            useDeskStore
              .getState()
              .setTabOutput(block.parentId, block.name, null);
            await updateDeskBlockOutput(block.parentId, null);
          }
        }

        if (!failedNode) {
          toast.success(`Block executed successfully`);
        } else {
          toast.error(`Block executed with node errors`);
        }
      } catch (err: any) {
        console.error("Block execution failed:", err);
        const errObj = {
          message: err?.message || "Execution failed",
          code: err?.code || "EXECUTION_ERROR",
          details: err?.stack || err,
          timestamp: new Date().toISOString(),
        };
        setBlockError(blockId, errObj);
        if (block.parentId) setBlockError(block.parentId, errObj);
        toast.error(err?.message || "Execution failed");
      } finally {
        setBlockExecuting(blockId, false);
      }
    },
    [setBlockExecuting, setBlockOutput, setBlockError, sessionData?.user?.id],
  );

  // ── Execute a block on SERVER ─────────────────────────────
  const addRun = useExecutionStore((s) => s.addRun);
  const updateNodeState = useExecutionStore((s) => s.updateNodeState);
  const updateRunStatus = useExecutionStore((s) => s.updateRunStatus);
  const addRunError = useExecutionStore((s) => s.addRunError);
  const executionRuns = useExecutionStore((s) => s.runs);

  // Track which blockId is running on server
  const [serverRunningBlocks, setServerRunningBlocks] = useState<
    Record<string, string>
  >({}); // blockId -> runId

  // ── Helper to cleanly complete a server run and update all stores & DB ──
  const completeRun = useCallback(
    async (runId: string, output?: any) => {
      updateRunStatus(runId, "completed");

      let finalOutput = output;
      if (!finalOutput) {
        try {
          const res = await getRunStatus(runId);
          if (res.success && res.data?.output) finalOutput = res.data.output;
        } catch {
          // ignore
        }
      }

      const allBlocks = useDeskStore.getState().blocks;
      const matchingBlockIds = Object.entries(serverRunningBlocks)
        .filter(([_, rId]) => rId === runId)
        .map(([bId]) => bId);

      for (const bId of matchingBlockIds) {
        setBlockExecuting(bId, false);
        if (finalOutput) {
          setBlockOutput(bId, finalOutput);
          await updateDeskBlockOutput(bId, finalOutput);
          // If finalOutput has updates or targetPath, populate mergedPreview store for UpdatedMergedPreview component
          if (
            finalOutput.updates ||
            finalOutput.alignment ||
            finalOutput.targetPath ||
            finalOutput.stackName
          ) {
            useDeskStore.getState().setMergedPreview(finalOutput);
          }
        }
        const blk = allBlocks.find((b) => b.id === bId);
        if (blk?.parentId) {
          setBlockExecuting(blk.parentId, false);
          if (finalOutput) {
            setBlockOutput(blk.parentId, finalOutput);
            useDeskStore
              .getState()
              .setTabOutput(blk.parentId, blk.name, finalOutput);
            await updateDeskBlockOutput(blk.parentId, finalOutput);
          }
        }

        const procFiles =
          blk?.pushedFiles?.filter((f) => f.status === "processing") || [];
        for (const pf of procFiles) {
          useDeskStore.getState().updatePushedFileStatus(bId, pf.id, "success");
          updatePushedFileStatus(bId, pf.id, "success").catch(console.error);
        }
        if (blk?.parentId) {
          const parentBlk = allBlocks.find((b) => b.id === blk.parentId);
          const pProcFiles =
            parentBlk?.pushedFiles?.filter((f) => f.status === "processing") ||
            [];
          for (const pf of pProcFiles) {
            useDeskStore
              .getState()
              .updatePushedFileStatus(blk.parentId, pf.id, "success");
            updatePushedFileStatus(blk.parentId, pf.id, "success").catch(
              console.error,
            );
          }
        }
      }

      setServerRunningBlocks((prev) => {
        const next = { ...prev };
        for (const [bId, rId] of Object.entries(next)) {
          if (rId === runId) delete next[bId];
        }
        return next;
      });
    },
    [serverRunningBlocks, setBlockExecuting, setBlockOutput, updateRunStatus],
  );

  // ── Helper to fail a server run ──
  const failRun = useCallback(
    async (runId: string, error?: string) => {
      updateRunStatus(runId, "error", { error });
      const wfErrObj = {
        message: error || "Server execution failed",
        code: "WORKFLOW_ERROR",
        timestamp: new Date().toISOString(),
      };
      const allBlocks = useDeskStore.getState().blocks;
      const matchingBlockIds = Object.entries(serverRunningBlocks)
        .filter(([_, rId]) => rId === runId)
        .map(([bId]) => bId);

      for (const bId of matchingBlockIds) {
        setBlockExecuting(bId, false);
        setBlockError(bId, wfErrObj);
        const blk = allBlocks.find((b) => b.id === bId);
        if (blk?.parentId) {
          setBlockExecuting(blk.parentId, false);
          setBlockError(blk.parentId, wfErrObj);
        }
        const procFiles =
          blk?.pushedFiles?.filter((f) => f.status === "processing") || [];
        for (const pf of procFiles) {
          useDeskStore
            .getState()
            .updatePushedFileStatus(bId, pf.id, "failed", error);
          updatePushedFileStatus(bId, pf.id, "failed", error).catch(
            console.error,
          );
        }
      }

      setServerRunningBlocks((prev) => {
        const next = { ...prev };
        for (const [bId, rId] of Object.entries(next)) {
          if (rId === runId) delete next[bId];
        }
        return next;
      });
    },
    [serverRunningBlocks, setBlockExecuting, setBlockError, updateRunStatus],
  );

  const handleExecutionEvent = useCallback(
    (event: WorkflowEvent) => {
      const { runId, nodeId, nodeType, data, error, timestamp } = event;
      const rawType = (event.type as string) || "";
      const type = rawType.includes(":") ? rawType.replace(":", "_") : rawType;

      switch (type) {
        case "node_started":
          if (nodeId)
            updateNodeState(runId, nodeId, {
              nodeType: nodeType || "unknown",
              status: "running",
              startedAt: timestamp,
            });
          break;
        case "node_completed":
          if (nodeId)
            updateNodeState(runId, nodeId, {
              status: "completed",
              output: data,
              completedAt: timestamp,
            });
          break;
        case "node_error":
          if (nodeId) {
            updateNodeState(runId, nodeId, {
              status: "error",
              error,
              completedAt: timestamp,
            });
            addRunError({
              nodeId,
              nodeType: nodeType || "unknown",
              error: error || "Unknown error",
              timestamp,
            });
          }
          break;
        case "node_skipped":
          if (nodeId) updateNodeState(runId, nodeId, { status: "skipped" });
          break;
        case "workflow_completed":
          completeRun(runId, data);
          toast.success("Server execution completed");
          break;
        case "workflow_error":
          failRun(runId, error || "Server execution failed");
          toast.error(`Server execution failed: ${error || "Unknown"}`);
          break;
        case "workflow_paused":
          updateRunStatus(runId, "paused", { pausedRequest: data });
          toast.info("Workflow paused — waiting for input");
          break;
        case "workflow_cancelled":
          updateRunStatus(runId, "cancelled");
          setServerRunningBlocks((prev) => {
            const next = { ...prev };
            for (const [bId, rId] of Object.entries(next)) {
              if (rId === runId) {
                delete next[bId];
                setBlockExecuting(bId, false);
              }
            }
            return next;
          });
          toast.info("Server execution cancelled");
          break;
      }
    },
    [
      updateNodeState,
      updateRunStatus,
      addRunError,
      setBlockExecuting,
      completeRun,
      failRun,
    ],
  );

  useExecutionSocket({
    userId,
    enabled: !!userId,
    onEvent: handleExecutionEvent,
  });

  // ── Resume polling for active runs found on mount (survives browser refresh) ──
  const hasResumedPollingRef = useRef(false);
  useEffect(() => {
    if (hasResumedPollingRef.current) return;
    if (!deskData?.activeRuns?.length) return;

    hasResumedPollingRef.current = true;
    const activeRuns = deskData.activeRuns.filter(
      (r: any) => r.status === "running" || r.status === "paused",
    );

    for (const run of activeRuns) {
      const runId = run.id;
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const statusRes = await getRunStatus(runId);
          if (statusRes.success && statusRes.data) {
            const runData = statusRes.data;
            if (runData.status === "completed") {
              clearInterval(pollInterval);
              await completeRun(runId, runData.output);
              toast.success("Server execution completed");
            } else if (
              runData.status === "error" ||
              runData.status === "cancelled"
            ) {
              clearInterval(pollInterval);
              await failRun(runId, runData.error || "Server execution failed");
            }
          }
        } catch {
          // network retry
        }
        if (pollCount > 150) clearInterval(pollInterval); // timeout after ~2 minutes
      }, 800);
    }
  }, [deskData?.activeRuns, completeRun, failRun]);

  const handleServerExecuteBlock = useCallback(
    async (
      blockId: string,
      options?: {
        pushedFileRecord?: PushedFileRecord;
        customSheets?: any[];
      },
    ) => {
      const block = useDeskStore
        .getState()
        .blocks.find((b) => b.id === blockId);
      if (!block || !userId) return;

      setBlockExecuting(blockId, true);
      if (block.parentId) setBlockExecuting(block.parentId, true);
      setBlockOutput(blockId, null);
      if (block.parentId) setBlockOutput(block.parentId, null);
      setBlockError(blockId, null);
      if (block.parentId) setBlockError(block.parentId, null);

      // If a file was pushed to running instance, save immediately to history
      if (options?.pushedFileRecord) {
        useDeskStore
          .getState()
          .addPushedFile(blockId, options.pushedFileRecord);
        if (block.parentId) {
          useDeskStore
            .getState()
            .addPushedFile(block.parentId, options.pushedFileRecord);
        }
        pushFileToBlockHistory(blockId, options.pushedFileRecord).catch(
          console.error,
        );
        if (block.parentId) {
          pushFileToBlockHistory(
            block.parentId,
            options.pushedFileRecord,
          ).catch(console.error);
        }
      }

      const activeSheets = options?.customSheets || block.sheets || [];

      // Persist inputs to DB immediately so server resolvers and page reloads have the fresh data
      updateDeskBlockInputs(blockId, {
        textInputs: block.textInputs,
        sheets: activeSheets,
        checkboxFields: block.checkboxFields,
      }).catch(console.error);

      const deskInputs = {
        textInputs:
          block.textInputs?.map((t) => ({ id: t.id, value: t.value })) || [],
        sheets: activeSheets.map((s) => ({ id: s.id, data: s.data })) || [],
        checkboxFields:
          block.checkboxFields?.map((c) => ({
            id: c.id,
            checked: c.checked,
          })) || [],
        actionButtons:
          block.actionButtons?.map((a) => ({
            id: a.id,
            triggered: a.triggered,
          })) || [],
      };

      const result = await runWorkflow({
        workflowId: block.editorWorkflowId,
        userId,
        dashid,
        blockId,
        deskInputs,
      });

      if (result.success && result.data?.runId) {
        const runId = result.data.runId;
        const workflow = await getWorkFlow(block.editorWorkflowId);
        const nodeCount =
          (workflow?.definition as any)?.reactFlow?.nodes?.length ?? 0;
        addRun({
          runId,
          workflowId: block.editorWorkflowId,
          totalNodes: nodeCount,
        });
        setServerRunningBlocks((prev) => ({
          ...prev,
          [blockId]: runId,
          ...(block.parentId ? { [block.parentId]: runId } : {}),
        }));
        toast.success(`Server run started (${runId.slice(0, 8)}…)`);

        // ACTIVE POLLING HEARTBEAT:
        // Polling guarantees fast UI updates (every 800ms) without waiting on WebSocket delivery
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const statusRes = await getRunStatus(runId);
            if (statusRes.success && statusRes.data) {
              const runData = statusRes.data;
              if (runData.status === "completed") {
                clearInterval(pollInterval);
                await completeRun(runId, runData.output);
                toast.success("Server execution completed");
              } else if (
                runData.status === "error" ||
                runData.status === "cancelled"
              ) {
                clearInterval(pollInterval);
                await failRun(
                  runId,
                  runData.error || "Server execution failed",
                );
              }
            }
          } catch {
            // network retry
          }
          if (pollCount > 150) clearInterval(pollInterval); // timeout after 2 minutes
        }, 800);
      } else {
        setBlockExecuting(blockId, false);
        if (block.parentId) setBlockExecuting(block.parentId, false);

        if (options?.pushedFileRecord) {
          const errMsg = result.error || "Server execution failed to start";
          useDeskStore
            .getState()
            .updatePushedFileStatus(
              blockId,
              options.pushedFileRecord.id,
              "failed",
              errMsg,
            );
          updatePushedFileStatus(
            blockId,
            options.pushedFileRecord.id,
            "failed",
            errMsg,
          ).catch(console.error);
          if (block.parentId) {
            useDeskStore
              .getState()
              .updatePushedFileStatus(
                block.parentId,
                options.pushedFileRecord.id,
                "failed",
                errMsg,
              );
            updatePushedFileStatus(
              block.parentId,
              options.pushedFileRecord.id,
              "failed",
              errMsg,
            ).catch(console.error);
          }
        }

        const errObj = {
          message: result.error || "Server execution failed to start",
          code: result.errorObj?.code || "INTERNAL_ERROR",
          details: result.errorObj?.details || result.errorObj,
          timestamp: new Date().toISOString(),
        };
        setBlockError(blockId, errObj);
        if (block.parentId) setBlockError(block.parentId, errObj);
        toast.error(`Server run failed: ${result.error || "Unknown error"}`);
      }
    },
    [
      userId,
      dashid,
      setBlockExecuting,
      setBlockOutput,
      setBlockError,
      addRun,
      completeRun,
      failRun,
    ],
  );

  const handleCancelServerBlock = useCallback(
    async (blockId: string) => {
      let runId = serverRunningBlocks[blockId];
      if (!runId) {
        // If blockId is parent, search child blocks
        const childRuns = useDeskStore
          .getState()
          .blocks.filter((b) => b.parentId === blockId)
          .map((b) => serverRunningBlocks[b.id])
          .filter(Boolean);
        if (childRuns.length > 0) runId = childRuns[0];
      }
      if (!runId) return;

      const result = await cancelWorkflow(runId);
      if (result.success) {
        setBlockExecuting(blockId, false);
        setServerRunningBlocks((prev) => {
          const n = { ...prev };
          for (const [k, v] of Object.entries(n)) {
            if (v === runId) {
              delete n[k];
              setBlockExecuting(k, false);
            }
          }
          return n;
        });
        toast.info("Server execution cancelled");
      }
    },
    [serverRunningBlocks, setBlockExecuting],
  );

  // ─── Add a child tab to a BigBlock ────────────────────────
  const handleAddTab = useCallback(
    async (bigBlockId: string) => {
      if (!dashid || !userId) {
        toast.error("User session not available");
        return;
      }
      try {
        const childCount = blocks.filter(
          (b) => b.parentId === bigBlockId,
        ).length;
        const newChild = await createDeskBlock(
          dashid,
          userId,
          childCount,
          bigBlockId,
          `Tab ${childCount + 1}`,
        );
        addBlock({ ...newChild, actionButtons: [], isExecuting: false });
        queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
        toast.success(`Tab "${newChild.name}" created`);
        return newChild.id;
      } catch (err: any) {
        console.error("Failed to add tab:", err);
        toast.error(err?.message || "Failed to add tab");
      }
    },
    [dashid, userId, blocks, addBlock, queryClient],
  );

  // ─── Rename a child tab ───────────────────────────────────
  const handleRenameTab = useCallback(
    async (blockId: string, newName: string) => {
      try {
        const { renameDeskBlock } = await import("./desk-block-actions");
        await renameDeskBlock(blockId, newName);
        useDeskStore.getState().updateBlockName(blockId, newName);
      } catch (err: any) {
        console.error("Failed to rename tab:", err);
        toast.error(err?.message || "Failed to rename");
      }
    },
    [],
  );

  // ─── Delete a child tab (and auto-delete BigBlock if last tab) ────
  const handleDeleteTab = useCallback(
    async (blockId: string) => {
      try {
        const allBlocks = useDeskStore.getState().blocks;
        const targetBlock = allBlocks.find((b) => b.id === blockId);
        const userEmail = sessionData?.user?.email;

        // If this block is actually a root BigBlock (no parentId)
        if (targetBlock && !targetBlock.parentId) {
          await deleteDeskBigBlock(blockId, userEmail, !isGuest);
          const children = allBlocks.filter((b) => b.parentId === blockId);
          for (const child of children) {
            useDeskStore.getState().removeBlock(child.id);
          }
          useDeskStore.getState().removeBlock(blockId);
          queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
          toast.success("BigBlock deleted");
          return;
        }

        await deleteDeskBlock(blockId, userEmail, !isGuest);
        useDeskStore.getState().removeBlock(blockId);

        if (targetBlock?.parentId) {
          const parentId = targetBlock.parentId;
          const remainingChildren = useDeskStore
            .getState()
            .blocks.filter((b) => b.parentId === parentId);
          if (remainingChildren.length === 0) {
            await deleteDeskBlock(parentId, userEmail, !isGuest);
            useDeskStore.getState().removeBlock(parentId);
            queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
            toast.success("BigBlock deleted (no tabs left)");
            return;
          }
        }
        queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
        toast.success("Tab deleted");
      } catch (err: any) {
        console.error("Failed to delete tab:", err);
        toast.error(err?.message || "Failed to delete");
        throw err;
      }
    },
    [sessionData?.user?.email, isGuest, dashid, queryClient],
  );

  // ─── Delete a BigBlock and all its child tabs ──────────────
  const handleDeleteBigBlock = useCallback(
    async (bigBlockId: string) => {
      try {
        const userEmail = sessionData?.user?.email;
        await deleteDeskBigBlock(bigBlockId, userEmail, !isGuest);

        const allBlocks = useDeskStore.getState().blocks;
        const children = allBlocks.filter((b) => b.parentId === bigBlockId);

        for (const child of children) {
          useDeskStore.getState().removeBlock(child.id);
        }

        useDeskStore.getState().removeBlock(bigBlockId);
        queryClient.invalidateQueries({ queryKey: ["desk-load", dashid] });
        toast.success("BigBlock deleted");
      } catch (err: any) {
        console.error("Failed to delete BigBlock:", err);
        toast.error(err?.message || "Failed to delete BigBlock");
        throw err;
      }
    },
    [sessionData?.user?.email, isGuest, dashid, queryClient],
  );

  // Watch for triggered action buttons to auto-execute their block
  // Only checks blocks with triggered buttons (avoids iterating all blocks every render)
  const triggeredBlocks = useMemo(
    () =>
      blocks.filter(
        (b) => b.actionButtons?.some((a) => a.triggered) && !b.isExecuting,
      ),
    [blocks],
  );

  useEffect(() => {
    triggeredBlocks.forEach((block) => {
      handleExecuteBlock(block.id).then(() => {
        block.actionButtons?.forEach((a) => {
          if (a.triggered) {
            useDeskStore.getState().resetActionButton(block.id, a.id);
          }
        });
      });
    });
  }, [triggeredBlocks, handleExecuteBlock]);

  // ─── OCR Handler ──────────────────────────────────────────
  // const handleOcrUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (!file) return
  //   if (!file.type.startsWith("image/")) {
  //     toast.error("Please upload an image file (PNG, JPG, etc.)")
  //     return
  //   }
  //   setOcrProcessing(true)
  //   try {
  //     const reader = new FileReader()
  //     const base64 = await new Promise<string>((resolve, reject) => {
  //       reader.onload = () => resolve(reader.result as string)
  //       reader.onerror = reject
  //       reader.readAsDataURL(file)
  //     })
  //     const result = await scanTableImage(base64)
  //     if (result.success && result.data) {
  //       setOcrResult(result.data)
  //       toast.success(`Scanned: ${result.data.data.length} rows × ${result.data.columns.length} columns`)
  //     } else {
  //       toast.error(result.error || "Failed to extract table from image")
  //     }
  //   } catch (err: any) {
  //     toast.error(err?.message || "OCR processing failed")
  //   } finally {
  //     setOcrProcessing(false)
  //     if (ocrFileRef.current) ocrFileRef.current.value = ""
  //   }
  // }, [setOcrResult, setOcrProcessing])

  if (accessDeniedError || deskData?.access?.isDenied) {
    return (
      <div className="h-full w-full min-h-[500px] flex flex-col items-center justify-center p-6 bg-background text-center space-y-4">
        <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs">
          <ShieldAlert className="size-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {accessDeniedError || deskData?.access?.denialReason || "You are not an authorized member of this desk."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="text-xs font-semibold gap-1.5 mt-2"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to Projects</span>
        </Button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  if (!userEmail || isDeskQueryLoading || isOwnerLoading || isLoading) {
    return <DeskPageSkeleton />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* ─── Owner Profile Header ─── */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <DeskOwnerHeader
          dashid={dashid}
          ownerData={ownerData ?? null}
          currentUserId={userId}
          currentUserEmail={userEmail}
          isOwner={Boolean(
            deskData?.access?.isOwner ??
              (ownerData
                ? Boolean(
                    (userId && ownerData.id === userId) ||
                    (userEmail &&
                      ownerData.email?.toLowerCase() === userEmail.toLowerCase())
                  )
                : !isGuest)
          )}
          isLoading={isOwnerLoading}
          onRefresh={() => {
            refetchOwner();
          }}
        />
      </div>

      {/* ─── OCR Result Banner ───────────────────────────── */}
      {ocrResult && (
        <div className="mx-4 mt-3 rounded-lg border border-border bg-card p-3 animate-in slide-in-from-top">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                OCR Result — {ocrResult.data.length} rows ×{" "}
                {ocrResult.columns.length} columns
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
                    <th
                      key={i}
                      className="px-2 py-1 text-left font-medium whitespace-nowrap border-r last:border-r-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ocrResult.data.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-t">
                    {row.map((cell: any, ci: number) => (
                      <td
                        key={ci}
                        className="px-2 py-0.5 whitespace-nowrap border-r last:border-r-0"
                      >
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {ocrResult.data.length > 5 && (
                  <tr>
                    <td
                      colSpan={ocrResult.columns.length}
                      className="px-2 py-1 text-center text-muted-foreground italic"
                    >
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
        {blocks.filter((b) => !b.parentId).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <p className="text-sm">No blocks yet.</p>
            {!isViewer && (
              <Button
                onClick={handleAddBlock}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="size-4" />
                Add First BigBlock
              </Button>
            )}
            {isViewer && (
              <p className="text-xs text-amber-500/80">
                You have view-only access to this desk.
              </p>
            )}
          </div>
        ) : (
          <>
            {blocks
              .filter((b) => !b.parentId)
              .sort((a, b) => a.blockOrder - b.blockOrder)
              .map((block, index, rootArr) => (
                <React.Fragment key={block.id}>
                  <DeskBlock
                    block={block}
                    blockIndex={index}
                    totalBlocks={rootArr.length}
                    allBlocks={blocks}
                    isGuest={false}
                    dashid={dashid}
                    userId={userId}
                    onExecute={handleExecuteBlock}
                    onServerExecute={handleServerExecuteBlock}
                    onCancelServerRun={handleCancelServerBlock}
                    serverRunId={
                      serverRunningBlocks[block.id] ||
                      (blocks.find(
                        (b) =>
                          b.parentId === block.id && serverRunningBlocks[b.id],
                      )
                        ? serverRunningBlocks[
                            blocks.find(
                              (b) =>
                                b.parentId === block.id &&
                                serverRunningBlocks[b.id],
                            )!.id
                          ]
                        : undefined)
                    }
                    serverRun={
                      (serverRunningBlocks[block.id] &&
                        executionRuns[serverRunningBlocks[block.id]]) ||
                      (blocks.find(
                        (b) =>
                          b.parentId === block.id && serverRunningBlocks[b.id],
                      )
                        ? executionRuns[
                            serverRunningBlocks[
                              blocks.find(
                                (b) =>
                                  b.parentId === block.id &&
                                  serverRunningBlocks[b.id],
                              )!.id
                            ]
                          ]
                        : undefined)
                    }
                    onAddTab={handleAddTab}
                    onRenameTab={handleRenameTab}
                    onDeleteTab={handleDeleteTab}
                    onDeleteBigBlock={handleDeleteBigBlock}
                    previousBlockOutput={
                      index > 0 ? rootArr[index - 1]?.outputPreview : undefined
                    }
                  />

                  {/* Arrow connector between BigBlocks */}
                  {index < rootArr.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="flex flex-col items-center text-zinc-500">
                        <ArrowDown className="size-5" />
                        <span className="text-[9px] text-muted-foreground">
                          data flows
                        </span>
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

        {/* ─── Master Sheet & Version History Workspace ────────────── */}
        {isCheckingSheet ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-card p-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-foreground" />
            <span>Checking Master Sheet status...</span>
          </div>
        ) : !hasMasterSheet ? (
          /* Empty / Not Generated State: User must click button to generate */
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-card/60 backdrop-blur-xs p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-4 transition-all">
            <div className="size-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-2xs">
              <FileSpreadsheet className="size-7" />
            </div>

            <div className="max-w-md space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Master Sheet
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal border-zinc-300 dark:border-zinc-700 text-zinc-500"
                >
                  Not Generated
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                This desk does not have a Master Sheet yet. Click below to generate the master sheet to aggregate data blocks, maintain real-time spreadsheets, and track version snapshots.
              </p>
            </div>

            {!isViewer && (
              <Button
                type="button"
                onClick={handleGenerateMasterSheet}
                disabled={isGeneratingSheet}
                className="h-9 px-5 text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold cursor-pointer gap-2 shadow-xs transition-all"
              >
                {isGeneratingSheet ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>Generate Master Sheet</span>
              </Button>
            )}
          </div>
        ) : (
          /* Master Sheet + Version History in clean Tabs */
          <div className="space-y-3">
            {/* Tabs Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMasterSheetTab("sheet")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    masterSheetTab === "sheet"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200 dark:border-zinc-700 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Table2 className="size-3.5" />
                  <span>Master Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMasterSheetTab("history")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    masterSheetTab === "history"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200 dark:border-zinc-700 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <History className="size-3.5" />
                  <span>Sheet Version History</span>
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-zinc-200 dark:border-zinc-800 text-zinc-500"
                >
                  Desk: {ownerData?.workflowName || dashid?.slice(0, 8)}
                </Badge>
              </div>
            </div>

            {/* Tab 1: Master Sheet Panel */}
            <div className={masterSheetTab === "sheet" ? "block" : "hidden"}>
              <MasterSheetPanel />
            </div>

            {/* Tab 2: Sheet Version History */}
            <div className={masterSheetTab === "history" ? "block" : "hidden"}>
              <MasterSheetHistoryPanel />
            </div>
          </div>
        )}
      </div>

      {/* ─── Pop-up ChatBox from Extreme Right Screen ─────────── */}
      <DeskChatBox
        dashid={dashid}
        deskName={ownerData?.workflowName || "Desk"}
        userEmail={userEmail}
        currentUser={chatCurrentUser}
      />
    </div>
  );
}
