"use client";

import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getPendingInvites,
  acceptInvite,
  rejectInvite,
  inviteToDesk,
} from "@/app/[project]/dash/[dashid]/desk/desk-share-actions";

const API_BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000/api/v1";

export interface ServerNotification {
  id: string;
  userId: string;
  type: "desk_invite" | "data_commit" | "system" | "workflow" | "mention" | string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface ServerDeskShare {
  id: string;
  masterSheetId: string;
  invitedEmail: string;
  invitedUserId?: string | null;
  permission: string;
  reservedColumns: string[];
  projectWorkflowId?: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  masterSheet?: {
    id: string;
    name: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  };
}


/**
 * Fetch all notifications for a user (DB-backed with Express server fallback).
 */
export async function fetchNotifications(userId: string, unreadOnly = false): Promise<ServerNotification[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications?userId=${encodeURIComponent(userId)}&unreadOnly=${unreadOnly}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {
    // Ignore external server unreachable error
  }

  // Fallback to internal Prisma DB query
  try {
    const dbNotifs = await getUserNotifications(userId, unreadOnly);
    return dbNotifs.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  } catch (err) {
    console.warn("[notifications-api] Failed to load DB notifications:", err);
    return [];
  }
}

/**
 * Fetch unread notification count for a user.
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const json = await res.json();
      return json.data?.count ?? 0;
    }
  } catch {
    // Ignore external server unreachable error
  }

  try {
    return await getUnreadNotificationCount(userId);
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await markNotificationRead(notificationId);
    return true;
  } catch (err) {
    console.error("[notifications-api] Failed to mark notification as read:", err);
    return false;
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    await markAllNotificationsRead(userId);
    return true;
  } catch (err) {
    console.error("[notifications-api] Failed to mark all notifications as read:", err);
    return false;
  }
}

/**
 * Fetch pending desk share invitations for an email or user ID.
 */
export async function fetchPendingInvites(email: string, userId?: string): Promise<ServerDeskShare[]> {
  try {
    const invites = await getPendingInvites(email, userId);
    return invites.map((inv) => ({
      id: inv.id,
      masterSheetId: inv.masterSheetId,
      invitedEmail: inv.invitedEmail,
      invitedUserId: inv.invitedUserId,
      permission: inv.permission,
      reservedColumns: inv.reservedColumns,
      projectWorkflowId: inv.projectWorkflowId,
      status: inv.status as any,
      createdAt: inv.createdAt.toISOString(),
      masterSheet: inv.masterSheet ?? undefined,
    }));
  } catch (err) {
    console.warn("[notifications-api] Failed to fetch pending invites:", err);
    return [];
  }
}


/**
 * Accept a desk invite.
 */
export async function acceptDeskInvite(shareId: string, userId?: string): Promise<boolean> {
  try {
    await acceptInvite(shareId, userId);
    return true;
  } catch (err) {
    console.error("[notifications-api] Failed to accept desk invite:", err);
    return false;
  }
}


/**
 * Reject a desk invite.
 */
export async function rejectDeskInvite(shareId: string): Promise<boolean> {
  try {
    await rejectInvite(shareId);
    return true;
  } catch (err) {
    console.error("[notifications-api] Failed to reject desk invite:", err);
    return false;
  }
}

/**
 * Send a desk invitation to a team member by email.
 */
export async function sendDeskInvite(data: {
  masterSheetId?: string;
  invitedEmail: string;
  permission?: string;
  reservedColumns?: string[];
  projectWorkflowId?: string;
}): Promise<ServerDeskShare | null> {
  try {
    const share = await inviteToDesk({
      masterSheetId: data.masterSheetId,
      invitedEmail: data.invitedEmail,
      permission: (data.permission as any) || "editor",
      projectWorkflowId: data.projectWorkflowId,
    });
    return {
      id: share.id,
      masterSheetId: share.masterSheetId,
      invitedEmail: share.invitedEmail,
      invitedUserId: share.invitedUserId,
      permission: share.permission,
      reservedColumns: share.reservedColumns,
      projectWorkflowId: share.projectWorkflowId,
      status: share.status as any,
      createdAt: share.createdAt.toISOString(),
    };
  } catch (err: any) {
    console.error("[notifications-api] Failed to send desk invite:", err);
    throw err;
  }
}
