import { supabase } from "@repo/db";

export class WorkflowService {
  /**
   * List all top-level workflows for a user (excluding desk-block-editor internals).
   */
  async listWorkflows(userId: string) {
    const { data: workflows } = await supabase
      .from("workflow")
      .select("id, name, description, isPublic, isTemplate, tags, createdAt, updatedAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    return (workflows || []).filter(
      (wf: any) => !wf.tags || !wf.tags.includes("desk-block-editor")
    );
  }

  /**
   * Get a single workflow by ID.
   */
  async getWorkflow(workflowId: string) {
    const { data: workflow } = await supabase
      .from("workflow")
      .select("*")
      .eq("id", workflowId)
      .maybeSingle();

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

    if (data.templateId) {
      const { data: template } = await supabase
        .from("workflow")
        .select("definition")
        .eq("id", data.templateId)
        .maybeSingle();

      if (template?.definition) {
        definition = template.definition;
      }
    }

    const { data: workflow, error } = await supabase
      .from("workflow")
      .insert({
        userId,
        name: data.name,
        description: data.description,
        definition,
        tags: [],
      })
      .select()
      .single();

    if (error) throw error;
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
    const { data: workflow } = await supabase
      .from("workflow")
      .select("id")
      .eq("id", workflowId)
      .maybeSingle();

    if (!workflow) throw Object.assign(new Error("Workflow not found"), { statusCode: 404 });

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.definition !== undefined) updateData.definition = data.definition;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;

    const { data: updated, error } = await supabase
      .from("workflow")
      .update(updateData)
      .eq("id", workflowId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Delete a workflow owned by the user.
   */
  async deleteWorkflow(userId: string, workflowId: string) {
    const { data: workflow } = await supabase
      .from("workflow")
      .select("id")
      .eq("id", workflowId)
      .eq("userId", userId)
      .maybeSingle();

    if (!workflow) throw Object.assign(new Error("Workflow not found or unauthorized"), { statusCode: 404 });

    const { data: deleted, error } = await supabase
      .from("workflow")
      .delete()
      .eq("id", workflowId)
      .select()
      .single();

    if (error) throw error;
    return { deleted: true };
  }
}

export const workflowService = new WorkflowService();

