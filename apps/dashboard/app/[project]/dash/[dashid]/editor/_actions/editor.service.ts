"use server";

import { prisma } from "@repo/db";
import { createMasterSheet } from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";

export const createWorkFlow = async ({
  id,
  name,
  templateData,
}: {
  id: string;
  name: string;
  templateData?: { columns: string[]; data?: any[][] };
}) => {
  try {
    if (!id) {
      throw new Error("User not authenticated");
    }

    const newWorkflow = await prisma.workflow.create({
      data: {
        userId: id,
        name,
        definition: {
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
        tags: [],
      },
    });

    // Default template columns if templateData was not provided at all
    const columns = templateData?.columns !== undefined
      ? templateData.columns
      : ["ID", "Name", "Category", "Status", "Date"];

    const sheetData = {
      columns,
      data: templateData?.data ?? [],
    };

    // Create MasterSheet linked to this desk/workflow
    await createMasterSheet({
      userId: id,
      name: `${name} MasterSheet`,
      data: sheetData,
      metadata: { createdWithTemplate: true },
      dashid: newWorkflow.id,
    });

    return newWorkflow;
  } catch (error) {
    console.error("Failed to create workflow:", error);
    throw error;
  }
};
export async function getWorkFlow(id: string) {
  const res = await prisma.workflow.findUnique({
    where: {
      id: id,
    },
  });

  return res;
}
export async function getAllWorkFlow(id: string) {
  if (!id) return [];

  // Find user's email if available
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });

  // Find all accepted shares for this user (by invitedUserId OR by invitedEmail)
  const acceptedShares = await prisma.deskShare.findMany({
    where: {
      status: "accepted",
      OR: [
        { invitedUserId: id },
        ...(user?.email ? [{ invitedEmail: { equals: user.email, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      projectWorkflowId: true,
    },
  });

  const sharedWorkflowIds = acceptedShares
    .map((s) => s.projectWorkflowId)
    .filter((wId): wId is string => !!wId);

  // Fetch workflows owned by user OR shared with user
  const workflows = await prisma.workflow.findMany({
    where: {
      NOT: { tags: { has: "desk-block-editor" } },
      OR: [
        { userId: id },
        ...(sharedWorkflowIds.length > 0 ? [{ id: { in: sharedWorkflowIds } }] : []),
      ],
    },
    select: {
      name: true,
      id: true,
      tags: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // For each workflow, fetch collaborators via DeskShare (linked by projectWorkflowId)
  const workflowsWithMembers = await Promise.all(
    workflows.map(async (wf) => {
      const shares = await prisma.deskShare.findMany({
        where: { projectWorkflowId: wf.id, status: "accepted" },
        select: { invitedEmail: true, invitedUserId: true },
      });

      // Get owner info first so we can filter by both userId and email
      const owner = await prisma.user.findUnique({
        where: { id: wf.userId },
        select: { name: true, image: true, email: true },
      });
      const ownerEmail = owner?.email?.toLowerCase();

      // Filter out owner's self-share to prevent counting them twice
      // Match by both userId and email to cover all cases
      const collaboratorShares = shares.filter(
        (s) => s.invitedUserId !== wf.userId && s.invitedEmail.toLowerCase() !== ownerEmail
      );

      // Fetch user avatars for accepted collaborators (excluding owner)
      const userIds = collaboratorShares
        .map((s) => s.invitedUserId)
        .filter((uid): uid is string => !!uid);

      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { name: true, image: true },
          })
        : [];

      const memberAvatars = [
        ...(owner
          ? [{ name: owner.name, avatar: owner.image || "" }]
          : []),
        ...users.map((u) => ({
          name: u.name,
          avatar: u.image || "",
        })),
      ];

      // Only count non-owner collaborators
      const totalMembers = 1 + collaboratorShares.length; // owner + collaborators (excluding owner's self-share)
      const displayedCount = Math.min(memberAvatars.length, 4);
      const remaining = totalMembers - displayedCount;

      return {
        ...wf,
        users: memberAvatars.slice(0, 4),
        remainingCount: remaining > 0 ? remaining : 0,
      };
    })
  );

  return workflowsWithMembers;
}


export async function GETusers() {
  return prisma.user.findFirst();
}
export const deleteWorkFlow = async ({
  flowId,
  id,
}: {
  id: string;
  flowId: string;
}) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: flowId,
        userId: id,
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found or unauthorized");
    }

    const deleted = await prisma.workflow.delete({
      where: {
        id: flowId,
      },
    });

    return deleted;
  } catch (error) {
    console.error("Delete workflow error:", error);
    throw error;
  }
};

export const deleteMultipleWorkflows = async ({
  id,
  flowIds,
}: {
  id: string;
  flowIds: string[];
}) => {
  try {
    if (!id || !flowIds || flowIds.length === 0) return { count: 0 };

    const deleted = await prisma.workflow.deleteMany({
      where: {
        id: { in: flowIds },
        userId: id,
      },
    });

    return deleted;
  } catch (error) {
    console.error("Delete multiple workflows error:", error);
    throw error;
  }
};

export async function saveWorkflow(id: string, nodes: any[], edges: any[]) {
  try {
    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        definition: {
          reactFlow: { nodes, edges },
          meta: { updatedAt: new Date().toISOString() },
        },
      },
    });
    return updated;
  } catch (error) {
    console.error("Save workflow error:", error);
    throw error;
  }
}
