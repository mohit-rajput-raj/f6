// ═══════════════════════════════════════════════════════════
// @repo/workflow-engine — Shared Types
// Used by both frontend (dashboard) and backend (server)
// ═══════════════════════════════════════════════════════════

// ── Core Data Types ─────────────────────────────────────────

export interface Dataset {
  columns: string[];
  data: any[][];
}

// ── Node & Edge Definitions ─────────────────────────────────

export interface NodeDefinition {
  id: string;
  type: string;
  data: Record<string, any>;
  position?: { x: number; y: number };
}

export interface EdgeDefinition {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

// ── Execution Status Types ──────────────────────────────────

export type NodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "error"
  | "skipped"
  | "waiting_human";

export type WorkflowRunStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

// ── Node State (per-node runtime state) ─────────────────────

export interface NodeState {
  status: NodeStatus;
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

// ── Workflow Run (persisted in DB) ──────────────────────────

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  userId: string;
  dashid: string;
  blockId?: string | null;
  status: WorkflowRunStatus;
  nodeStates: Record<string, NodeState>;
  inputs: Record<string, any>;
  output?: any;
  pausedAtNodeId?: string | null;
  pausedRequest?: any;
  startedAt: string;
  completedAt?: string | null;
  error?: string | null;
}

// ── Execution Context (what the engine passes to each executor) ──

export interface ExecutionContext {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, any>;
  /** Map of targetHandle → data from incoming edges */
  inputs: Map<string, any>;
  /** Global runtime data store for the entire run */
  runtimeData: Map<string, any>;
  /** All nodes in the workflow (for cross-reference, e.g. resolving source node types) */
  allNodes: NodeDefinition[];
  /** All edges in the workflow */
  allEdges: EdgeDefinition[];
  /** Incoming edges to this node */
  incomingEdges: EdgeDefinition[];
  /** User ID running the workflow */
  userId: string;
  /** Dashboard/project ID */
  dashid: string;
  /** Block ID (if running from a desk block) */
  blockId?: string;
  /** Emit a metadata update for this node (sent to frontend via WebSocket) */
  emitNodeMeta: (metadata: Record<string, any>) => void;
}

// ── Human Input Request ─────────────────────────────────────

export interface HumanInputRequest {
  nodeId: string;
  nodeType: string;
  prompt: string;
  inputType: "button_click" | "text_input" | "approval" | "selection";
  options?: string[];
  data?: any;
}

// ── WebSocket Event Types ───────────────────────────────────

export type WorkflowEvent =
  | { type: "workflow:started"; runId: string; workflowId: string }
  | { type: "workflow:completed"; runId: string; workflowId: string; output?: any }
  | { type: "workflow:error"; runId: string; workflowId: string; error: string }
  | { type: "workflow:paused"; runId: string; workflowId: string; request: HumanInputRequest }
  | { type: "workflow:cancelled"; runId: string; workflowId: string }
  | { type: "node:status"; runId: string; workflowId: string; nodeId: string; status: NodeStatus; error?: string; result?: any; metadata?: Record<string, any> }
  | { type: "block:output"; runId: string; blockId: string; output: any };

// ── API Request/Response Types ──────────────────────────────

export interface RunWorkflowRequest {
  workflowId: string;
  userId: string;
  dashid: string;
  blockId?: string;
  /** Inputs from desk blocks: textInputs, sheets, checkboxFields */
  deskInputs?: {
    textInputs?: Array<{ id: string; value: string; label?: string }>;
    sheets?: Array<{ id: string; data: Dataset; label?: string }>;
    checkboxFields?: Array<{ id: string; checked: boolean; label?: string }>;
    actionButtons?: Array<{ id: string; triggered: boolean; label?: string }>;
  };
  /** Data to inject into specific nodes by ID */
  nodeOverrides?: Record<string, any>;
}

export interface RunWorkflowResponse {
  success: boolean;
  runId: string;
  status: WorkflowRunStatus;
}

export interface ResumeWorkflowRequest {
  nodeId: string;
  data?: any;
}

export interface WorkflowRunStatusResponse {
  success: boolean;
  run: {
    id: string;
    workflowId: string;
    status: WorkflowRunStatus;
    nodeStates: Record<string, NodeState>;
    output?: any;
    error?: string | null;
    startedAt: string;
    completedAt?: string | null;
  };
}

// ── Node Executor Interface ─────────────────────────────────

export interface INodeExecutor {
  /** The node type this executor handles (e.g., "FilterNode") */
  type: string;
  /** Execute the node and return output value */
  execute(ctx: ExecutionContext): Promise<any>;
}

// ── Desk Block Input Resolution ─────────────────────────────
// When running on server, we can't access Zustand stores.
// Instead, we read from DB via this interface.

export interface DeskInputResolver {
  getTextInput(blockId: string, inputId: string): Promise<string>;
  getSheetData(blockId: string, sheetId: string): Promise<Dataset>;
  getCheckboxValue(blockId: string, checkboxId: string): Promise<boolean>;
  getActionButtonTriggered(blockId: string, actionId: string): Promise<boolean>;
  getBlockOutput(blockId: string): Promise<Dataset | null>;
  getIncomingDataForTab(blockId: string): Promise<Array<{ id: string; data: Dataset }>>;
  setBlockOutput(blockId: string, output: any): Promise<void>;
  setMasterSheetPreview(data: Dataset): Promise<void>;
  setMergedPreview(data: any): Promise<void>;
  pushMasterSheetData(sheetName: string, data: Dataset, metadata: Record<string, any>): Promise<void>;
}
