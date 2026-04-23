"use server";

import { prisma } from "@repo/db";

/** Invite someone to collaborate on a desk/master sheet */
export async function inviteToDesk({
  masterSheetId,
  invitedEmail,
  permission = "editor",
  projectWorkflowId,
}: {
  masterSheetId: string;
  invitedEmail: string;
  permission?: "editor" | "viewer";
  projectWorkflowId?: string;
}) {
  // Check if already shared
  const existing = await prisma.deskShare.findUnique({
    where: {
      masterSheetId_invitedEmail: { masterSheetId, invitedEmail },
    },
  });
  if (existing) {
    // Update permission
    return prisma.deskShare.update({
      where: { id: existing.id },
      data: { permission, projectWorkflowId: projectWorkflowId ?? existing.projectWorkflowId },
    });
  }

  // Find user by email (if they exist)
  const user = await prisma.user.findUnique({
    where: { email: invitedEmail },
    select: { id: true },
  });

  return prisma.deskShare.create({
    data: {
      masterSheetId,
      invitedEmail,
      invitedUserId: user?.id ?? null,
      permission,
      projectWorkflowId: projectWorkflowId ?? null,
      status: "pending",
    },
  });
}

/** Get all collaborators of a master sheet */
export async function getDeskCollaborators(masterSheetId: string) {
  return prisma.deskShare.findMany({
    where: { masterSheetId },
    orderBy: { createdAt: "desc" },
  });
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

/** Get pending invites for a user */
export async function getPendingInvites(email: string) {
  return prisma.deskShare.findMany({
    where: {
      invitedEmail: email,
      status: "pending",
    },
    include: {
      masterSheet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Accept an invite */
export async function acceptInvite(shareId: string) {
  return prisma.deskShare.update({
    where: { id: shareId },
    data: { status: "accepted" },
  });
}

/** Reject an invite */
export async function rejectInvite(shareId: string) {
  return prisma.deskShare.update({
    where: { id: shareId },
    data: { status: "rejected" },
  });
}

/** Check if user is a guest on a project (accepted invite, not owner) */
export async function getSharedDeskAccess(projectWorkflowId: string, userEmail: string) {
  const share = await prisma.deskShare.findFirst({
    where: {
      projectWorkflowId,
      invitedEmail: userEmail,
      status: "accepted",
    },
  });
  return share ? { isGuest: true, permission: share.permission } : { isGuest: false, permission: null };
}

/** Remove a collaborator share */
export async function removeCollaborator(shareId: string) {
  return prisma.deskShare.delete({
    where: { id: shareId },
  });
}
