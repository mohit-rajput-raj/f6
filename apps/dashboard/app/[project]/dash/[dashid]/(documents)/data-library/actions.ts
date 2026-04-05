"use server";

import { prisma } from "@repo/db";

export async function getDataLibraryFiles(userId: string) {
  return prisma.dataLibraryFile.findMany({
    where: { userId },
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

export async function getDataLibraryFile(id: string, userId: string) {
  return prisma.dataLibraryFile.findFirst({
    where: { id, userId },
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
      workflowId,
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
  // Verify ownership
  const file = await prisma.dataLibraryFile.findFirst({ where: { id, userId } });
  if (!file) throw new Error("File not found or unauthorized");

  return prisma.dataLibraryFile.update({
    where: { id },
    data: updates,
  });
}

export async function deleteDataLibraryFile(id: string, userId: string) {
  const file = await prisma.dataLibraryFile.findFirst({ where: { id, userId } });
  if (!file) throw new Error("File not found or unauthorized");

  return prisma.dataLibraryFile.delete({ where: { id } });
}
