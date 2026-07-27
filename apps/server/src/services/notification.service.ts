import { prisma, Prisma } from "@repo/db";
import { webSocketManager } from "../websocket.js";

export class NotificationService {
  /**
   * Get all notifications for a user.
   */
  async getNotifications(userId: string, opts?: { unreadOnly?: boolean }) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(opts?.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Create a new notification and emit over WebSockets.
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const notification = await prisma.notification.create({ data });

    // Emit live event over WebSocket to connected client(s)
    webSocketManager.sendToUser(data.userId, {
      type: "NOTIFICATION_RECEIVED",
      notification,
    });

    return notification;
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }
}

export const notificationService = new NotificationService();
