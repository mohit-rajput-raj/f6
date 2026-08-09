"use server";

import { prisma } from "@repo/db";

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
    // Find or create a default master sheet for this project
    const workflow = await prisma.workflow.findUnique({
      where: { id: projectWorkflowId },
      select: { userId: true, name: true },
    });

    let sheet = null;
    if (workflow?.userId) {
      sheet = await prisma.masterSheet.findFirst({
        where: { userId: workflow.userId },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!sheet) {
      sheet = await prisma.masterSheet.create({
        data: {
          userId: workflow?.userId || crypto.randomUUID(),
          name: `${workflow?.name || "Project"} MasterSheet`,
          data: [],
          metadata: {},
        },
      });
    }
    targetMasterSheetId = sheet.id;
  }

  // Prevent the owner from inviting themselves
  if (projectWorkflowId) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: projectWorkflowId },
      select: { userId: true },
    });
    if (workflow?.userId) {
      const ownerUser = await prisma.user.findUnique({
        where: { id: workflow.userId },
        select: { email: true },
      });
      if (ownerUser?.email?.toLowerCase() === invitedEmail.toLowerCase()) {
        throw new Error("You cannot invite yourself — you are already the owner of this desk.");
      }
    }
  }

  // Check if already shared
  const existing = await prisma.deskShare.findUnique({
    where: {
      masterSheetId_invitedEmail: { masterSheetId: targetMasterSheetId, invitedEmail },
    },
  });

  if (existing) {
    // If already accepted, don't re-invite
    if (existing.status === "accepted") {
      throw new Error("This person is already an active member of this desk.");
    }
    // Re-send invite: reset to pending with updated permission
    const updatedShare = await prisma.deskShare.update({
      where: { id: existing.id },
      data: { permission, status: "pending", projectWorkflowId: projectWorkflowId ?? existing.projectWorkflowId },
    });
    return updatedShare;
  }

  const user = await prisma.user.findUnique({
    where: { email: invitedEmail },
    select: { id: true },
  });

  const share = await prisma.deskShare.create({
    data: {
      masterSheetId: targetMasterSheetId,
      invitedEmail,
      invitedUserId: user?.id ?? null,
      permission,
      projectWorkflowId: projectWorkflowId ?? null,
      status: "pending",
    },
  });

  // Create an in-app notification record in database if recipient user exists
  if (user?.id) {
    try {
      // Remove stale previous notifications for recipient on this project/share
      const existingNotifs = await prisma.notification.findMany({
        where: { userId: user.id, type: "desk_invite" },
        select: { id: true, data: true },
      });
      const staleIds = existingNotifs
        .filter((n) => {
          const d = n.data as any;
          return (
            (projectWorkflowId && d?.projectWorkflowId === projectWorkflowId) ||
            (share?.id && d?.shareId === share.id)
          );
        })
        .map((n) => n.id);

      if (staleIds.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: staleIds } },
        });
      }

      const sheet = await prisma.masterSheet.findUnique({
        where: { id: targetMasterSheetId },
        select: {
          name: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
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
              id: sheet?.user?.id,
              name: sheet?.user?.name || sheet?.user?.email || "Team Member",
              email: sheet?.user?.email || "",
              avatar: sheet?.user?.image || "",
            },
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
    return prisma.deskShare.findMany({
      where: { projectWorkflowId },
      orderBy: { createdAt: "desc" },
    });
  }
  if (masterSheetId) {
    return prisma.deskShare.findMany({
      where: { masterSheetId },
      orderBy: { createdAt: "desc" },
    });
  }
  return [];
}

