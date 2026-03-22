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
};

const EditorWorkFlowContext = createContext<
  EditorWorkFlowContextType | undefined
>(undefined);

// ─── Provider ────────────────────────────────────────────────
type EditorProps = { children: React.ReactNode };

const MAX_HISTORY = 50;

export const EditorWorkFlowContextProvider = ({ children }: EditorProps) => {
  const [nodes, setNodes] = useState<EditorNodeType[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

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
  }, [syncFlags]);

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
