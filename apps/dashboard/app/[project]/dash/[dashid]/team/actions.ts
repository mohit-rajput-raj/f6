"use server";

import { prisma } from "@repo/db";

function generateShareKey(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
}

/**
 * Create a shared node — generates a unique share key.
 */
export async function createSharedNode({
  creatorId,
  name,
  description,
  expectedColumns,
}: {
  creatorId: string;
  name: string;
  description?: string;
  expectedColumns: string[];
}) {
  const shareKey = generateShareKey();

  return prisma.sharedNode.create({
    data: {
      creatorId,
      shareKey,
      name,
      description,
      expectedColumns,
      status: "pending",
    },
  });
}

/**
 * Get a shared node by share key (for joining user).
 */
export async function getSharedNodeByKey(shareKey: string) {
  return prisma.sharedNode.findUnique({
    where: { shareKey },
    include: { creator: { select: { name: true, email: true } } },
  });
}

/**
 * Submit data to a shared node (the joining user fills in data).
 */
export async function submitSharedNodeData(shareKey: string, data: any) {
  const node = await prisma.sharedNode.findUnique({ where: { shareKey } });
  if (!node) throw new Error("Shared node not found");
  if (node.status === "consumed") throw new Error("This shared node has already been consumed");

  return prisma.sharedNode.update({
    where: { shareKey },
    data: {
      data,
      status: "filled",
    },
  });
}

/**
 * Consume a shared node (the creator reads the filled data).
 */
export async function consumeSharedNode(id: string, creatorId: string) {
  const node = await prisma.sharedNode.findFirst({
    where: { id, creatorId },
  });
  if (!node) throw new Error("Shared node not found or unauthorized");
  if (node.status !== "filled") throw new Error("No data available yet");

  await prisma.sharedNode.update({
    where: { id },
    data: { status: "consumed" },
  });

  return node.data;
}

/**
 * Get all shared nodes created by a user.
 */
export async function getMySharedNodes(userId: string) {
  return prisma.sharedNode.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete a shared node.
 */
export async function deleteSharedNode(id: string, userId: string) {
  const node = await prisma.sharedNode.findFirst({ where: { id, creatorId: userId } });
  if (!node) throw new Error("Not found or unauthorized");
  return prisma.sharedNode.delete({ where: { id } });
}
