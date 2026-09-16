import { Router } from "express";
import workflowRoutes from "../modules/workflow/workflow.routes.js";
import deskRoutes from "../modules/desk/desk.routes.js";
import teamRoutes from "../modules/team/team.routes.js";
import notificationRoutes from "../modules/notification/notification.routes.js";
import usersRoutes from "../modules/admin/users/users.routes.js";

const router: Router = Router();

// ─── Health Check ───────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Modular API Routes ─────────────────────────────────────
router.use("/workflows", workflowRoutes);
router.use("/desk", deskRoutes);
router.use("/team", teamRoutes);
router.use("/notifications", notificationRoutes);

// ─── Admin Routes ───────────────────────────────────────────
router.use("/admin", usersRoutes);

export default router;
