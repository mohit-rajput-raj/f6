// ═══════════════════════════════════════════════════════════
// WorkflowInstance — The Core Execution Engine
// Runs a single workflow execution using topological sort.
// Replaces the frontend executeWorkflow() function.
// ═══════════════════════════════════════════════════════════

import type {
  NodeDefinition, EdgeDefinition, Dataset,
  NodeState, NodeStatus, WorkflowRunStatus,
  ExecutionContext, WorkflowEvent, HumanInputRequest,
  DeskInputResolver,
} from "@repo/workflow-engine/types";
import { NodeRegistry } from "./node-registry.js";
import { HumanInputRequired } from "./executors/desk.js";

export interface WorkflowInstanceConfig {
  runId: string;
  workflowId: string;
  userId: string;
  dashid: string;
  blockId?: string;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  registry: NodeRegistry;
  deskResolver: DeskInputResolver;
  /** Called for each WebSocket event (status updates) */
  onEvent: (event: WorkflowEvent) => void;
  /** Called when node states change (for DB persistence) */
  onStateChange?: (nodeStates: Record<string, NodeState>) => void;
}

export class WorkflowInstance {
  private config: WorkflowInstanceConfig;
  private runtimeData = new Map<string, any>();
  private nodeStates = new Map<string, NodeState>();
  private status: WorkflowRunStatus = "idle";
  private pausedAtNodeId: string | null = null;
  private pausedRequest: HumanInputRequest | null = null;
  private output: any = null;
  private error: string | null = null;
  private abortController = new AbortController();

  constructor(config: WorkflowInstanceConfig) {
    this.config = config;
    // Initialize all node states
    for (const node of config.nodes) {
      this.nodeStates.set(node.id, { status: "idle" });
    }
  }

  // ── Public Getters ──────────────────────────────────────────

  get runId() { return this.config.runId; }
  get workflowId() { return this.config.workflowId; }
  get currentStatus() { return this.status; }
  get currentOutput() { return this.output; }
  get currentError() { return this.error; }
  get currentPausedRequest() { return this.pausedRequest; }

  getNodeStates(): Record<string, NodeState> {
    const result: Record<string, NodeState> = {};
    this.nodeStates.forEach((state, id) => { result[id] = state; });
    return result;
  }

  // ── Execute ─────────────────────────────────────────────────

  async execute(): Promise<void> {
    this.status = "running";
    this.emit({ type: "workflow:started", runId: this.runId, workflowId: this.workflowId });

    try {
      await this.runTopologicalExecution();

      if ((this.status as WorkflowRunStatus) === "paused") return; // Paused for human input

      this.status = "completed";
      this.emit({
        type: "workflow:completed",
        runId: this.runId,
        workflowId: this.workflowId,
        output: this.output,
      });
    } catch (err: any) {
      this.status = "error";
      this.error = err.message || "Unknown execution error";
      this.emit({
        type: "workflow:error",
        runId: this.runId,
        workflowId: this.workflowId,
        error: this.error!,
      });
    } finally {
      this.persistStates();
    }
  }

  // ── Resume (after human input) ──────────────────────────────

  async resume(nodeId: string, data?: any): Promise<void> {
    if (this.status !== "paused" || this.pausedAtNodeId !== nodeId) {
      throw new Error(`Cannot resume: workflow is ${this.status}, paused at ${this.pausedAtNodeId}`);
    }

    // Inject the human input data
    this.runtimeData.set(nodeId, data ?? true);
    this.runtimeData.set(`${nodeId}__out`, data ?? true);

    // Mark node as completed
    this.setNodeStatus(nodeId, "completed", data);

    this.pausedAtNodeId = null;
    this.pausedRequest = null;
    this.status = "running";

    try {
      // Continue execution from where we paused
      await this.runTopologicalExecution();

      if ((this.status as WorkflowRunStatus) === "paused") return;

      this.status = "completed";
      this.emit({
        type: "workflow:completed",
        runId: this.runId,
        workflowId: this.workflowId,
        output: this.output,
      });
    } catch (err: any) {
      this.status = "error";
      this.error = err.message || "Unknown error during resume";
      this.emit({
        type: "workflow:error",
        runId: this.runId,
        workflowId: this.workflowId,
        error: this.error!,
      });
    } finally {
      this.persistStates();
    }
  }

