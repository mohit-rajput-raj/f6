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
import { EditorCanvasCardType, EditorNodeType } from "@/lib/types";
import { saveWorkflow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";
import { syncBlockFieldsFromWorkflow } from "@/app/[project]/dash/[dashid]/desk/desk-block-actions";
import { toast } from "sonner";

// ─── Dataset type used across all nodes ──────────────────────
export interface Dataset {
  columns: string[];
  data: any[][];
}

// ─── History snapshot ────────────────────────────────────────
interface HistorySnapshot {
  nodes: EditorNodeType[];
  edges: Edge[];
}

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

const MAX_HISTORY = 50;

export const EditorWorkFlowContextProvider = ({
  children,
  initialNodes = [],
  initialEdges = [],
  workflowId,
  deskBlockId,
}: EditorProps) => {
  const [nodes, setNodes] = useState<EditorNodeType[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Initialize from props when they change (first load from DB)
  useEffect(() => {
    if (!initializedRef.current && (initialNodes.length > 0 || initialEdges.length > 0)) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      initializedRef.current = true;
    }
  }, [initialNodes, initialEdges]);

  // ── History (useRef so we never cause extra renders) ──
  const historyRef = useRef<HistorySnapshot[]>([{ nodes: [], edges: [] }]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(
      historyIndexRef.current < historyRef.current.length - 1
    );
  }, []);

  const pushHistory = useCallback(() => {
    // Get current nodes/edges via setState callback to avoid stale closures
    setNodes((currentNodes) => {
      setEdges((currentEdges) => {
        const snapshot: HistorySnapshot = {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        };

        // Trim any future history if we're not at the end
        const newHistory = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        );
        newHistory.push(snapshot);

        // Cap history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        } else {
          historyIndexRef.current += 1;
        }

        historyRef.current = newHistory;
        syncFlags();
        return currentEdges; // no change
      });
      return currentNodes; // no change
    });
    setHasUnsavedChanges(true);
  }, [syncFlags]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) {
      setNodes(JSON.parse(JSON.stringify(snapshot.nodes)));
      setEdges(JSON.parse(JSON.stringify(snapshot.edges)));
    }
    syncFlags();
    setHasUnsavedChanges(true);
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) {
      setNodes(JSON.parse(JSON.stringify(snapshot.nodes)));
      setEdges(JSON.parse(JSON.stringify(snapshot.edges)));
    }
    syncFlags();
    setHasUnsavedChanges(true);
  }, [syncFlags]);

  // ── Save to DB ──
  const saveToDb = useCallback(async () => {
    if (!workflowId) return;
    setIsSaving(true);
    try {
      // Read current state
      const currentNodes = nodes;
      const currentEdges = edges;

      // Strip runtime-only data before saving (result, rowCount, etc.)
      const cleanNodes = currentNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          result: undefined,
          rowCount: undefined,
          error: undefined,
          inputColumns: undefined,
          leftColumns: undefined,
          rightColumns: undefined,
        },
      }));

      await saveWorkflow(workflowId, cleanNodes, currentEdges);

      // If this is a desk block editor, sync its fields
      if (deskBlockId) {
        await syncBlockFieldsFromWorkflow(workflowId);
      }

      setHasUnsavedChanges(false);
      toast.success("Workflow saved");
    } catch (err) {
      console.error("Failed to save workflow:", err);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, nodes, edges]);

  // ── Auto-save (debounced 5 seconds after last change) ──
  useEffect(() => {
    if (!hasUnsavedChanges || !workflowId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveToDb();
    }, 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, workflowId, saveToDb]);

  // ── Graph execution (placeholder, delegated to nodeExecutions) ──
  const runGraph = useCallback(() => {
    // This is imported and called from resizable.tsx — kept as a trigger
    // The actual execution is done via executeWorkflow in nodeExecutions.ts
  }, []);

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
        deskBlockId: deskBlockId ?? null,
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
