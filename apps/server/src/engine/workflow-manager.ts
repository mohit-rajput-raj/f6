// ═══════════════════════════════════════════════════════════
// WorkflowManager — Manages all active workflow instances
// Handles creating, running, pausing, resuming, cancelling.
// Future-ready for Redis/Kafka queue integration.
// ═══════════════════════════════════════════════════════════

import { randomUUID } from "crypto";
import { supabase } from "@repo/db";
import type {
  WorkflowEvent,
  WorkflowRunStatus,
  NodeState,
  RunWorkflowRequest,
  NodeDefinition,
  EdgeDefinition,
} from "@repo/workflow-engine/types";
import { WorkflowInstance } from "./workflow-instance.js";
import { NodeRegistry } from "./node-registry.js";
import { ServerDeskInputResolver } from "./desk-input-resolver.js";
import { webSocketManager } from "../websocket.js";

// Import all executor factories
import { createDataInputExecutors } from "./executors/data-input.js";
import { createTransformExecutors } from "./executors/transforms.js";
import { createMergeExecutors } from "./executors/merge.js";
import { createLogicExecutors } from "./executors/logic.js";
import { createBlockExecutors } from "./executors/blocks.js";
import { createDeskExecutors } from "./executors/desk.js";
import { createIOExecutors } from "./executors/io.js";
import { createAnalyticsExecutors } from "./executors/analytics.js";
import { createSubflowExecutors } from "./executors/subflow.js";

export class WorkflowManager {
  /** Active workflow instances keyed by runId */
  private instances = new Map<string, WorkflowInstance>();

  // ── Run a Workflow ──────────────────────────────────────────

