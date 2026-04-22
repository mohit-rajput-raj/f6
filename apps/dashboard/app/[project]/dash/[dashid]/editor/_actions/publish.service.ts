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

  // 2. Validate: Must have at least one WorkflowInputNode
  const inputBoundaryNodes = nodes.filter((n: any) => n.type === "WorkflowInputNode");
  const outputBoundaryNodes = nodes.filter((n: any) => n.type === "WorkflowOutputNode");

  if (inputBoundaryNodes.length === 0) {
    throw new Error(
      "Cannot publish: Add at least one 'Workflow Input' boundary node to define the input interface."
    );
  }

  // 3. Build inputSchema from WorkflowInputNode configs
  const inputSchema = inputBoundaryNodes.map((n: any) => ({
    nodeId: n.id,
    type: "WorkflowInputNode",
    label: n.data?.config?.label ?? "Input",
    dataType: n.data?.config?.dataType ?? "dataset",
    description: n.data?.config?.description ?? "",
    requiredColumns: n.data?.config?.requiredColumns ?? "",
  }));

  // 4. Build outputSchema from WorkflowOutputNode configs (may be empty)
  const outputSchema = outputBoundaryNodes.map((n: any) => ({
    nodeId: n.id,
    type: "WorkflowOutputNode",
    label: n.data?.config?.label ?? "Output",
    dataType: n.data?.config?.dataType ?? "dataset",
    description: n.data?.config?.description ?? "",
  }));

  // 5. Strip ALL runtime data from every node — keep only config, type, position
  const cleanNodes = nodes.map((n: any) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      title: n.data?.title,
      description: n.data?.description,
      type: n.data?.type,
      config: n.data?.config,         // Keep settings/config
      metadata: n.data?.metadata,
      // Everything below is stripped (runtime data):
      // result, rowCount, error, inputColumns, leftColumns, rightColumns, text
    },
  }));

  // 6. Create published workflow with ENTIRE graph
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
