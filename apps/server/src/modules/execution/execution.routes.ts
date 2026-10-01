// ═══════════════════════════════════════════════════════════
// Execution Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error-handler.js";
import { executionController } from "./execution.controller.js";

const router: Router = Router();

// Run a workflow
router.post("/run", asyncHandler(executionController.run));

// Resume a paused workflow (human-in-the-loop)
router.post("/:runId/resume", asyncHandler(executionController.resume));

// Cancel a running workflow
router.post("/:runId/cancel", asyncHandler(executionController.cancel));

// Get run status
router.get("/:runId/status", asyncHandler(executionController.status));

// List runs for a workflow
router.get("/runs/:workflowId", asyncHandler(executionController.listRuns));

export default router;