/** Get all master sheets shared with a specific email */
export async function getSharedDesks(email: string) {
  const shares = await prisma.deskShare.findMany({
    where: { invitedEmail: email },
    include: {
      masterSheet: {
        select: {
          id: true,
          name: true,
          data: true,
          metadata: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return shares.map((s) => ({
    shareId: s.id,
    permission: s.permission,
    status: s.status,
    projectWorkflowId: s.projectWorkflowId,
    ...s.masterSheet,
  }));
}

/** Get pending invites for a user by email or user ID */
export async function getPendingInvites(email: string, userId?: string) {
  const conditions: any[] = [];
  if (email && email.trim() !== "") {
    conditions.push({ invitedEmail: { equals: email.trim(), mode: "insensitive" } });
  }
  if (userId && userId.trim() !== "") {
    conditions.push({ invitedUserId: userId.trim() });
  }

  if (conditions.length === 0) return [];

  return prisma.deskShare.findMany({
    where: {
      OR: conditions,
      status: "pending",
    },
    include: {
      masterSheet: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Accept an invite */
export async function acceptInvite(shareId: string, userId?: string) {
  const updatedShare = await prisma.deskShare.update({
    where: { id: shareId },
    data: {
      status: "accepted",
      ...(userId ? { invitedUserId: userId } : {}),
    },
  });

  // Sync notification in DB so it permanently reflects 'accepted'
  try {
    const notifs = await prisma.notification.findMany({
      where: { type: "desk_invite" },
    });
    for (const n of notifs) {
      const d = (n.data as any) || {};
      if (d.shareId === shareId) {
        await prisma.notification.update({
          where: { id: n.id },
          data: {
            read: true,
            data: {
              ...d,
              requestStatus: "accepted",
            },
          },
        });
      }
    }
  } catch (e) {
    console.warn("Could not update notification status on acceptInvite:", e);
  }

  return updatedShare;
}

/** Reject an invite */
export async function rejectInvite(shareId: string) {
  const updatedShare = await prisma.deskShare.update({
    where: { id: shareId },
    data: { status: "rejected" },
  });

  // Sync notification in DB so it permanently reflects 'declined'
  try {
    const notifs = await prisma.notification.findMany({
      where: { type: "desk_invite" },
    });
    for (const n of notifs) {
      const d = (n.data as any) || {};
      if (d.shareId === shareId) {
        await prisma.notification.update({
          where: { id: n.id },
          data: {
            read: true,
            data: {
              ...d,
              requestStatus: "declined",
            },
          },
        });
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

  const workflow = await prisma.workflow.findUnique({
    where: { id: projectWorkflowId },
    select: { userId: true },
  });

  if (workflow?.userId) {
    const ownerUser = await prisma.user.findUnique({
      where: { id: workflow.userId },
      select: { email: true },
    });
    if (ownerUser?.email?.toLowerCase() === userEmail.toLowerCase()) {
      return { isOwner: true, isGuest: false, permission: "editor" as const };
    }
  }

  const share = await prisma.deskShare.findFirst({
    where: {
      projectWorkflowId,
      invitedEmail: { equals: userEmail, mode: "insensitive" },
      status: "accepted",
    },
  });

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
  const share = await prisma.deskShare.findUnique({ where: { id: shareId } });

  if (share) {
    try {
      const notifs = await prisma.notification.findMany({
        where: { type: "desk_invite" },
        select: { id: true, data: true },
      });
      const toDelete = notifs
        .filter((n) => {
          const d = n.data as any;
          return d?.shareId === shareId || (share.projectWorkflowId && d?.projectWorkflowId === share.projectWorkflowId);
        })
        .map((n) => n.id);

      if (toDelete.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
    } catch (e) {
      console.warn("Could not delete notifications on removeCollaborator:", e);
    }

    return prisma.deskShare.delete({
      where: { id: shareId },
    });
  }

  return null;
}

// ─── Notification Actions (Internal Next.js DB-backed) ──────

/** Get all in-app notifications for a user */
export async function getUserNotifications(userId: string, unreadOnly = false) {
  const notifs = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const shareIds = notifs
    .filter((n) => n.type === "desk_invite")
    .map((n) => (n.data as any)?.shareId)
    .filter(Boolean);

  if (shareIds.length === 0) return notifs;

  const shares = await prisma.deskShare.findMany({
    where: { id: { in: shareIds } },
    select: { id: true, status: true },
  });
  const shareStatusMap = new Map(shares.map((s) => [s.id, s.status]));

  const result = [];
  for (const n of notifs) {
    if (n.type === "desk_invite") {
      const shareId = (n.data as any)?.shareId;
      if (shareId) {
        const currentStatus = shareStatusMap.get(shareId);
        // If underlying DeskShare record was deleted (invite cancelled), omit orphan notification
        if (!currentStatus) continue;

        const dataObj = (n.data as any) || {};
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
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

/** Mark a single notification as read */
export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/** Mark all notifications as read for a user */
export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

/** Get the owner details of a specific workflow */
export async function getWorkflowOwner(projectWorkflowId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: projectWorkflowId },
    include: { user: true },
  });
  if (!workflow) return null;
  return {
    id: workflow.user.id,
    email: workflow.user.email,
    name: workflow.user.name,
  };
}
