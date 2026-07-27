import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";

export class NotificationController {
  async list(req: Request, res: Response) {
    const userId = req.query.userId as string;
    const unreadOnly = req.query.unreadOnly === "true";
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const notifications = await notificationService.getNotifications(userId, { unreadOnly });
    res.json({ success: true, data: notifications });
  }

  async unreadCount(req: Request, res: Response) {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const count = await notificationService.getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  }

  async markAsRead(req: Request, res: Response) {
    const notificationId = req.params.notificationId as string;
    const result = await notificationService.markAsRead(notificationId);
    res.json({ success: true, data: result });
  }

  async markAllAsRead(req: Request, res: Response) {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const result = await notificationService.markAllAsRead(userId);
    res.json({ success: true, data: result });
  }
}

export const notificationController = new NotificationController();
