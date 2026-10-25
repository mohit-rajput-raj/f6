import type { Request, Response } from "express";
import { organizationService } from "./organization.service.js";

export class OrganizationController {
  // Organizer Auth
  async registerOrganizer(req: Request, res: Response) {
    try {
      const result = await organizationService.registerOrganizer(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async loginOrganizer(req: Request, res: Response) {
    try {
      const result = await organizationService.loginOrganizer(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message });
    }
  }

  async getOrganizerProfile(req: Request, res: Response) {
    try {
      const organizerId = req.params.id as string;
      const result = await organizationService.getOrganizerById(organizerId);
      if (!result) {
        return res.status(404).json({ success: false, error: "Organizer not found" });
      }
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async switchActiveOrg(req: Request, res: Response) {
    try {
      const { organizerId, organizationId } = req.body;
      const result = await organizationService.switchActiveOrganization(organizerId, organizationId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Organization Workspace
  async createOrg(req: Request, res: Response) {
    try {
      const organizerId = (req.body.organizerId || req.query.organizerId) as string;
      if (!organizerId) {
        return res.status(400).json({ success: false, error: "organizerId is required" });
      }
      const result = await organizationService.createOrganization(organizerId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getOrgDetails(req: Request, res: Response) {
    try {
      const idOrSlug = req.params.idOrSlug as string;
      const result = await organizationService.getOrganizationDetails(idOrSlug);
      if (!result) {
        return res.status(404).json({ success: false, error: "Organization not found" });
      }
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listPublicOrgs(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await organizationService.listOrganizations({ search, limit });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Members
  async getMembers(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.getMembers(orgId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async addMember(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.addMember(orgId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const { orgId, memberId } = req.params as { orgId: string; memberId: string };
      const result = await organizationService.removeMember(orgId, memberId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Groups & Desk Leadership
  async createGroup(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.createGroup(orgId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getGroupDetails(req: Request, res: Response) {
    try {
      const groupId = req.params.groupId as string;
      const result = await organizationService.getGroupById(groupId);
      if (!result) {
        return res.status(404).json({ success: false, error: "Group not found" });
      }
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async setGroupLeader(req: Request, res: Response) {
    try {
      const groupId = req.params.groupId as string;
      const { newLeaderMemberId } = req.body;
      if (!newLeaderMemberId) {
        return res.status(400).json({ success: false, error: "newLeaderMemberId is required" });
      }
      const result = await organizationService.setGroupLeader(groupId, newLeaderMemberId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Join Requests
  async submitJoinRequest(req: Request, res: Response) {
    try {
      const result = await organizationService.submitJoinRequest(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async listJoinRequests(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const status = req.query.status as string | undefined;
      const result = await organizationService.listJoinRequests(orgId, status);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async reviewJoinRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId as string;
      const { action, reviewerName } = req.body;
      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ success: false, error: "action must be 'approve' or 'reject'" });
      }
      const result = await organizationService.reviewJoinRequest(requestId, action, reviewerName || "Organization Admin");
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Assets
  async listAssets(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const type = req.query.type as string | undefined;
      const result = await organizationService.listAssets(orgId, type);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createAsset(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.createAsset(orgId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Projects
  async listProjects(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.listProjects(orgId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createProject(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId as string;
      const result = await organizationService.createProject(orgId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // User Star
  async toggleUserStar(req: Request, res: Response) {
    try {
      const { userId, starredById } = req.body;
      if (!userId || !starredById) {
        return res.status(400).json({ success: false, error: "userId and starredById are required" });
      }
      const result = await organizationService.toggleUserStar(userId, starredById);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getUserStars(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const currentUserId = req.query.currentUserId as string | undefined;
      const result = await organizationService.getUserStarCount(userId, currentUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const organizationController = new OrganizationController();
