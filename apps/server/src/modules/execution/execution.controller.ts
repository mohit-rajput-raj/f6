// ═══════════════════════════════════════════════════════════
// Execution Controller — API handlers for workflow runs
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { workflowManager } from "../../engine/index.js";

export class ExecutionController {
  /**
   * POST /execution/run
   * Start a new workflow execution
   */
  async run(req: Request, res: Response) {
    const { workflowId, userId, dashid, blockId, deskInputs, nodeOverrides } = req.body;

    if (!workflowId || !userId || !dashid) {
      return res.status(400).json({
        success: false,
        error: { message: "workflowId, userId, and dashid are required" },
      });
    }

    const result = await workflowManager.run({
      workflowId,
      userId,
      dashid,
      blockId,
      deskInputs,
      nodeOverrides,
    });

    res.status(202).json({ success: true, data: result });
  }

  /**
   * POST /execution/:runId/resume
   * Resume a paused workflow (human-in-the-loop)
   */
  async resume(req: Request, res: Response) {
    const runId = req.params.runId!;
    const { nodeId, data } = req.body;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: { message: "nodeId is required" },
      });
    }

    const result = await workflowManager.resume(runId, nodeId, data);
    res.json({ success: true, data: result });
  }

  /**
   * POST /execution/:runId/cancel
   * Cancel a running/paused workflow
   */
  async cancel(req: Request, res: Response) {
    const runId = req.params.runId!;
    const result = workflowManager.cancel(runId);
    res.json({ success: true, data: result });
  }

  /**
   * GET /execution/:runId/status
   * Get current status of a workflow run
   */
  async status(req: Request, res: Response) {
    const runId = req.params.runId!;
    const run = await workflowManager.getRunStatus(runId);
    res.json({ success: true, data: run });
  }

  /**
   * GET /execution/runs/:workflowId
   * List all runs for a workflow
   */
  async listRuns(req: Request, res: Response) {
    const workflowId = req.params.workflowId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const runs = await workflowManager.listRuns(workflowId, limit);
    res.json({ success: true, data: runs });
  }
}

export const executionController = new ExecutionController();
