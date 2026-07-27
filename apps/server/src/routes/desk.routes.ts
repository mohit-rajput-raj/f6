import { Router } from "express";
import { asyncHandler } from "../middlewares/error-handler.js";
import { deskController } from "../controllers/desk.controller.js";

const router: Router = Router();

router.get("/:projectWorkflowId/blocks", asyncHandler(deskController.getBlocks));
router.post("/:projectWorkflowId/blocks", asyncHandler(deskController.createBlock));
router.post("/:projectWorkflowId/reorder", asyncHandler(deskController.reorderBlocks));
router.get("/blocks/:blockId", asyncHandler(deskController.getBlock));
router.patch("/blocks/:blockId/inputs", asyncHandler(deskController.updateBlockInputs));
router.patch("/blocks/:blockId/output", asyncHandler(deskController.updateBlockOutput));
router.post("/blocks/:blockId/commit", asyncHandler(deskController.commitToMasterSheet));
router.delete("/blocks/:blockId", asyncHandler(deskController.deleteBlock));

export default router;
