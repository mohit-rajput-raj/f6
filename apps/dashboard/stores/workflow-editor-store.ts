import { create } from "zustand";
import type { EditorNodeType } from "@/lib/types";
import type { Edge, Viewport } from "@xyflow/react";
import { saveWorkflow, getWorkFlow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";
import { syncBlockFieldsFromWorkflow } from "@/app/[project]/dash/[dashid]/desk/desk-block-actions";

export interface HistorySnapshot {
  nodes: EditorNodeType[];
  edges: Edge[];
}

export interface CachedWorkflowState {
  workflowId: string;
  nodes: EditorNodeType[];
  edges: Edge[];
  viewport?: Viewport;
  history: HistorySnapshot[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  deskBlockId?: string | null;
  lastUpdated: number;
  initialized: boolean;
}

const MAX_HISTORY = 50;

interface WorkflowEditorStore {
  activeWorkflowId: string | null;
  workflows: Record<string, CachedWorkflowState>;

  setActiveWorkflowId: (id: string | null) => void;
  getWorkflow: (id: string) => CachedWorkflowState | undefined;
  
  initWorkflow: (
    workflowId: string,
    initialNodes?: EditorNodeType[],
    initialEdges?: Edge[],
    deskBlockId?: string
  ) => void;

  setNodes: (
    workflowId: string,
    updater: EditorNodeType[] | ((prev: EditorNodeType[]) => EditorNodeType[])
  ) => void;

  setEdges: (
    workflowId: string,
    updater: Edge[] | ((prev: Edge[]) => Edge[])
  ) => void;

  setViewport: (workflowId: string, viewport: Viewport) => void;

  pushHistory: (workflowId: string) => void;
  undo: (workflowId: string) => void;
  redo: (workflowId: string) => void;

  setHasUnsavedChanges: (workflowId: string, hasChanges: boolean) => void;
  setIsSaving: (workflowId: string, isSaving: boolean) => void;

  saveWorkflowToDb: (workflowId: string) => Promise<void>;
  fetchWorkflowClient: (workflowId: string) => Promise<boolean>;
  clearWorkflow: (workflowId: string) => void;
}

export const useWorkflowEditorStore = create<WorkflowEditorStore>((set, get) => ({
  activeWorkflowId: null,
  workflows: {},

  setActiveWorkflowId: (id: string | null) => set({ activeWorkflowId: id }),

  getWorkflow: (id: string) => get().workflows[id],

  initWorkflow: (
    workflowId: string,
    initialNodes: EditorNodeType[] = [],
    initialEdges: Edge[] = [],
    deskBlockId?: string
  ) => {
    if (!workflowId) return;

    set((state) => {
      const existing = state.workflows[workflowId];

      // If the workflow is already cached in memory and has nodes, NEVER wipe it out!
      // This ensures that navigating away (e.g. to analytics) and clicking the browser
      // back button immediately restores the active nodes, edges, and viewport.
      if (existing && (existing.nodes.length > 0 || existing.initialized)) {
        if (deskBlockId && existing.deskBlockId !== deskBlockId) {
          return {
            activeWorkflowId: workflowId,
            workflows: {
              ...state.workflows,
              [workflowId]: {
                ...existing,
                deskBlockId,
              },
            },
          };
        }
        return { activeWorkflowId: workflowId };
      }

      // If existing exists but was empty and new initialNodes arrived:
      const nodesToUse = initialNodes.length > 0 ? initialNodes : (existing?.nodes ?? []);
      const edgesToUse = initialEdges.length > 0 ? initialEdges : (existing?.edges ?? []);

      return {
        activeWorkflowId: workflowId,
        workflows: {
          ...state.workflows,
          [workflowId]: {
            workflowId,
            nodes: nodesToUse,
            edges: edgesToUse,
            viewport: existing?.viewport,
            history: [{ nodes: nodesToUse, edges: edgesToUse }],
            historyIndex: 0,
            canUndo: false,
            canRedo: false,
            hasUnsavedChanges: false,
            isSaving: false,
            deskBlockId: deskBlockId ?? existing?.deskBlockId ?? null,
            lastUpdated: Date.now(),
            initialized: nodesToUse.length > 0,
          },
        },
      };
    });
  },

  setNodes: (workflowId, updater) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      const nextNodes =
        typeof updater === "function" ? updater(current.nodes) : updater;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            nodes: nextNodes,
            hasUnsavedChanges: true,
            lastUpdated: Date.now(),
            initialized: true,
          },
        },
      };
    });
  },

  setEdges: (workflowId, updater) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      const nextEdges =
        typeof updater === "function" ? updater(current.edges) : updater;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            edges: nextEdges,
            hasUnsavedChanges: true,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  setViewport: (workflowId, viewport) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            viewport,
          },
        },
      };
    });
  },

  pushHistory: (workflowId) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      const snapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(current.nodes)),
        edges: JSON.parse(JSON.stringify(current.edges)),
      };

      const newHistory = current.history.slice(0, current.historyIndex + 1);
      newHistory.push(snapshot);

      let newIndex = current.historyIndex + 1;
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        newIndex = newHistory.length - 1;
      }

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            history: newHistory,
            historyIndex: newIndex,
            canUndo: newIndex > 0,
            canRedo: false,
            hasUnsavedChanges: true,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  undo: (workflowId) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current || current.historyIndex <= 0) return state;

      const nextIndex = current.historyIndex - 1;
      const snapshot = current.history[nextIndex];
      if (!snapshot) return state;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
            edges: JSON.parse(JSON.stringify(snapshot.edges)),
            historyIndex: nextIndex,
            canUndo: nextIndex > 0,
            canRedo: nextIndex < current.history.length - 1,
            hasUnsavedChanges: true,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  redo: (workflowId) => {
    if (!workflowId) return;

    set((state) => {
      const current = state.workflows[workflowId];
      if (!current || current.historyIndex >= current.history.length - 1) return state;

      const nextIndex = current.historyIndex + 1;
      const snapshot = current.history[nextIndex];
      if (!snapshot) return state;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
            edges: JSON.parse(JSON.stringify(snapshot.edges)),
            historyIndex: nextIndex,
            canUndo: nextIndex > 0,
            canRedo: nextIndex < current.history.length - 1,
            hasUnsavedChanges: true,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  setHasUnsavedChanges: (workflowId, hasChanges) => {
    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            hasUnsavedChanges: hasChanges,
          },
        },
      };
    });
  },

  setIsSaving: (workflowId, isSaving) => {
    set((state) => {
      const current = state.workflows[workflowId];
      if (!current) return state;

      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...current,
            isSaving,
          },
        },
      };
    });
  },

  saveWorkflowToDb: async (workflowId: string) => {
    if (!workflowId) return;
    const current = get().workflows[workflowId];
    if (!current) return;

    get().setIsSaving(workflowId, true);
    try {
      // Strip runtime-only preview/output buffers before persisting
      const cleanNodes = current.nodes.map((n) => ({
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

      await saveWorkflow(workflowId, cleanNodes, current.edges);

      if (current.deskBlockId) {
        await syncBlockFieldsFromWorkflow(workflowId).catch(() => {});
      }

      get().setHasUnsavedChanges(workflowId, false);
    } catch (err) {
      console.error("Failed to save workflow to DB:", err);
      throw err;
    } finally {
      get().setIsSaving(workflowId, false);
    }
  },

  fetchWorkflowClient: async (workflowId: string) => {
    if (!workflowId) return false;
    try {
      const wf = await getWorkFlow(workflowId);
      if (wf?.definition) {
        const def = wf.definition as any;
        const fetchedNodes = def?.reactFlow?.nodes ?? [];
        const fetchedEdges = def?.reactFlow?.edges ?? [];

        if (fetchedNodes.length > 0 || fetchedEdges.length > 0) {
          set((state) => {
            const current = state.workflows[workflowId];
            return {
              workflows: {
                ...state.workflows,
                [workflowId]: {
                  workflowId,
                  nodes: fetchedNodes,
                  edges: fetchedEdges,
                  viewport: current?.viewport,
                  history: [{ nodes: fetchedNodes, edges: fetchedEdges }],
                  historyIndex: 0,
                  canUndo: false,
                  canRedo: false,
                  hasUnsavedChanges: false,
                  isSaving: false,
                  deskBlockId: current?.deskBlockId ?? null,
                  lastUpdated: Date.now(),
                  initialized: true,
                },
              },
            };
          });
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Failed to fetch workflow client-side:", err);
      return false;
    }
  },

  clearWorkflow: (workflowId: string) => {
    set((state) => {
      const copy = { ...state.workflows };
      delete copy[workflowId];
      return { workflows: copy };
    });
  },
}));
