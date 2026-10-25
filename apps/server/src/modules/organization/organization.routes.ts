import { Router } from "express";
import { organizationController } from "./organization.controller.js";

const router: Router = Router();

// ─── Organizer Auth & Session ───
router.post("/organizer/register", (req, res) => organizationController.registerOrganizer(req, res));
router.post("/organizer/login", (req, res) => organizationController.loginOrganizer(req, res));
router.get("/organizer/:id", (req, res) => organizationController.getOrganizerProfile(req, res));
router.post("/organizer/switch-active", (req, res) => organizationController.switchActiveOrg(req, res));

// ─── Organization Workspace ───
router.post("/", (req, res) => organizationController.createOrg(req, res));
router.get("/", (req, res) => organizationController.listPublicOrgs(req, res));
router.get("/details/:idOrSlug", (req, res) => organizationController.getOrgDetails(req, res));

// ─── Members & Staff ───
router.get("/:orgId/members", (req, res) => organizationController.getMembers(req, res));
router.post("/:orgId/members", (req, res) => organizationController.addMember(req, res));
router.delete("/:orgId/members/:memberId", (req, res) => organizationController.removeMember(req, res));

// ─── Groups & Desk Ownership ───
router.post("/:orgId/groups", (req, res) => organizationController.createGroup(req, res));
router.get("/groups/:groupId", (req, res) => organizationController.getGroupDetails(req, res));
router.post("/groups/:groupId/leader", (req, res) => organizationController.setGroupLeader(req, res));

// ─── Join Requests (Dashboard Applications) ───
router.post("/join-request", (req, res) => organizationController.submitJoinRequest(req, res));
router.get("/:orgId/join-requests", (req, res) => organizationController.listJoinRequests(req, res));
router.post("/join-requests/:requestId/review", (req, res) => organizationController.reviewJoinRequest(req, res));

// ─── Assets (Images & Templates) ───
router.get("/:orgId/assets", (req, res) => organizationController.listAssets(req, res));
router.post("/:orgId/assets", (req, res) => organizationController.createAsset(req, res));

// ─── Organization Projects ───
router.get("/:orgId/projects", (req, res) => organizationController.listProjects(req, res));
router.post("/:orgId/projects", (req, res) => organizationController.createProject(req, res));

// ─── User Star System ───
router.post("/stars/toggle", (req, res) => organizationController.toggleUserStar(req, res));
router.get("/stars/:userId", (req, res) => organizationController.getUserStars(req, res));

export default router;
