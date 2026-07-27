import type { Request, Response } from "express";
import { deskService } from "../services/desk.service.js";

export class DeskController {
  async getBlocks(req: Request, res: Response) {
    const projectWorkflowId = req.params.projectWorkflowId as string;
    const blocks = await deskService.getBlocks(projectWorkflowId);
    res.json({ success: true, data: blocks });
  }

  async getBlock(req: Request, res: Response) {
    const blockId = req.params.blockId as string;
    const block = await deskService.getBlock(blockId);
    res.json({ success: true, data: block });
  }

  async reorderBlocks(req: Request, res: Response) {
    const projectWorkflowId = req.params.projectWorkflowId as string;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: { message: "orderedIds array required" } });
    }

    const result = await deskService.reorderBlocks(projectWorkflowId, orderedIds);
    res.json({ success: true, data: result });
  }

  async createBlock(req: Request, res: Response) {
    const projectWorkflowId = req.params.projectWorkflowId as string;
    const { userId, parentId, blockOrder } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const block = await deskService.createBlock(projectWorkflowId, userId, { parentId, blockOrder });
    res.status(201).json({ success: true, data: block });
  }

  async updateBlockInputs(req: Request, res: Response) {
    const blockId = req.params.blockId as string;
    const { textInputs, sheets, checkboxFields } = req.body;
    const block = await deskService.updateBlockInputs(blockId, { textInputs, sheets, checkboxFields });
    res.json({ success: true, data: block });
  }

  async updateBlockOutput(req: Request, res: Response) {
    const blockId = req.params.blockId as string;
    const { outputPreview } = req.body;
    const block = await deskService.updateBlockOutput(blockId, outputPreview);
    res.json({ success: true, data: block });
  }

  async commitToMasterSheet(req: Request, res: Response) {
    const blockId = req.params.blockId as string;
    const { masterSheetId, outputData, userEmail } = req.body;
    if (!masterSheetId || !outputData) {
      return res.status(400).json({ success: false, error: { message: "masterSheetId and outputData required" } });
    }

    const result = await deskService.commitToMasterSheet(masterSheetId, blockId, outputData, userEmail);
    res.json({ success: true, data: result });
  }

  async deleteBlock(req: Request, res: Response) {
    const blockId = req.params.blockId as string;
    const result = await deskService.deleteBlock(blockId);
    res.json({ success: true, data: result });
  }
}

export const deskController = new DeskController();
