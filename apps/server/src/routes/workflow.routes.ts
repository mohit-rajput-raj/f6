import { Router } from "express";
import { asyncHandler } from "../middlewares/error-handler.js";
import { workflowController } from "../controllers/workflow.controller.js";

const router: Router = Router();

router.get("/", asyncHandler(workflowController.list));
router.get("/:id", asyncHandler(workflowController.get));
router.post("/", asyncHandler(workflowController.create));
router.patch("/:id", asyncHandler(workflowController.update));
router.delete("/:id", asyncHandler(workflowController.delete));

export default router;
