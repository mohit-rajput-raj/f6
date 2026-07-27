import { Router } from "express";
import workflowRoutes from "./workflow.routes.js";
import deskRoutes from "./desk.routes.js";
import teamRoutes from "./team.routes.js";
import notificationRoutes from "./notification.routes.js";

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

export default router;
