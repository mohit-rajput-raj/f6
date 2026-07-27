import type { Request, Response } from "express";
import { teamService } from "../services/team.service.js";

export class TeamController {
  async invite(req: Request, res: Response) {
    const { masterSheetId, invitedEmail, permission, reservedColumns, projectWorkflowId } = req.body;
    if (!masterSheetId || !invitedEmail) {
      return res.status(400).json({ success: false, error: { message: "masterSheetId and invitedEmail required" } });
    }

    const share = await teamService.inviteMember({
      masterSheetId,
      invitedEmail,
      permission,
      reservedColumns,
      projectWorkflowId,
    });
    res.status(201).json({ success: true, data: share });
  }

  async getCollaborators(req: Request, res: Response) {
    const masterSheetId = req.params.masterSheetId as string;
    const collaborators = await teamService.getCollaborators(masterSheetId);
    res.json({ success: true, data: collaborators });
  }

  async acceptInvite(req: Request, res: Response) {
    const shareId = req.params.shareId as string;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: { message: "userId required" } });

    const result = await teamService.acceptInvite(shareId, userId);
    res.json({ success: true, data: result });
  }

  async rejectInvite(req: Request, res: Response) {
    const shareId = req.params.shareId as string;
    const result = await teamService.rejectInvite(shareId);
    res.json({ success: true, data: result });
  }

  async updateReservedColumns(req: Request, res: Response) {
    const shareId = req.params.shareId as string;
    const { columns } = req.body;
    if (!columns) return res.status(400).json({ success: false, error: { message: "columns required" } });

    const result = await teamService.updateReservedColumns(shareId, columns);
    res.json({ success: true, data: result });
  }

  async removeCollaborator(req: Request, res: Response) {
    const shareId = req.params.shareId as string;
    const result = await teamService.removeCollaborator(shareId);
    res.json({ success: true, data: result });
  }

  async getPendingInvites(req: Request, res: Response) {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ success: false, error: { message: "email required" } });

    const invites = await teamService.getPendingInvites(email);
    res.json({ success: true, data: invites });
  }
}

export const teamController = new TeamController();
