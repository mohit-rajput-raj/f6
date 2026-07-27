import { prisma } from "@repo/db";

export class TeamService {
  /**
   * Invite a user by email to collaborate on a desk.
   */
  async inviteMember(data: {
    masterSheetId: string;
    invitedEmail: string;
    permission?: string;
    reservedColumns?: string[];
    projectWorkflowId?: string;
  }) {
    // Check existing invite
    const existing = await prisma.deskShare.findUnique({
      where: {
        masterSheetId_invitedEmail: {
          masterSheetId: data.masterSheetId,
          invitedEmail: data.invitedEmail,
        },
      },
    });

    if (existing) {
      return prisma.deskShare.update({
        where: { id: existing.id },
        data: {
          permission: data.permission ?? existing.permission,
          reservedColumns: data.reservedColumns ?? existing.reservedColumns,
          projectWorkflowId: data.projectWorkflowId ?? existing.projectWorkflowId,
        },
      });
    }

    // Find user by email if they exist
    const user = await prisma.user.findUnique({
      where: { email: data.invitedEmail },
      select: { id: true },
    });

    const share = await prisma.deskShare.create({
      data: {
        masterSheetId: data.masterSheetId,
        invitedEmail: data.invitedEmail,
        invitedUserId: user?.id ?? null,
        permission: data.permission ?? "editor",
        reservedColumns: data.reservedColumns ?? [],
        projectWorkflowId: data.projectWorkflowId ?? null,
        status: "pending",
      },
    });

    // Create notification for the invited user (if they exist)
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "desk_invite",
          title: "Desk Invitation",
          message: `You've been invited to collaborate on a shared desk.`,
          data: {
            shareId: share.id,
            masterSheetId: data.masterSheetId,
            projectWorkflowId: data.projectWorkflowId,
          },
        },
      });
    }

    return share;
  }

  /**
   * Get all collaborators for a master sheet.
   */
  async getCollaborators(masterSheetId: string) {
    return prisma.deskShare.findMany({
      where: { masterSheetId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Accept a desk invite.
   */
  async acceptInvite(shareId: string, userId: string) {
    const share = await prisma.deskShare.findUnique({ where: { id: shareId } });
    if (!share) throw Object.assign(new Error("Invite not found"), { statusCode: 404 });

    const updated = await prisma.deskShare.update({
      where: { id: shareId },
      data: { status: "accepted", invitedUserId: userId },
    });

    return updated;
  }

  /**
   * Reject a desk invite.
   */
  async rejectInvite(shareId: string) {
    return prisma.deskShare.update({
      where: { id: shareId },
      data: { status: "rejected" },
    });
  }

  /**
   * Update reserved columns for a collaborator.
   */
  async updateReservedColumns(shareId: string, columns: string[]) {
    return prisma.deskShare.update({
      where: { id: shareId },
      data: { reservedColumns: columns },
    });
  }

  /**
   * Remove a collaborator.
   */
  async removeCollaborator(shareId: string) {
    return prisma.deskShare.delete({ where: { id: shareId } });
  }

  /**
   * Get pending invites for a user email.
   */
  async getPendingInvites(email: string) {
    return prisma.deskShare.findMany({
      where: { invitedEmail: email, status: "pending" },
      include: {
        masterSheet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const teamService = new TeamService();
