import { Router } from "express";
import { asyncHandler } from "../middlewares/error-handler.js";
import { teamController } from "../controllers/team.controller.js";

const router: Router = Router();

router.post("/invite", asyncHandler(teamController.invite));
router.get("/invites/pending", asyncHandler(teamController.getPendingInvites));
router.get("/:masterSheetId/collaborators", asyncHandler(teamController.getCollaborators));
router.post("/invites/:shareId/accept", asyncHandler(teamController.acceptInvite));
router.post("/invites/:shareId/reject", asyncHandler(teamController.rejectInvite));
router.patch("/invites/:shareId/columns", asyncHandler(teamController.updateReservedColumns));
router.delete("/collaborators/:shareId", asyncHandler(teamController.removeCollaborator));

export default router;
