"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Plus, Camera, X, Settings2, Loader2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/components";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useDeskStore, type DeskBlockState } from "@/stores/desk-store";
import { useQuery } from "@tanstack/react-query";
import { scanTableImage } from "./ocr-actions";
import { getSharedDeskAccess, getWorkflowOwner } from "./desk-share-actions";
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
import { useExecutionSocket, type WorkflowEvent } from "@/lib/use-execution-socket";
import { useExecutionStore } from "@/stores/execution.store";

// ─── Main Component ─────────────────────────────────────────
export default function DeskPage() {
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const userEmail = sessionData?.user?.email ?? "";
  const params = useParams();
  const dashid = params?.dashid as string;

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

  // OCR file input ref
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // Master sheet store
  const { sheets: masterSheets, activeSheetName } = useMasterSheetStore();
  const activeMasterSheet = activeSheetName
    ? masterSheets[activeSheetName]
    : null;

  const router = useRouter();
  const pathname = usePathname();

  // ─── Load workflow / desk owner details ────────────────────
  const { data: ownerData, refetch: refetchOwner, isLoading: isOwnerLoading } = useQuery({
    queryKey: ["desk-owner", dashid],
    queryFn: async () => {
      if (!dashid) return null;
      return await getWorkflowOwner(dashid);
    },
    enabled: !!dashid,
  });

  // ─── Load blocks from DB on mount (cached with TanStack Query) ─────
  const { data: _deskData, isLoading: isDeskQueryLoading } = useQuery({
    queryKey: ["desk-load", dashid, userId],
    queryFn: async () => {
      setProjectWorkflowId(dashid);

      // Parallel fetch: access check + blocks initialization + active server runs
      const [access, dbBlocks, activeRuns] = await Promise.all([
        userEmail ? getSharedDeskAccess(dashid, userEmail) : null,
        initializeDefaultDesk(dashid, userId!),
        getActiveDeskRuns(dashid).catch(() => []),
      ]);

      if (access) setDeskAccess(access);

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
            for (const [nodeId, nState] of Object.entries(r.nodeStates as Record<string, any>)) {
              useExecutionStore.getState().updateNodeState(r.id, nodeId, nState);
            }
          }
        }
      });

      const mappedBlocks = dbBlocks.map((b) => {
        const isRunActive = Boolean(
          runningMap[b.id] || (b.parentId && runningMap[b.parentId])
        );
        const pFiles = b.pushedFiles?.map((pf) =>
          !isRunActive && pf.status === "processing"
            ? { ...pf, status: "success" as const }
            : pf
        );
        return {
          ...b,
          pushedFiles: pFiles,
          actionButtons: [] as any[],
          isExecuting: isRunActive,
        };
      });

      setBlocks(mappedBlocks);
      setServerRunningBlocks(runningMap);

      // Restore merged preview if any block has outputPreview with updates
      const blockWithMerged = mappedBlocks.find(
        (b: any) => b.outputPreview && (b.outputPreview as any).updates?.length > 0
      );
      if (blockWithMerged) {
        useDeskStore.getState().setMergedPreview(blockWithMerged.outputPreview as any);
      }

      return { access, blocks: mappedBlocks, activeRuns };
    },
    enabled: !!dashid && !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // Sync TanStack Query loading state with our store's isLoading
  useEffect(() => {
    setIsLoading(isDeskQueryLoading);
  }, [isDeskQueryLoading, setIsLoading]);


  // ─── Auto-save block state to DB (debounced, targeted) ────
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const isInitialLoadRef = useRef(true);
  const prevBlockSnapshotRef = useRef<Record<string, string>>({});

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
    // Skip saving on initial load (blocks just came from DB, no changes)
    if (isInitialLoadRef.current) {
      // Snapshot current blocks state so we can diff later
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

      toast.success("BigBlock added with first tab");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add block");
    } finally {
      setIsAddingBlock(false);
    }
  }, [dashid, userId, addBlock, blocks]);

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
              reason: "This block has an empty editor workflow canvas. Open the editor and add nodes to build your workflow.",
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
          (n: any) => n.data?.error || (Array.isArray(n.data?.errors) && n.data.errors.length > 0)
        );
        if (failedNode) {
          const errObj = {
            message: failedNode.data?.error || `${failedNode.type || 'Node'} execution error`,
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
  const [serverRunningBlocks, setServerRunningBlocks] = useState<Record<string, string>>({}); // blockId -> runId

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
          if (finalOutput.updates || finalOutput.alignment || finalOutput.targetPath || finalOutput.stackName) {
            useDeskStore.getState().setMergedPreview(finalOutput);
          }
        }
        const blk = allBlocks.find((b) => b.id === bId);
        if (blk?.parentId) {
          setBlockExecuting(blk.parentId, false);
          if (finalOutput) {
            setBlockOutput(blk.parentId, finalOutput);
            useDeskStore.getState().setTabOutput(blk.parentId, blk.name, finalOutput);
            await updateDeskBlockOutput(blk.parentId, finalOutput);
          }
        }

        const procFiles = blk?.pushedFiles?.filter((f) => f.status === "processing") || [];
        for (const pf of procFiles) {
          useDeskStore.getState().updatePushedFileStatus(bId, pf.id, "success");
          updatePushedFileStatus(bId, pf.id, "success").catch(console.error);
        }
        if (blk?.parentId) {
          const parentBlk = allBlocks.find((b) => b.id === blk.parentId);
          const pProcFiles = parentBlk?.pushedFiles?.filter((f) => f.status === "processing") || [];
          for (const pf of pProcFiles) {
            useDeskStore.getState().updatePushedFileStatus(blk.parentId, pf.id, "success");
            updatePushedFileStatus(blk.parentId, pf.id, "success").catch(console.error);
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
        const procFiles = blk?.pushedFiles?.filter((f) => f.status === "processing") || [];
        for (const pf of procFiles) {
          useDeskStore.getState().updatePushedFileStatus(bId, pf.id, "failed", error);
          updatePushedFileStatus(bId, pf.id, "failed", error).catch(console.error);
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
          if (nodeId) updateNodeState(runId, nodeId, { nodeType: nodeType || "unknown", status: "running", startedAt: timestamp });
          break;
        case "node_completed":
          if (nodeId) updateNodeState(runId, nodeId, { status: "completed", output: data, completedAt: timestamp });
          break;
        case "node_error":
          if (nodeId) {
            updateNodeState(runId, nodeId, { status: "error", error, completedAt: timestamp });
            addRunError({ nodeId, nodeType: nodeType || "unknown", error: error || "Unknown error", timestamp });
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
              if (rId === runId) { delete next[bId]; setBlockExecuting(bId, false); }
            }
            return next;
          });
          toast.info("Server execution cancelled");
          break;
      }
    },
    [updateNodeState, updateRunStatus, addRunError, setBlockExecuting, completeRun, failRun],
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
    if (!_deskData?.activeRuns?.length) return;

    hasResumedPollingRef.current = true;
    const activeRuns = _deskData.activeRuns.filter(
      (r: any) => r.status === "running" || r.status === "paused"
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
            } else if (runData.status === "error" || runData.status === "cancelled") {
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
  }, [_deskData?.activeRuns, completeRun, failRun]);

  const handleServerExecuteBlock = useCallback(
    async (
      blockId: string,
      options?: {
        pushedFileRecord?: PushedFileRecord;
        customSheets?: any[];
      }
    ) => {
      const block = useDeskStore.getState().blocks.find((b) => b.id === blockId);
      if (!block || !userId) return;

      setBlockExecuting(blockId, true);
      if (block.parentId) setBlockExecuting(block.parentId, true);
      setBlockOutput(blockId, null);
      if (block.parentId) setBlockOutput(block.parentId, null);
      setBlockError(blockId, null);
      if (block.parentId) setBlockError(block.parentId, null);

      // If a file was pushed to running instance, save immediately to history
      if (options?.pushedFileRecord) {
        useDeskStore.getState().addPushedFile(blockId, options.pushedFileRecord);
        if (block.parentId) {
          useDeskStore.getState().addPushedFile(block.parentId, options.pushedFileRecord);
        }
        pushFileToBlockHistory(blockId, options.pushedFileRecord).catch(console.error);
        if (block.parentId) {
          pushFileToBlockHistory(block.parentId, options.pushedFileRecord).catch(console.error);
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
        textInputs: block.textInputs?.map((t) => ({ id: t.id, value: t.value })) || [],
        sheets: activeSheets.map((s) => ({ id: s.id, data: s.data })) || [],
        checkboxFields: block.checkboxFields?.map((c) => ({ id: c.id, checked: c.checked })) || [],
        actionButtons: block.actionButtons?.map((a) => ({ id: a.id, triggered: a.triggered })) || [],
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
        const nodeCount = (workflow?.definition as any)?.reactFlow?.nodes?.length ?? 0;
        addRun({ runId, workflowId: block.editorWorkflowId, totalNodes: nodeCount });
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
              } else if (runData.status === "error" || runData.status === "cancelled") {
                clearInterval(pollInterval);
                await failRun(runId, runData.error || "Server execution failed");
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
          useDeskStore.getState().updatePushedFileStatus(blockId, options.pushedFileRecord.id, "failed", errMsg);
          updatePushedFileStatus(blockId, options.pushedFileRecord.id, "failed", errMsg).catch(console.error);
          if (block.parentId) {
            useDeskStore.getState().updatePushedFileStatus(block.parentId, options.pushedFileRecord.id, "failed", errMsg);
            updatePushedFileStatus(block.parentId, options.pushedFileRecord.id, "failed", errMsg).catch(console.error);
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
    [userId, dashid, setBlockExecuting, setBlockOutput, setBlockError, addRun, completeRun, failRun],
  );

  const handleCancelServerBlock = useCallback(
    async (blockId: string) => {
      let runId = serverRunningBlocks[blockId];
      if (!runId) {
        // If blockId is parent, search child blocks
        const childRuns = useDeskStore.getState().blocks
          .filter((b) => b.parentId === blockId)
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
        toast.success(`Tab "${newChild.name}" created`);
        return newChild.id;
      } catch (err: any) {
        console.error("Failed to add tab:", err);
        toast.error(err?.message || "Failed to add tab");
      }
    },
    [dashid, userId, blocks, addBlock],
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
  const handleDeleteTab = useCallback(async (blockId: string) => {
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
          toast.success("BigBlock deleted (no tabs left)");
          return;
        }
      }
      toast.success("Tab deleted");
    } catch (err: any) {
      console.error("Failed to delete tab:", err);
      toast.error(err?.message || "Failed to delete");
      throw err;
    }
  }, [sessionData?.user?.email, isGuest]);

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
        toast.success("BigBlock deleted");
      } catch (err: any) {
        console.error("Failed to delete BigBlock:", err);
        toast.error(err?.message || "Failed to delete BigBlock");
        throw err;
      }
    },
    [sessionData?.user?.email, isGuest]
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

  // ─── Render ───────────────────────────────────────────────
  if (isLoading) {
    return <DeskPageSkeleton />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* ─── Owner Profile Header (Exact match to 2nd image) ─── */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <DeskOwnerHeader
          dashid={dashid}
          ownerData={ownerData ?? null}
          currentUserId={userId}
          currentUserEmail={userEmail}
          isOwner={!isGuest}
          isLoading={isOwnerLoading}
          onRefresh={() => {
            refetchOwner();
          }}
        />
      </div>

      {/* ─── OCR Result Banner ───────────────────────────── */}
      {ocrResult && (
        <div className="mx-4 mt-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-3 animate-in slide-in-from-top">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
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
                    isGuest={isGuest}
                    dashid={dashid}
                    userId={userId}
                    onExecute={handleExecuteBlock}
                    onServerExecute={handleServerExecuteBlock}
                    onCancelServerRun={handleCancelServerBlock}
                    serverRunId={
                      serverRunningBlocks[block.id] ||
                      (blocks.find((b) => b.parentId === block.id && serverRunningBlocks[b.id])
                        ? serverRunningBlocks[blocks.find((b) => b.parentId === block.id && serverRunningBlocks[b.id])!.id]
                        : undefined)
                    }
                    serverRun={
                      (serverRunningBlocks[block.id] && executionRuns[serverRunningBlocks[block.id]]) ||
                      (blocks.find((b) => b.parentId === block.id && serverRunningBlocks[b.id])
                        ? executionRuns[serverRunningBlocks[blocks.find((b) => b.parentId === block.id && serverRunningBlocks[b.id])!.id]]
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

        {/* ─── Master Sheet Panel ────────────────────────── */}
        <MasterSheetPanel />

        {/* ─── Sheet Version History ──────────────────────── */}
        <MasterSheetHistoryPanel />
      </div>

      {/* ─── Pop-up ChatBox from Extreme Right Screen ─────────── */}
      <DeskChatBox
        dashid={dashid}
        deskName={ownerData?.workflowName || "Desk"}
        userEmail={userEmail}
        currentUser={
          sessionData?.user
            ? {
                id: sessionData.user.id,
                name: sessionData.user.name || sessionData.user.email?.split("@")[0] || "User",
                email: sessionData.user.email || "",
                image: sessionData.user.image,
              }
            : null
        }
      />
    </div>
  );
}
