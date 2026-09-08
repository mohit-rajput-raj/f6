"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { Edge } from "@xyflow/react";
import { EditorNodeType } from "@/lib/types";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { getSharedDeskAccess } from "@/app/[project]/dash/[dashid]/desk/desk-share-actions";
import {
  useWorkflowEditorStore,
  HistorySnapshot,
} from "@/stores/workflow-editor-store";

// ─── Dataset type used across all nodes ──────────────────────
export interface Dataset {
  columns: string[];
  data: any[][];
}

export type { HistorySnapshot };

// ─── Context type ────────────────────────────────────────────
type EditorWorkFlowContextType = {
  nodes: EditorNodeType[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;
  runGraph: () => void;
  saveToDb: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  workflowId: string | null;
  deskBlockId: string | null;
  permission: "editor" | "viewer";
  isReadOnly: boolean;
};

const EditorWorkFlowContext = createContext<
  EditorWorkFlowContextType | undefined
>(undefined);

// ─── Provider ────────────────────────────────────────────────
type EditorProps = {
  children: React.ReactNode;
  initialNodes?: EditorNodeType[];
  initialEdges?: Edge[];
  workflowId?: string;
  deskBlockId?: string;
};

export const EditorWorkFlowContextProvider = ({
  children,
  initialNodes = [],
  initialEdges = [],
  workflowId,
  deskBlockId,
}: EditorProps) => {
  // ── Global Zustand Store Integration ──
  // Reads and caches nodes/edges per workflowId so navigating away
  // (e.g. to analytics) and pressing browser back NEVER clears the view!
  const storeWorkflow = useWorkflowEditorStore(
    useCallback(
      (state) => (workflowId ? state.workflows[workflowId] : undefined),
      [workflowId]
    )
  );

  const initWorkflow = useWorkflowEditorStore((s) => s.initWorkflow);
  const storeSetNodes = useWorkflowEditorStore((s) => s.setNodes);
  const storeSetEdges = useWorkflowEditorStore((s) => s.setEdges);
  const storePushHistory = useWorkflowEditorStore((s) => s.pushHistory);
  const storeUndo = useWorkflowEditorStore((s) => s.undo);
  const storeRedo = useWorkflowEditorStore((s) => s.redo);
  const saveWorkflowToDb = useWorkflowEditorStore((s) => s.saveWorkflowToDb);
  const fetchWorkflowClient = useWorkflowEditorStore((s) => s.fetchWorkflowClient);

  // Local fallback state in case workflowId is not provided (e.g. root layout wrapper)
  const [localNodes, setLocalNodes] = useState<EditorNodeType[]>(initialNodes);
  const [localEdges, setLocalEdges] = useState<Edge[]>(initialEdges);
  const [localCanUndo, setLocalCanUndo] = useState(false);
  const [localCanRedo, setLocalCanRedo] = useState(false);
  const [localIsSaving, setLocalIsSaving] = useState(false);
  const [localHasUnsavedChanges, setLocalHasUnsavedChanges] = useState(false);

  // ── Initialize or restore from store ──
  useEffect(() => {
    if (!workflowId) return;

    // initWorkflow preserves cached nodes/edges if this workflow was already visited
    initWorkflow(workflowId, initialNodes, initialEdges, deskBlockId);

    // If workflow has 0 nodes and initialNodes was empty, attempt client-side fetch from DB
    const current = useWorkflowEditorStore.getState().workflows[workflowId];
    if (!current || (!current.initialized && current.nodes.length === 0)) {
      fetchWorkflowClient(workflowId);
    }
  }, [workflowId, deskBlockId, initialNodes, initialEdges, initWorkflow, fetchWorkflowClient]);

  // ── Permission awareness ──
  const { data: sessionData } = useSession();
  const [permission, setPermission] = useState<"editor" | "viewer">("editor");
  const isReadOnly = permission === "viewer";

  useEffect(() => {
    if (!workflowId || !sessionData?.user?.email) return;
    getSharedDeskAccess(workflowId, sessionData.user.email)
      .then((access) => {
        setPermission((access.permission as "editor" | "viewer") || "editor");
      })
      .catch(() => {
        /* default to editor if check fails */
      });
  }, [workflowId, sessionData?.user?.email]);

  // ── Node & Edge Setters ──
  const setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>> =
    useCallback(
      (updater) => {
        if (workflowId) {
          storeSetNodes(workflowId, updater);
        } else {
          setLocalNodes(updater);
        }
      },
      [workflowId, storeSetNodes]
    );

  const setEdges: React.Dispatch<React.SetStateAction<Edge[]>> = useCallback(
    (updater) => {
      if (workflowId) {
        storeSetEdges(workflowId, updater);
      } else {
        setLocalEdges(updater);
      }
    },
    [workflowId, storeSetEdges]
  );

  // ── History actions ──
  const pushHistory = useCallback(() => {
    if (workflowId) {
      storePushHistory(workflowId);
    }
  }, [workflowId, storePushHistory]);

  const undo = useCallback(() => {
    if (workflowId) {
      storeUndo(workflowId);
    }
  }, [workflowId, storeUndo]);

  const redo = useCallback(() => {
    if (workflowId) {
      storeRedo(workflowId);
    }
  }, [workflowId, storeRedo]);

  // ── Manual & Auto Save ──
  const saveToDb = useCallback(async () => {
    if (!workflowId) return;
    try {
      await saveWorkflowToDb(workflowId);
      toast.success("Workflow saved");
    } catch (err) {
      console.error("Save workflow error:", err);
      toast.error("Failed to save workflow");
    }
  }, [workflowId, saveWorkflowToDb]);

  const hasUnsavedChanges = workflowId
    ? (storeWorkflow?.hasUnsavedChanges ?? false)
    : localHasUnsavedChanges;

  const isSaving = workflowId
    ? (storeWorkflow?.isSaving ?? false)
    : localIsSaving;

  // Debounced auto-save (4s after change)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hasUnsavedChanges || !workflowId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveWorkflowToDb(workflowId).catch(() => {});
    }, 4000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, workflowId, saveWorkflowToDb]);

  // Save on unmount: if user navigates away with unsaved changes, immediately persist
  useEffect(() => {
    return () => {
      if (workflowId) {
        const state = useWorkflowEditorStore.getState().workflows[workflowId];
        if (state?.hasUnsavedChanges) {
          saveWorkflowToDb(workflowId).catch(() => {});
        }
      }
    };
  }, [workflowId, saveWorkflowToDb]);

  // Placeholder graph execution trigger
  const runGraph = useCallback(() => {}, []);

  // Compute active nodes and edges
  const nodes = workflowId
    ? (storeWorkflow?.nodes ?? (initialNodes.length > 0 ? initialNodes : []))
    : localNodes;

  const edges = workflowId
    ? (storeWorkflow?.edges ?? (initialEdges.length > 0 ? initialEdges : []))
    : localEdges;

  const canUndo = workflowId
    ? (storeWorkflow?.canUndo ?? false)
    : localCanUndo;

  const canRedo = workflowId
    ? (storeWorkflow?.canRedo ?? false)
    : localCanRedo;

  return (
    <EditorWorkFlowContext.Provider
      value={{
        nodes,
        edges,
        setNodes,
        setEdges,
        undo,
        redo,
        canUndo,
        canRedo,
        pushHistory,
        runGraph,
        saveToDb,
        isSaving,
        hasUnsavedChanges,
        workflowId: workflowId ?? null,
        deskBlockId: deskBlockId ?? (storeWorkflow?.deskBlockId ?? null),
        permission,
        isReadOnly,
      }}
    >
      {children}
    </EditorWorkFlowContext.Provider>
  );
};

export const useEditorWorkFlow = () => {
  const ctx = useContext(EditorWorkFlowContext);
  if (!ctx) {
    throw new Error(
      "useEditorWorkFlow must be used inside EditorWorkFlowContextProvider"
    );
  }
  return ctx;
};
