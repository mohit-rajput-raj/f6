import { supabase } from "@repo/db";
import { webSocketManager } from "../websocket.js";

export class NotificationService {
  /**
   * Get all notifications for a user.
   */
  async getNotifications(userId: string, opts?: { unreadOnly?: boolean }) {
    let query = supabase
      .from("notification")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (opts?.unreadOnly) {
      query = query.eq("read", false);
    }

    const { data } = await query;
    return data || [];
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from("notification")
      .update({ read: true })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from("notification")
      .update({ read: true })
      .eq("userId", userId)
      .eq("read", false)
      .select();

    if (error) throw error;
    return { count: data?.length || 0 };
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
    const { data: notification, error } = await supabase
      .from("notification")
      .insert(data)
      .select()
      .single();

    if (error) throw error;

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
    const { count } = await supabase
      .from("notification")
      .select("id", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("read", false);

    return count || 0;
  }
}

export const notificationService = new NotificationService();

