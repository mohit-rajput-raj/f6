import { Router } from "express";
import { asyncHandler } from "../middlewares/error-handler.js";
import { notificationController } from "../controllers/notification.controller.js";

const router: Router = Router();

router.get("/", asyncHandler(notificationController.list));
router.get("/unread-count", asyncHandler(notificationController.unreadCount));
router.patch("/:notificationId/read", asyncHandler(notificationController.markAsRead));
router.post("/mark-all-read", asyncHandler(notificationController.markAllAsRead));

export default router;
