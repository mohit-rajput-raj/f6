import type { Request, Response } from "express";
import { workflowService } from "../services/workflow.service.js";

export class WorkflowController {
  async list(req: Request, res: Response) {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const workflows = await workflowService.listWorkflows(userId);
    res.json({ success: true, data: workflows });
  }

  async get(req: Request, res: Response) {
    const id = req.params.id as string;
    const workflow = await workflowService.getWorkflow(id);
    res.json({ success: true, data: workflow });
  }

  async create(req: Request, res: Response) {
    const { userId, name, description, templateId } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ success: false, error: { message: "userId and name required" } });
    }

    const workflow = await workflowService.createWorkflow(userId, { name, description, templateId });
    res.status(201).json({ success: true, data: workflow });
  }

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { name, description, definition, isPublic, isTemplate } = req.body;
    const workflow = await workflowService.updateWorkflow(id, {
      name,
      description,
      definition,
      isPublic,
      isTemplate,
    });
    res.json({ success: true, data: workflow });
  }

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const result = await workflowService.deleteWorkflow(userId, id);
    res.json({ success: true, data: result });
  }
}

export const workflowController = new WorkflowController();
