"use server";

import { supabase } from "@repo/db";

/** Invite someone to collaborate on a desk/master sheet */
export async function inviteToDesk({
  masterSheetId,
  invitedEmail,
  permission = "editor",
  projectWorkflowId,
}: {
  masterSheetId?: string;
  invitedEmail: string;
  permission?: "editor" | "viewer";
  projectWorkflowId?: string;
}) {
  let targetMasterSheetId = masterSheetId;

  if (!targetMasterSheetId) {
    if (!projectWorkflowId) {
      throw new Error("Either masterSheetId or projectWorkflowId must be provided");
    }

    const { data: workflow } = await supabase
      .from("workflow")
      .select("userId, name")
      .eq("id", projectWorkflowId)
      .maybeSingle();

    let sheet = null;
    if (workflow?.userId) {
      const { data: existingSheet } = await supabase
        .from("master_sheet")
        .select("*")
        .eq("userId", workflow.userId)
        .order("createdAt", { ascending: true })
        .limit(1)
        .maybeSingle();

      sheet = existingSheet;
    }

    if (!sheet) {
      const { data: newSheet, error } = await supabase
        .from("master_sheet")
        .insert({
          userId: workflow?.userId || crypto.randomUUID(),
          name: `${workflow?.name || "Project"} MasterSheet`,
          data: [],
          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;
      sheet = newSheet;
    }
    targetMasterSheetId = sheet.id;
  }

  // Prevent the owner from inviting themselves
  if (projectWorkflowId) {
    const { data: workflow } = await supabase
      .from("workflow")
      .select("userId")
      .eq("id", projectWorkflowId)
      .maybeSingle();

    if (workflow?.userId) {
      const { data: ownerUser } = await supabase
        .from("user")
        .select("email")
        .eq("id", workflow.userId)
        .maybeSingle();

      if (ownerUser?.email?.toLowerCase() === invitedEmail.toLowerCase()) {
        throw new Error("You cannot invite yourself — you are already the owner of this desk.");
      }
    }
  }

  // Check if already shared
  const { data: existing } = await supabase
    .from("desk_share")
    .select("*")
    .eq("masterSheetId", targetMasterSheetId)
    .ilike("invitedEmail", invitedEmail)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("This person is already an active member of this desk.");
    }
    const { data: updatedShare, error } = await supabase
      .from("desk_share")
      .update({ permission, status: "pending", projectWorkflowId: projectWorkflowId ?? existing.projectWorkflowId })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return updatedShare;
  }

  const { data: user } = await supabase
    .from("user")
    .select("id")
    .ilike("email", invitedEmail)
    .maybeSingle();

  const { data: share, error } = await supabase
    .from("desk_share")
    .insert({
      masterSheetId: targetMasterSheetId,
      invitedEmail,
      invitedUserId: user?.id ?? null,
      permission,
      projectWorkflowId: projectWorkflowId ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  // Create an in-app notification record in database if recipient user exists
  if (user?.id) {
    try {
      const { data: existingNotifs } = await supabase
        .from("notification")
        .select("id, data")
        .eq("userId", user.id)
        .eq("type", "desk_invite");

      const staleIds = (existingNotifs || [])
        .filter((n: any) => {
          const d = n.data || {};
          return (
            (projectWorkflowId && d?.projectWorkflowId === projectWorkflowId) ||
            (share?.id && d?.shareId === share.id)
          );
        })
        .map((n: any) => n.id);

      if (staleIds.length > 0) {
        await supabase.from("notification").delete().in("id", staleIds);
      }

      const { data: sheet } = await supabase
        .from("master_sheet")
        .select("name, user:user(id, name, email, image)")
        .eq("id", targetMasterSheetId)
        .maybeSingle();

      const senderObj = (sheet as any)?.user;

      await supabase.from("notification").insert({
        userId: user.id,
        type: "desk_invite",
        title: "New Desk Collaboration Invitation",
        message: `You have been invited to collaborate on a common desk as ${permission === "editor" ? "Can edit" : "Can view"}.`,
        data: {
          projectWorkflowId: projectWorkflowId ?? null,
          shareId: share.id,
          requestStatus: "pending",
          workspaceName: sheet?.name || "Shared Workspace",
          sender: {
            id: senderObj?.id,
            name: senderObj?.name || senderObj?.email || "Team Member",
            email: senderObj?.email || "",
            avatar: senderObj?.image || "",
          },
        },
      });
    } catch (e) {
      console.warn("Could not create notification record:", e);
    }
  }

  return share;
}

/** Get all collaborators of a master sheet or project */
export async function getDeskCollaborators(masterSheetId?: string, projectWorkflowId?: string) {
  if (projectWorkflowId) {
    const { data } = await supabase
      .from("desk_share")
      .select("*")
      .eq("projectWorkflowId", projectWorkflowId)
      .order("createdAt", { ascending: false });

    return data || [];
  }
  if (masterSheetId) {
    const { data } = await supabase
      .from("desk_share")
      .select("*")
      .eq("masterSheetId", masterSheetId)
      .order("createdAt", { ascending: false });

    return data || [];
  }
  return [];
}

/** Get all master sheets shared with a specific email */
export async function getSharedDesks(email: string) {
  const { data: shares } = await supabase
    .from("desk_share")
    .select("*, masterSheet:master_sheet(*)")
    .ilike("invitedEmail", email)
    .order("createdAt", { ascending: false });

  return (shares || []).map((s: any) => ({
    shareId: s.id,
    permission: s.permission,
    status: s.status,
    projectWorkflowId: s.projectWorkflowId,
    ...s.masterSheet,
  }));
}

/** Get pending invites for a user by email or user ID */
export async function getPendingInvites(email: string, userId?: string) {
  let query = supabase
    .from("desk_share")
    .select("*, masterSheet:master_sheet(id, name, user:user(id, name, email, image))")
    .eq("status", "pending")
    .order("createdAt", { ascending: false });

  if (email && userId) {
    query = query.or(`invitedEmail.ilike.${email},invitedUserId.eq.${userId}`);
  } else if (email) {
    query = query.ilike("invitedEmail", email);
  } else if (userId) {
    query = query.eq("invitedUserId", userId);
  } else {
    return [];
  }

  const { data } = await query;
  return data || [];
}

/** Accept an invite */
export async function acceptInvite(shareId: string, userId?: string) {
  const updateData: any = { status: "accepted" };
  if (userId) updateData.invitedUserId = userId;

  const { data: updatedShare, error } = await supabase
    .from("desk_share")
    .update(updateData)
    .eq("id", shareId)
    .select()
    .single();

  if (error) throw error;

  try {
    const { data: notifs } = await supabase
      .from("notification")
      .select("*")
      .eq("type", "desk_invite");

    for (const n of notifs || []) {
      const d = n.data || {};
      if (d.shareId === shareId) {
        await supabase
          .from("notification")
          .update({
            read: true,
            data: {
              ...d,
              requestStatus: "accepted",
            },
          })
          .eq("id", n.id);
      }
    }
  } catch (e) {
    console.warn("Could not update notification status on acceptInvite:", e);
  }

  return updatedShare;
}

/** Reject an invite */
export async function rejectInvite(shareId: string) {
  const { data: updatedShare, error } = await supabase
    .from("desk_share")
    .update({ status: "rejected" })
    .eq("id", shareId)
    .select()
    .single();

  if (error) throw error;

  try {
    const { data: notifs } = await supabase
      .from("notification")
      .select("*")
      .eq("type", "desk_invite");

    for (const n of notifs || []) {
      const d = n.data || {};
      if (d.shareId === shareId) {
        await supabase
          .from("notification")
          .update({
            read: true,
            data: {
              ...d,
              requestStatus: "declined",
            },
          })
          .eq("id", n.id);
      }
    }
  } catch (e) {
    console.warn("Could not update notification status on rejectInvite:", e);
  }

  return updatedShare;
}

/** Check user permission on a project/workflow (owner, editor guest, or viewer guest) */
export async function getSharedDeskAccess(projectWorkflowId: string, userEmail: string) {
  if (!projectWorkflowId || !userEmail) {
    return { isOwner: true, isGuest: false, permission: "editor" as const };
  }

  const { data: workflow } = await supabase
    .from("workflow")
    .select("userId")
    .eq("id", projectWorkflowId)
    .maybeSingle();

  if (workflow?.userId) {
    const { data: ownerUser } = await supabase
      .from("user")
      .select("email")
      .eq("id", workflow.userId)
      .maybeSingle();

    if (ownerUser?.email?.toLowerCase() === userEmail.toLowerCase()) {
      return { isOwner: true, isGuest: false, permission: "editor" as const };
    }
  }

  const { data: share } = await supabase
    .from("desk_share")
    .select("*")
    .eq("projectWorkflowId", projectWorkflowId)
    .ilike("invitedEmail", userEmail)
    .eq("status", "accepted")
    .maybeSingle();

  if (share) {
    return {
      isOwner: false,
      isGuest: true,
      permission: (share.permission as "editor" | "viewer") || "editor",
    };
  }

  return { isOwner: true, isGuest: false, permission: "editor" as const };
}

/** Remove a collaborator share and clean up associated notifications */
export async function removeCollaborator(shareId: string) {
  const { data: share } = await supabase.from("desk_share").select("*").eq("id", shareId).maybeSingle();

  if (share) {
    try {
      const { data: notifs } = await supabase
        .from("notification")
        .select("id, data")
        .eq("type", "desk_invite");

      const toDelete = (notifs || [])
        .filter((n: any) => {
          const d = n.data || {};
          return d?.shareId === shareId || (share.projectWorkflowId && d?.projectWorkflowId === share.projectWorkflowId);
        })
        .map((n: any) => n.id);

      if (toDelete.length > 0) {
        await supabase.from("notification").delete().in("id", toDelete);
      }
    } catch (e) {
      console.warn("Could not delete notifications on removeCollaborator:", e);
    }

    const { data: deleted, error } = await supabase.from("desk_share").delete().eq("id", shareId).select().single();
    if (error) throw error;
    return deleted;
  }

  return null;
}

// ─── Notification Actions (Internal Next.js DB-backed) ──────

/** Get all in-app notifications for a user */
export async function getUserNotifications(userId: string, unreadOnly = false) {
  let query = supabase.from("notification").select("*").eq("userId", userId).order("createdAt", { ascending: false });

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data: notifs } = await query;
  if (!notifs || notifs.length === 0) return [];

  const shareIds = notifs
    .filter((n: any) => n.type === "desk_invite")
    .map((n: any) => n.data?.shareId)
    .filter(Boolean);

  if (shareIds.length === 0) return notifs;

  const { data: shares } = await supabase.from("desk_share").select("id, status").in("id", shareIds);
  const shareStatusMap = new Map((shares || []).map((s: any) => [s.id, s.status]));

  const result = [];
  for (const n of notifs) {
    if (n.type === "desk_invite") {
      const shareId = n.data?.shareId;
      if (shareId) {
        const currentStatus = shareStatusMap.get(shareId);
        if (!currentStatus) continue;

        const dataObj = n.data || {};
        const effectiveStatus =
          currentStatus === "accepted" ? "accepted" : currentStatus === "rejected" ? "declined" : dataObj.requestStatus || "pending";

        n.data = {
          ...dataObj,
          requestStatus: effectiveStatus,
        };
      }
    }
    result.push(n);
  }

  return result;
}

/** Get unread notification count for a user */
export async function getUnreadNotificationCount(userId: string) {
  const { count } = await supabase
    .from("notification")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("read", false);

  return count || 0;
}

/** Mark a single notification as read */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from("notification")
    .update({ read: true })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Mark all notifications as read for a user */
export async function markAllNotificationsRead(userId: string) {
  const { data, error } = await supabase
    .from("notification")
    .update({ read: true })
    .eq("userId", userId)
    .eq("read", false)
    .select();

  if (error) throw error;
  return data;
}

/** Get the owner details of a specific workflow */
export async function getWorkflowOwner(projectWorkflowId: string) {
  const { data: workflow } = await supabase
    .from("workflow")
    .select("*, user:user(*)")
    .eq("id", projectWorkflowId)
    .maybeSingle();

  if (!workflow || !workflow.user) return null;
  return {
    id: workflow.user.id,
    email: workflow.user.email,
    name: workflow.user.name,
  };
}