  async run(
    request: RunWorkflowRequest,
  ): Promise<{ runId: string; status: WorkflowRunStatus }> {
    const runId = randomUUID();

    // 1. Load workflow definition from DB
    const { data: workflow, error: wfErr } = await supabase
      .from("workflow")
      .select("definition")
      .eq("id", request.workflowId)
      .maybeSingle();

    if (wfErr || !workflow) {
      throw Object.assign(new Error("Workflow not found"), { statusCode: 404 });
    }

    const definition = workflow.definition;
    const rfNodes: any[] = definition?.reactFlow?.nodes ?? [];
    const rfEdges: any[] = definition?.reactFlow?.edges ?? [];

    if (rfNodes.length === 0) {
      throw Object.assign(new Error("Workflow has no nodes"), {
        statusCode: 400,
      });
    }

    // 2. Convert ReactFlow nodes to NodeDefinitions
    const nodes: NodeDefinition[] = rfNodes.map((n: any) => ({
      id: n.id,
      type: n.type || "unknown",
      data: n.data || {},
      position: n.position,
    }));

    const edges: EdgeDefinition[] = rfEdges.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));

    // 3. Apply node overrides from request (desk inputs, etc.)
    if (request.nodeOverrides) {
      for (const [nodeId, overrideData] of Object.entries(
        request.nodeOverrides,
      )) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, ...overrideData };
        }
      }
    }

    // 4. Build desk input resolver
    const deskResolver = new ServerDeskInputResolver(
      request.dashid,
      request.userId,
      request.deskInputs,
    );

    // 5. Build registry with all executors
    const registry = this.buildRegistry(deskResolver);

    // 6. Create the run record in DB
    await this.createRunRecord(runId, request);

    // 7. Create workflow instance
    const instance = new WorkflowInstance({
      runId,
      workflowId: request.workflowId,
      userId: request.userId,
      dashid: request.dashid,
      blockId: request.blockId,
      nodes,
      edges,
      registry,
      deskResolver,
      onEvent: (event) => this.handleEvent(request.userId, event),
      onStateChange: (states) => this.persistNodeStates(runId, states),
    });

    this.instances.set(runId, instance);

    // 8. Execute in background (non-blocking!)
    instance
      .execute()
      .then(() => {
        this.updateRunStatus(
          runId,
          instance.currentStatus,
          instance.currentOutput,
          instance.currentError,
        );
        // Clean up completed instances after 5 minutes
        setTimeout(() => this.instances.delete(runId), 5 * 60 * 1000);
      })
      .catch((err) => {
        console.error(`[WorkflowManager] Run ${runId} failed:`, err);
        this.updateRunStatus(runId, "error", null, err.message);
        setTimeout(() => this.instances.delete(runId), 5 * 60 * 1000);
      });

    return { runId, status: "running" };
  }

  // ── Resume a Paused Workflow ────────────────────────────────

  async resume(
    runId: string,
    nodeId: string,
    data?: any,
  ): Promise<{ status: WorkflowRunStatus }> {
    const instance = this.instances.get(runId);
    if (!instance) {
      throw Object.assign(new Error("Run not found or already completed"), {
        statusCode: 404,
      });
    }

    if (instance.currentStatus !== "paused") {
      throw Object.assign(
        new Error(`Run is ${instance.currentStatus}, not paused`),
        { statusCode: 400 },
      );
    }

    // Resume in background
    instance
      .resume(nodeId, data)
      .then(() => {
        this.updateRunStatus(
          runId,
          instance.currentStatus,
          instance.currentOutput,
          instance.currentError,
        );
      })
      .catch((err) => {
        console.error(`[WorkflowManager] Resume ${runId} failed:`, err);
        this.updateRunStatus(runId, "error", null, err.message);
      });

    return { status: "running" };
  }

  // ── Cancel a Running Workflow ───────────────────────────────

  cancel(runId: string): { status: WorkflowRunStatus } {
    const instance = this.instances.get(runId);
    if (!instance) {
      throw Object.assign(new Error("Run not found"), { statusCode: 404 });
    }

    instance.cancel();
    this.updateRunStatus(runId, "cancelled");
    this.instances.delete(runId);
    return { status: "cancelled" };
  }

  // ── Get Run Status ──────────────────────────────────────────

  async getRunStatus(runId: string): Promise<any> {
    // Check in-memory first
    const instance = this.instances.get(runId);
    if (instance) {
      return {
        id: runId,
        workflowId: instance.workflowId,
        status: instance.currentStatus,
        nodeStates: instance.getNodeStates(),
        output: instance.currentOutput,
        error: instance.currentError,
        pausedRequest: instance.currentPausedRequest,
      };
    }

    // Fallback to DB
    const { data: run } = await supabase
      .from("workflow_run")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (!run)
      throw Object.assign(new Error("Run not found"), { statusCode: 404 });
    return run;
  }

  // ── List Runs for a Workflow ────────────────────────────────

  async listRuns(workflowId: string, limit = 20): Promise<any[]> {
    const { data: runs } = await supabase
      .from("workflow_run")
      .select(
        "id, workflowId, userId, dashid, blockId, status, startedAt, completedAt, error",
      )
      .eq("workflowId", workflowId)
      .order("startedAt", { ascending: false })
      .limit(limit);

    return runs || [];
  }

  // ── Private Helpers ─────────────────────────────────────────

  private buildRegistry(deskResolver: ServerDeskInputResolver): NodeRegistry {
    const registry = new NodeRegistry();

    registry.registerMany(createDataInputExecutors(deskResolver));
    registry.registerMany(createTransformExecutors());
    registry.registerMany(createMergeExecutors());
    registry.registerMany(createLogicExecutors(deskResolver));
    registry.registerMany(createBlockExecutors(deskResolver));
    registry.registerMany(createDeskExecutors(deskResolver));
    registry.registerMany(createIOExecutors());
    registry.registerMany(createAnalyticsExecutors(deskResolver));
    registry.registerMany(createSubflowExecutors());

    return registry;
  }

  private handleEvent(userId: string, event: WorkflowEvent): void {
    // Send event to user via WebSocket
    try {
      webSocketManager.sendToUser(userId, {
        type: "workflow_event",
        payload: event,
      });
    } catch (err) {
      console.error("[WorkflowManager] WebSocket send error:", err);
    }
  }

  private async createRunRecord(
    runId: string,
    request: RunWorkflowRequest,
  ): Promise<void> {
    try {
      await supabase.from("workflow_run").insert({
        id: runId,
        workflowId: request.workflowId,
        userId: request.userId,
        dashid: request.dashid,
        blockId: request.blockId || null,
        status: "running",
        nodeStates: {},
        inputs: request.deskInputs || {},
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[WorkflowManager] Could not create run record:", err);
    }
  }

  private async updateRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: any,
    error?: string | null,
  ): Promise<void> {
    try {
      const update: any = { status, updatedAt: new Date().toISOString() };
      if (
        status === "completed" ||
        status === "error" ||
        status === "cancelled"
      ) {
        update.completedAt = new Date().toISOString();
      }
      if (output !== undefined) update.output = output;
      if (error !== undefined) update.error = error;

      await supabase.from("workflow_run").update(update).eq("id", runId);
    } catch (err) {
      console.warn("[WorkflowManager] Could not update run status:", err);
    }
  }

  private async persistNodeStates(
    runId: string,
    states: Record<string, NodeState>,
  ): Promise<void> {
    try {
      await supabase
        .from("workflow_run")
        .update({ nodeStates: states })
        .eq("id", runId);
    } catch (err) {
      console.warn("[WorkflowManager] Could not persist node states:", err);
    }
  }
}

// Singleton instance
export const workflowManager = new WorkflowManager();
