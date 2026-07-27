"use server";

import { prisma } from "@repo/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export async function getDataLibraryFiles(dashid?: string, userId?: string) {
  const whereConditions: any[] = [];
  const userIds = new Set<string>();

  if (userId && userId.trim() !== "") {
    userIds.add(userId.trim());
  }

  if (dashid && dashid.trim() !== "") {
    const trimmedDashid = dashid.trim();
    if (isValidUuid(trimmedDashid)) {
      whereConditions.push({ workflowId: trimmedDashid });
    }

    try {
      const shares = await prisma.deskShare.findMany({
        where: { projectWorkflowId: trimmedDashid },
        select: { invitedUserId: true },
      });
      shares.forEach((s) => {
        if (s.invitedUserId) userIds.add(s.invitedUserId);
      });
    } catch (e) {
      console.warn("Could not fetch desk shares for data library:", e);
    }
  }

  if (userIds.size > 0) {
    whereConditions.push({ userId: { in: Array.from(userIds) } });
  }

  if (whereConditions.length === 0) return [];

  return prisma.dataLibraryFile.findMany({
    where: {
      OR: whereConditions,
    },
    select: {
      id: true,
      name: true,
      description: true,
      fileType: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      workflowId: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDataLibraryFile(id: string, userId?: string) {
  if (!isValidUuid(id)) return null;
  return prisma.dataLibraryFile.findFirst({
    where: { id },
  });
}

export async function createDataLibraryFile({
  userId,
  name,
  description,
  fileType,
  data,
  metadata,
  workflowId,
}: {
  userId: string;
  name: string;
  description?: string;
  fileType: string;
  data: any;
  metadata?: any;
  workflowId?: string;
}) {
  return prisma.dataLibraryFile.create({
    data: {
      userId,
      name,
      description,
      fileType,
      data,
      metadata,
      workflowId: isValidUuid(workflowId) ? workflowId : null,
    },
  });
}

export async function updateDataLibraryFile(
  id: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    data?: any;
    metadata?: any;
  }
) {
  if (!isValidUuid(id)) throw new Error("File not found");
  const file = await prisma.dataLibraryFile.findFirst({ where: { id } });
  if (!file) throw new Error("File not found");

  return prisma.dataLibraryFile.update({
    where: { id },
    data: updates,
  });
}

export async function deleteDataLibraryFile(id: string, userId?: string) {
  if (!isValidUuid(id)) throw new Error("File not found");
  const file = await prisma.dataLibraryFile.findFirst({ where: { id } });
  if (!file) throw new Error("File not found");

  return prisma.dataLibraryFile.delete({ where: { id } });
}

