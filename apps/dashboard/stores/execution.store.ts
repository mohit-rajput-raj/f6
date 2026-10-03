import { create } from "zustand";

// ═══════════════════════════════════════════════════════════
// Execution Store — Tracks server-side workflow runs
// Stores active runs, node states, and execution history.
// ═══════════════════════════════════════════════════════════

export type NodeRunState =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "error"
  | "skipped"
  | "paused";

export interface NodeExecutionState {
  nodeId: string;
  nodeType: string;
  status: NodeRunState;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ActiveRun {
  runId: string;
  workflowId: string;
  status: "idle" | "running" | "paused" | "completed" | "error" | "cancelled";
  nodeStates: Record<string, NodeExecutionState>;
  startedAt: string;
  completedAt?: string;
  error?: string;
  pausedRequest?: any;
  /** Total nodes in the workflow */
  totalNodes: number;
  /** Number of completed nodes */
  completedNodes: number;
}

export interface WorkflowExecutionError {
  message: string;
  code?: string;
  details?: any;
  nodeId?: string;
  nodeType?: string;
  timestamp: string;
}

interface ExecutionStoreState {
  /** Active runs keyed by runId */
  runs: Record<string, ActiveRun>;

  /** Currently displayed runId (for TabsBottom panel) */
  activeRunId: string | null;

  /** All errors from current active run */
  runErrors: Array<{
    nodeId: string;
    nodeType: string;
    error: string;
    timestamp: string;
  }>;

  /** Last workflow-level execution error (from server or local run) */
  lastWorkflowError: WorkflowExecutionError | null;

  // ── Actions ────────────────────────────────────────────────

  /** Start tracking a new run */
  addRun: (run: {
    runId: string;
    workflowId: string;
    totalNodes: number;
  }) => void;

  /** Update a node's execution state within a run */
  updateNodeState: (
    runId: string,
    nodeId: string,
    state: Partial<NodeExecutionState>,
  ) => void;

  /** Update the overall run status */
  updateRunStatus: (
    runId: string,
    status: ActiveRun["status"],
    extra?: { error?: string; completedAt?: string; pausedRequest?: any },
  ) => void;

  /** Set the active run for display */
  setActiveRunId: (runId: string | null) => void;

  /** Add an error from a node */
  addRunError: (error: {
    nodeId: string;
    nodeType: string;
    error: string;
    timestamp: string;
  }) => void;

  /** Clear all errors */
  clearRunErrors: () => void;

  /** Set workflow-level error */
  setWorkflowError: (
    error:
      | {
          message: string;
          code?: string;
          details?: any;
          nodeId?: string;
          nodeType?: string;
          timestamp?: string;
        }
      | string
      | null,
  ) => void;

  /** Clear workflow-level error */
  clearWorkflowError: () => void;

  /** Remove a completed/cancelled run from tracking */
  removeRun: (runId: string) => void;

  /** Reset all state */
  reset: () => void;
}

export const useExecutionStore = create<ExecutionStoreState>((set) => ({
  runs: {},
  activeRunId: null,
  runErrors: [],
  lastWorkflowError: null,

  addRun: ({ runId, workflowId, totalNodes }) =>
    set((state) => ({
      runs: {
        ...state.runs,
        [runId]: {
          runId,
          workflowId,
          status: "running",
          nodeStates: {},
          startedAt: new Date().toISOString(),
          totalNodes,
          completedNodes: 0,
        },
      },
      activeRunId: runId,
      lastWorkflowError: null,
    })),

  updateNodeState: (runId, nodeId, update) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;

      const existing = run.nodeStates[nodeId] || {
        nodeId,
        nodeType: update.nodeType || "unknown",
        status: "idle" as NodeRunState,
      };

      const updated = { ...existing, ...update };

      const newNodeStates = { ...run.nodeStates, [nodeId]: updated };

      // Count completed nodes
      const completedNodes = Object.values(newNodeStates).filter(
        (ns) =>
          ns.status === "completed" ||
          ns.status === "error" ||
          ns.status === "skipped",
      ).length;

      return {
        runs: {
          ...state.runs,
          [runId]: {
            ...run,
            nodeStates: newNodeStates,
            completedNodes,
          },
        },
      };
    }),

  updateRunStatus: (runId, status, extra) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;

      const workflowError =
        status === "error" && extra?.error
          ? {
              message: extra.error,
              code: "SERVER_EXECUTION_ERROR",
              timestamp: extra.completedAt || new Date().toISOString(),
            }
          : state.lastWorkflowError;

      return {
        runs: {
          ...state.runs,
          [runId]: {
            ...run,
            status,
            ...(extra?.error !== undefined ? { error: extra.error } : {}),
            ...(extra?.completedAt
              ? { completedAt: extra.completedAt }
              : {}),
            ...(extra?.pausedRequest
              ? { pausedRequest: extra.pausedRequest }
              : {}),
          },
        },
        lastWorkflowError: workflowError,
      };
    }),

  setActiveRunId: (runId) => set({ activeRunId: runId }),

  addRunError: (error) =>
    set((state) => ({
      runErrors: [...state.runErrors, error],
    })),

  clearRunErrors: () => set({ runErrors: [] }),

  setWorkflowError: (error) =>
    set(() => ({
      lastWorkflowError: !error
        ? null
        : typeof error === "string"
          ? {
              message: error,
              code: "INTERNAL_ERROR",
              timestamp: new Date().toISOString(),
            }
          : {
              message: error.message,
              code: error.code || "INTERNAL_ERROR",
              details: error.details,
              nodeId: error.nodeId,
              nodeType: error.nodeType,
              timestamp: error.timestamp || new Date().toISOString(),
            },
    })),

  clearWorkflowError: () => set({ lastWorkflowError: null }),

  removeRun: (runId) =>
    set((state) => {
      const { [runId]: _, ...rest } = state.runs;
      return {
        runs: rest,
        activeRunId: state.activeRunId === runId ? null : state.activeRunId,
      };
    }),

  reset: () => set({ runs: {}, activeRunId: null, runErrors: [], lastWorkflowError: null }),
}));