  // ── Cancel ──────────────────────────────────────────────────

  cancel(): void {
    this.abortController.abort();
    this.status = "cancelled";
    this.emit({ type: "workflow:cancelled", runId: this.runId, workflowId: this.workflowId });
    this.persistStates();
  }

  // ── Core Topological Execution ──────────────────────────────

  private async runTopologicalExecution(): Promise<void> {
    const { nodes, edges, registry } = this.config;

    // Build adjacency graph
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      graph.set(node.id, []);
      if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Start with source nodes (already completed nodes are skipped)
    const queue: string[] = [];
    for (const node of nodes) {
      const state = this.nodeStates.get(node.id);
      if (state?.status === "completed") continue; // Already done (from resume)
      if (inDegree.get(node.id) === 0) queue.push(node.id);
    }

    // For resumed workflows, also check children of completed nodes
    if (this.pausedAtNodeId === null) {
      for (const node of nodes) {
        const state = this.nodeStates.get(node.id);
        if (state?.status === "completed") {
          // Decrease in-degree of children
          graph.get(node.id)?.forEach((childId) => {
            const childState = this.nodeStates.get(childId);
            if (childState?.status !== "completed") {
              inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
              if (inDegree.get(childId) === 0 && !queue.includes(childId)) {
                queue.push(childId);
              }
            }
          });
        }
      }
    }

    while (queue.length > 0) {
      if (this.abortController.signal.aborted) {
        throw new Error("Workflow cancelled");
      }

      const currentId = queue.shift()!;
      const currentNode = nodes.find((n) => n.id === currentId);
      if (!currentNode) continue;

      // Skip already completed nodes
      const existingState = this.nodeStates.get(currentId);
      if (existingState?.status === "completed") {
        graph.get(currentId)?.forEach((childId) => {
          inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
          if (inDegree.get(childId) === 0) queue.push(childId);
        });
        continue;
      }

      // ── Resolve inputs from incoming edges ──
      const incomingEdges = edges.filter((e) => e.target === currentId);
      const inputsMap = new Map<string, any>();

      for (const edge of incomingEdges) {
        const key = edge.targetHandle || "default";
        const value = this.runtimeData.get(`${edge.source}__${edge.sourceHandle}`)
          ?? this.runtimeData.get(edge.source)
          ?? null;
        inputsMap.set(key, value);
      }

      // Also set "default" if only one input
      if (incomingEdges.length === 1 && !inputsMap.has("default")) {
        const e = incomingEdges[0]!;
        const val = this.runtimeData.get(`${e.source}__${e.sourceHandle}`)
          ?? this.runtimeData.get(e.source);
        inputsMap.set("default", val);
      }

      // ── Mark node as running ──
      this.setNodeStatus(currentId, "running");
      this.emit({
        type: "node:status", runId: this.runId, workflowId: this.workflowId,
        nodeId: currentId, status: "running",
      });

      let outputValue: any;

      try {
        // ── Build execution context ──
        const ctx: ExecutionContext = {
          nodeId: currentId,
          nodeType: currentNode.type,
          nodeData: currentNode.data || {},
          inputs: inputsMap,
          runtimeData: this.runtimeData,
          allNodes: nodes,
          allEdges: edges,
          incomingEdges,
          userId: this.config.userId,
          dashid: this.config.dashid,
          blockId: this.config.blockId,
          emitNodeMeta: (metadata) => {
            this.emit({
              type: "node:status", runId: this.runId, workflowId: this.workflowId,
              nodeId: currentId, status: "running", metadata,
            });
          },
        };

        // ── Execute via registry ──
        const executor = registry.get(currentNode.type);
        if (executor) {
          outputValue = await executor.execute(ctx);
        } else {
          // Unknown node type — passthrough
          console.warn(`[engine] No executor for node type "${currentNode.type}", passing through`);
          outputValue = inputsMap.get("default") ?? inputsMap.values().next().value ?? null;
        }
      } catch (err: any) {
        // ── Handle human-in-the-loop pause ──
        if (err instanceof HumanInputRequired) {
          this.status = "paused";
          this.pausedAtNodeId = currentId;
          this.pausedRequest = err.request;
          this.setNodeStatus(currentId, "waiting_human");

          this.emit({
            type: "node:status", runId: this.runId, workflowId: this.workflowId,
            nodeId: currentId, status: "waiting_human",
          });
          this.emit({
            type: "workflow:paused", runId: this.runId, workflowId: this.workflowId,
            request: err.request,
          });
          this.persistStates();
          return; // Exit execution loop — will be resumed later
        }

        // ── Handle execution error ──
        console.error(`[engine] Error executing node ${currentNode.type} (${currentId}):`, err);
        this.setNodeStatus(currentId, "error", undefined, err.message);
        this.emit({
          type: "node:status", runId: this.runId, workflowId: this.workflowId,
          nodeId: currentId, status: "error", error: err.message,
        });
        outputValue = inputsMap.get("default") ?? inputsMap.values().next().value; // Pass through on error
      }

      // ── Store output in runtime data ──
      if (currentNode.type === "IfElseNode" || currentNode.type === "SwitchCaseNode") {
        if (outputValue && typeof outputValue === "object") {
          for (const handleId in outputValue) {
            this.runtimeData.set(`${currentId}__${handleId}`, outputValue[handleId]);
          }
        }
      } else {
        this.runtimeData.set(currentId, outputValue);
        this.runtimeData.set(`${currentId}__out`, outputValue);
        if (outputValue && typeof outputValue === "object") {
          for (const [key, val] of Object.entries(outputValue)) {
            this.runtimeData.set(`${currentId}__${key}`, val);
          }
        }
      }

      // ── Mark completed ──
      this.setNodeStatus(currentId, "completed", outputValue);
      this.emit({
        type: "node:status", runId: this.runId, workflowId: this.workflowId,
        nodeId: currentId, status: "completed", result: this.summarizeResult(outputValue),
      });

      // ── Track last output (for final workflow output) ──
      this.output = outputValue;

      // ── Emit block output if this node has a blockId ──
      const blockId = currentNode.data?.deskBlockId || this.config.blockId;
      if (blockId && outputValue && (outputValue.columns || outputValue.updates)) {
        this.emit({ type: "block:output", runId: this.runId, blockId, output: outputValue });
      }

      // ── Advance children ──
      graph.get(currentId)?.forEach((childId) => {
        inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
        if (inDegree.get(childId) === 0) {
          queue.push(childId);
        }
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  private setNodeStatus(nodeId: string, status: NodeStatus, result?: any, error?: string): void {
    const existing = this.nodeStates.get(nodeId) || { status: "idle" };
    this.nodeStates.set(nodeId, {
      ...existing,
      status,
      result: result !== undefined ? result : existing.result,
      error,
      startedAt: status === "running" ? Date.now() : existing.startedAt,
      completedAt: (status === "completed" || status === "error") ? Date.now() : existing.completedAt,
    });
  }

  private emit(event: WorkflowEvent): void {
    try {
      this.config.onEvent(event);
    } catch (err) {
      console.error("[engine] Error emitting event:", err);
    }
  }

  private persistStates(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getNodeStates());
    }
  }

  /** Summarize large results to avoid huge WebSocket payloads */
  private summarizeResult(value: any): any {
    if (!value) return value;
    if (typeof value !== "object") return value;
    if (Array.isArray(value.columns) && Array.isArray(value.data)) {
      return {
        columns: value.columns,
        rowCount: value.data.length,
        preview: value.data.slice(0, 3),
      };
    }
    return value;
  }
}
