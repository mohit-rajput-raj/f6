import { prisma } from "@repo/db";

export class WorkflowService {
  /**
   * List all top-level workflows for a user (excluding desk-block-editor internals).
   */
  async listWorkflows(userId: string) {
    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        NOT: {
          tags: { has: "desk-block-editor" },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        isTemplate: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return workflows;
  }

  /**
   * Get a single workflow by ID.
   */
  async getWorkflow(workflowId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (!workflow) throw Object.assign(new Error("Workflow not found"), { statusCode: 404 });
    return workflow;
  }

  /**
   * Create a new workflow with an optional template definition.
   */
  async createWorkflow(userId: string, data: {
    name: string;
    description?: string;
    templateId?: string;
  }) {
    let definition: any = {
      meta: { version: "1.0", createdAt: new Date().toISOString() },
      reactFlow: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    };

    // If a template ID is provided, clone its definition
    if (data.templateId) {
      const template = await prisma.workflow.findUnique({
        where: { id: data.templateId },
        select: { definition: true },
      });
      if (template?.definition) {
        definition = template.definition;
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        definition,
        tags: [],
      },
    });
    return workflow;
  }

  /**
   * Update a workflow's metadata or definition.
   */
  async updateWorkflow(
    workflowId: string,
    data: {
      name?: string;
      description?: string;
      definition?: any;
      isPublic?: boolean;
      isTemplate?: boolean;
    }
  ) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (!workflow) throw Object.assign(new Error("Workflow not found"), { statusCode: 404 });

    return prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.definition !== undefined && { definition: data.definition }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isTemplate !== undefined && { isTemplate: data.isTemplate }),
      },
    });
  }

  /**
   * Delete a workflow owned by the user.
   */
  async deleteWorkflow(userId: string, workflowId: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });
    if (!workflow) throw Object.assign(new Error("Workflow not found or unauthorized"), { statusCode: 404 });

    await prisma.workflow.delete({ where: { id: workflowId } });
    return { deleted: true };
  }
}

export const workflowService = new WorkflowService();
