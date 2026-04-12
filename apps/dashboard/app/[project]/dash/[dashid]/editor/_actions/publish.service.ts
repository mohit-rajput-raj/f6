"use server";

import { prisma } from "@repo/db";

// ─── Publish a workflow ──────────────────────────────────────
export async function publishWorkflow({
  workflowId,
  publisherId,
  name,
  description,
  icon,
  tags,
  categories,
}: {
  workflowId: string;
  publisherId: string;
  name: string;
  description?: string;
  icon?: string;
  tags?: string[];
  categories?: string[];
}) {
  // 1. Load the workflow
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new Error("Workflow not found");
  if (workflow.userId !== publisherId) throw new Error("Not authorized");

  const def = workflow.definition as any;
  const nodes = def?.reactFlow?.nodes ?? [];
  const edges = def?.reactFlow?.edges ?? [];

  // 2. Extract input/output schema from nodes
  const inputNodes = nodes.filter((n: any) =>
    ["InputFileNode", "SpreadsheetInputNode", "DataLibraryInputNode", "TextInputNode"].includes(n.type)
  );
  const outputNodes = nodes.filter((n: any) =>
    ["FileOutputNode", "OutputNode2", "baseOutput", "SheetEditorNode"].includes(n.type)
  );

  const inputSchema = inputNodes.map((n: any) => ({
    nodeId: n.id,
    type: n.type,
    title: n.data?.title ?? n.type,
  }));

  const outputSchema = outputNodes.map((n: any) => ({
    nodeId: n.id,
    type: n.type,
    title: n.data?.title ?? n.type,
  }));

  // 3. Strip runtime data from nodes before storing
  const cleanNodes = nodes.map((n: any) => ({
    ...n,
    data: {
      ...n.data,
      result: undefined,
      rowCount: undefined,
      error: undefined,
      inputColumns: undefined,
      leftColumns: undefined,
      rightColumns: undefined,
      text: undefined, // Don't share actual data
    },
  }));

  // 4. Create published workflow
  const published = await prisma.publishedWorkflow.create({
    data: {
      workflowId,
      publisherId,
      name,
      description,
      icon: icon ?? "⚡",
      tags: tags ?? [],
      categories: categories ?? [],
      definition: { nodes: cleanNodes, edges },
      inputSchema,
      outputSchema,
    },
  });

  return published;
}

// ─── List published workflows (marketplace) ─────────────────
export async function getPublishedWorkflows(filters?: {
  search?: string;
  category?: string;
}) {
  const where: any = { isPublic: true };

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  if (filters?.category) {
    where.categories = { has: filters.category };
  }

  return prisma.publishedWorkflow.findMany({
    where,
    orderBy: { downloads: "desc" },
    include: {
      publisher: { select: { name: true, image: true } },
    },
  });
}

// ─── Get a single published workflow ────────────────────────
export async function getPublishedWorkflow(id: string) {
  return prisma.publishedWorkflow.findUnique({
    where: { id },
    include: {
      publisher: { select: { name: true, image: true } },
    },
  });
}

// ─── Install a workflow ──────────────────────────────────────
export async function installWorkflow({
  publishedWorkflowId,
  userId,
}: {
  publishedWorkflowId: string;
  userId: string;
}) {
  // Check if already installed
  const existing = await prisma.workflowInstallation.findUnique({
    where: {
      userId_publishedWorkflowId: {
        userId,
        publishedWorkflowId,
      },
    },
  });

  if (existing) {
    return { alreadyInstalled: true, installation: existing };
  }

  // Create installation + increment download count
  const [installation] = await prisma.$transaction([
    prisma.workflowInstallation.create({
      data: { userId, publishedWorkflowId },
    }),
    prisma.publishedWorkflow.update({
      where: { id: publishedWorkflowId },
      data: { downloads: { increment: 1 } },
    }),
  ]);

  return { alreadyInstalled: false, installation };
}

// ─── Get user's installed workflows ──────────────────────────
export async function getInstalledWorkflows(userId: string) {
  return prisma.workflowInstallation.findMany({
    where: { userId },
    include: {
      publishedWorkflow: {
        include: {
          publisher: { select: { name: true, image: true } },
        },
      },
    },
  });
}

// ─── Get user's published workflows ──────────────────────────
export async function getMyPublishedWorkflows(userId: string) {
  return prisma.publishedWorkflow.findMany({
    where: { publisherId: userId },
    orderBy: { createdAt: "desc" },
  });
}
