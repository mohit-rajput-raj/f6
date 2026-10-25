"use client";

import React, { useState } from "react";
import {
  Building2,
  LayoutDashboard,
  Users2,
  Mail,
  Package,
  Megaphone,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Clock,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Phone,
  MapPin,
  Globe,
  Filter,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import {
  Organization,
  OrganizationMember,
  OrganizationDeskAssignment,
  OrganizationAnnouncement,
  OrganizationAsset,
  OrganizationMessage,
  updateOrganizationRecord,
  deleteOrganizationRecord,
  resetOrganizationsToDefault,
  MockUser,
} from "@/lib/organization-data";
import { ActiveNavTab } from "../layout/OrgSidebar";

interface OrganizationWorkspaceProps {
  organization: Organization;
  user: MockUser;
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onUpdateOrg: (updated: Organization) => void;
  onLeaveOrg: () => void;
}

export const OrganizationWorkspace: React.FC<OrganizationWorkspaceProps> = ({
  organization: initialOrg,
  user,
  activeTab,
  onSelectTab,
  onUpdateOrg,
  onLeaveOrg,
}) => {
  const [org, setOrg] = useState<Organization>(initialOrg);

  // Sync state if initialOrg updates
  React.useEffect(() => {
    setOrg(initialOrg);
  }, [initialOrg]);

  const updateOrgState = (updated: Organization) => {
    setOrg(updated);
    updateOrganizationRecord(updated);
    onUpdateOrg(updated);
  };

  // Messages state
  const [activeChannel, setActiveChannel] = useState<"general" | "announcements" | "staff">("general");
  const [chatInput, setChatInput] = useState("");

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [newAssigneeGroup, setNewAssigneeGroup] = useState("Operations");
  const [newAssigneeUser, setNewAssigneeUser] = useState("");

  // Announcement modal state
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState("");
  const [newAnnounceContent, setNewAnnounceContent] = useState("");
  const [newAnnouncePriority, setNewAnnouncePriority] = useState<"normal" | "urgent" | "event">("normal");

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteDept, setInviteDept] = useState("Operations");

  // Asset modal state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState<"template" | "dataset" | "guideline" | "rule">("template");
  const [newAssetDesc, setNewAssetDesc] = useState("");

  // Filters & Search
  const [memberSearch, setMemberSearch] = useState("");
  const [deskSearch, setDeskSearch] = useState("");

  // Settings form state
  const [settingsName, setSettingsName] = useState(org.name);
  const [settingsTagline, setSettingsTagline] = useState(org.tagline || "");
  const [settingsWebsite, setSettingsWebsite] = useState(org.website || "");
  const [settingsEmail, setSettingsEmail] = useState(org.contactEmail || "");
  const [settingsPhone, setSettingsPhone] = useState(org.phone || "");
  const [settingsLocation, setSettingsLocation] = useState(org.location || "");
  const [newRuleInput, setNewRuleInput] = useState("");

  const userMembership = org.members?.find(
    (m) => m.email.toLowerCase() === user.email.toLowerCase()
  );
  const isOwner =
    userMembership?.role === "owner" ||
    Boolean(org.ownerEmail && org.ownerEmail.toLowerCase() === user.email.toLowerCase()) ||
    Boolean(org.ownerId && org.ownerId === user.id);

  // Send message handler
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMsg: OrganizationMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: isOwner ? "Owner" : userMembership?.role === "admin" ? "Admin" : "Member",
      senderAvatar: user.avatar,
      content: chatInput.trim(),
      channel: activeChannel,
      timestamp: "Just now",
    };

    const updated: Organization = {
      ...org,
      messages: [...(org.messages || []), newMsg],
    };

    updateOrgState(updated);
    setChatInput("");
    toast.success("Message posted to #" + activeChannel);
  };

  // Create Desk Assignment handler
  const handleAssignDesk = () => {
    if (!newDeskName.trim()) {
      toast.error("Please enter a desk name");
      return;
    }

    const newAssignment: OrganizationDeskAssignment = {
      id: `asg-${Date.now()}`,
      deskId: `desk-${Date.now()}`,
      deskName: newDeskName.trim(),
      assignedToGroup: newAssigneeGroup,
      assignedToUserName: newAssigneeUser || "Unassigned Specialist",
      assignedAt: new Date().toISOString().split("T")[0],
      status: "active",
    };

    const updated: Organization = {
      ...org,
      assignments: [newAssignment, ...(org.assignments || [])],
    };

    updateOrgState(updated);
    setShowAssignModal(false);
    setNewDeskName("");
    setNewAssigneeUser("");
    toast.success(`Desk "${newAssignment.deskName}" allocated successfully`);
  };

  // Remove desk assignment
  const handleRemoveDesk = (deskId: string) => {
    const updated: Organization = {
      ...org,
      assignments: org.assignments.filter((a) => a.id !== deskId),
    };
    updateOrgState(updated);
    toast.info("Desk assignment removed");
  };

  // Invite member handler
  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please provide a valid member email");
      return;
    }

    if (org.members.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.error("Member is already registered in this organization");
      return;
    }

    const newMember: OrganizationMember = {
      id: `mem-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      name: inviteName.trim() || inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      title: `${inviteRole === "admin" ? "Department Supervisor" : "Pipeline Specialist"}`,
      department: inviteDept,
      joinedAt: new Date().toISOString().split("T")[0],
      avatar: "/pfpImage.png",
    };

    const updated: Organization = {
      ...org,
      members: [...org.members, newMember],
    };

    updateOrgState(updated);
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
    toast.success(`Invitation accepted! ${newMember.name} joined as ${inviteRole}.`);
  };

  // Remove member handler
  const handleRemoveMember = (memberId: string) => {
    const target = org.members.find((m) => m.id === memberId);
    if (target?.role === "owner") {
      toast.error("Cannot remove the organization owner");
      return;
    }
    const updated: Organization = {
      ...org,
      members: org.members.filter((m) => m.id !== memberId),
    };
    updateOrgState(updated);
    toast.info("Member removed from organization");
  };

  // Create announcement handler
  const handleCreateAnnouncement = () => {
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    const newAnn: OrganizationAnnouncement = {
      id: `ann-${Date.now()}`,
      title: newAnnounceTitle.trim(),
      content: newAnnounceContent.trim(),
      priority: newAnnouncePriority,
      authorName: user.name,
      authorRole: isOwner ? "Owner" : "Admin",
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated: Organization = {
      ...org,
      announcements: [newAnn, ...(org.announcements || [])],
    };

    updateOrgState(updated);
    setShowAnnounceModal(false);
    setNewAnnounceTitle("");
    setNewAnnounceContent("");
    toast.success("Broadcast announcement published to organization feed");
  };

  // Delete announcement handler
  const handleDeleteAnnouncement = (id: string) => {
    const updated: Organization = {
      ...org,
      announcements: (org.announcements || []).filter((a) => a.id !== id),
    };
    updateOrgState(updated);
    toast.info("Announcement removed");
  };

  // Add Asset handler
  const handleAddAsset = () => {
    if (!newAssetName.trim() || !newAssetDesc.trim()) {
      toast.error("Please fill in both name and description");
      return;
    }

    const newAst: OrganizationAsset = {
      id: `ast-${Date.now()}`,
      name: newAssetName.trim(),
      type: newAssetType,
      description: newAssetDesc.trim(),
      downloadsCount: 0,
      updatedAt: new Date().toISOString().split("T")[0],
    };

    const updated: Organization = {
      ...org,
      assets: [newAst, ...(org.assets || [])],
    };

    updateOrgState(updated);
    setShowAssetModal(false);
    setNewAssetName("");
    setNewAssetDesc("");
    toast.success(`Asset "${newAst.name}" published to repository`);
  };

  // Download asset simulation
  const handleDownloadAsset = (ast: OrganizationAsset) => {
    const updated: Organization = {
      ...org,
      assets: (org.assets || []).map((a) =>
        a.id === ast.id ? { ...a, downloadsCount: a.downloadsCount + 1 } : a
      ),
    };
    updateOrgState(updated);
    toast.success(`Downloading "${ast.name}" template package...`);
  };

  // Save Settings handler
  const handleSaveSettings = () => {
    const updated: Organization = {
      ...org,
      name: settingsName.trim() || org.name,
      tagline: settingsTagline.trim(),
      website: settingsWebsite.trim(),
      contactEmail: settingsEmail.trim() || org.contactEmail,
      phone: settingsPhone.trim(),
      location: settingsLocation.trim(),
    };
    updateOrgState(updated);
    toast.success("Organization profile updated");
  };

  // Add Rule handler
  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    const updated: Organization = {
      ...org,
      rules: [...(org.rules || []), newRuleInput.trim()],
    };
    updateOrgState(updated);
    setNewRuleInput("");
    toast.success("Rule added to governance policy");
  };

  const handleRemoveRule = (idx: number) => {
    const updatedRules = [...(org.rules || [])];
    updatedRules.splice(idx, 1);
    const updated: Organization = {
      ...org,
      rules: updatedRules,
    };
    updateOrgState(updated);
    toast.info("Rule removed");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ============================================================
          ORGANIZATION HEADER HERO
      ============================================================ */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.name}
                className="size-14 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
              />
            ) : (
              <div className="size-14 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-black text-xl shadow-xs">
                {org.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {org.name}
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                  <CheckCircle2 className="size-3 mr-1 inline" /> Verified Organization
                </Badge>
                {isOwner && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                    Executive Owner
                  </Badge>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl line-clamp-1">
                {org.tagline || org.description || "Enterprise workspace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("settings")}
              className="text-xs border-neutral-200 dark:border-neutral-800"
            >
              <Settings className="size-3.5 mr-1.5" />
              Settings
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
            >
              <Plus className="size-3.5 mr-1.5" />
              Assign Desk
            </Button>
          </div>
        </div>

        {/* Sub-header meta bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
          <span className="flex items-center gap-1.5">
            <Users2 className="size-3.5 text-neutral-400" />
            <strong>{org.members?.length || 0}</strong> Members
          </span>
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="size-3.5 text-neutral-400" />
            <strong>{org.assignments?.length || 0}</strong> Active Desks
          </span>
          {org.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-neutral-400" />
              {org.location}
            </span>
          )}
          {org.website && (
            <a
              href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <Globe className="size-3.5 text-neutral-400" />
              {org.website.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-3 text-neutral-400" />
            </a>
          )}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5" /> Zero-Trust Policy Active
          </span>
        </div>
      </div>

      {/* ============================================================
          TAB CONTENT SWITCHER
      ============================================================ */}

      {/* 1. DASHBOARD OVERVIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Staff Members
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
                {org.members?.length || 0}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                <span>●</span> All accounts authenticated
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Transformation Desks
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
                {org.assignments?.length || 0}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Allocated across teams
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Active Discussions
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
                {org.messages?.length || 0}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Across 3 team channels
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Master Assets
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
                {org.assets?.length || 0}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Shared schemas & sheets
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Broadcasts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Assigned Desks & Active Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Assigned Desks Panel */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-neutral-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Assigned Pipeline Desks
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTab("desks")}
                    className="text-xs text-neutral-500"
                  >
                    View All Desks
                    <ArrowUpRight className="size-3.5 ml-1" />
                  </Button>
                </div>

                {(!org.assignments || org.assignments.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                    <p className="text-xs text-neutral-500">No desks currently assigned to departments.</p>
                    <Button
                      size="sm"
                      onClick={() => setShowAssignModal(true)}
                      className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    >
                      Assign First Desk
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {org.assignments.slice(0, 4).map((asg) => (
                      <div
                        key={asg.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {asg.deskName}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Assigned to: <span className="font-medium text-neutral-600 dark:text-neutral-300">{asg.assignedToGroup}</span> ({asg.assignedToUserName})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                            {asg.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discussions Teaser */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-neutral-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Recent Team Discussion (#general)
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTab("messages")}
                    className="text-xs text-neutral-500"
                  >
                    Open Discussions
                    <ArrowUpRight className="size-3.5 ml-1" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {(org.messages || []).slice(-3).map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={msg.senderAvatar || "/pfpImage.png"}
                        alt={msg.senderName}
                        className="size-6 rounded-full object-cover shrink-0 mt-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/pfpImage.png";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Pinned Announcements & Quick Actions */}
            <div className="space-y-6">
              {/* Announcements Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="size-4 text-neutral-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Announcements
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnnounceModal(true)}
                    className="text-[11px] h-7 px-2"
                  >
                    <Plus className="size-3 mr-1" /> Post
                  </Button>
                </div>

                <div className="space-y-3">
                  {(org.announcements || []).map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {ann.title}
                        </span>
                        <Badge
                          className={`text-[9px] py-0 px-1.5 ${
                            ann.priority === "urgent"
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                          }`}
                        >
                          {ann.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                        {ann.content}
                      </p>
                      <div className="text-[10px] text-neutral-400 pt-1">
                        By {ann.authorName} · {ann.createdAt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Organization Shortcuts
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteModal(true)}
                    className="justify-start text-xs h-9 border-neutral-200 dark:border-neutral-800"
                  >
                    <UserPlus className="size-3.5 mr-2 text-neutral-500" />
                    Invite Team Member
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssetModal(true)}
                    className="justify-start text-xs h-9 border-neutral-200 dark:border-neutral-800"
                  >
                    <Package className="size-3.5 mr-2 text-neutral-500" />
                    Upload Master Template Asset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectTab("settings")}
                    className="justify-start text-xs h-9 border-neutral-200 dark:border-neutral-800"
                  >
                    <ShieldCheck className="size-3.5 mr-2 text-neutral-500" />
                    Review Governance Rules
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DESKS & PIPELINES */}
      {activeTab === "desks" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                value={deskSearch}
                onChange={(e) => setDeskSearch(e.target.value)}
                placeholder="Search assigned desks..."
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
              className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <Plus className="size-3.5 mr-1.5" />
              Assign New Desk
            </Button>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5 font-semibold">Desk Name</th>
                  <th className="p-3.5 font-semibold">Assigned Group</th>
                  <th className="p-3.5 font-semibold">Assignee Specialist</th>
                  <th className="p-3.5 font-semibold">Assigned Date</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(org.assignments || [])
                  .filter((a) => !deskSearch || a.deskName.toLowerCase().includes(deskSearch.toLowerCase()))
                  .map((asg) => (
                    <tr key={asg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                      <td className="p-3.5 font-semibold text-neutral-900 dark:text-neutral-100">
                        {asg.deskName}
                      </td>
                      <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                        {asg.assignedToGroup || "General"}
                      </td>
                      <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                        {asg.assignedToUserName || "Unassigned"}
                      </td>
                      <td className="p-3.5 text-neutral-400">
                        {asg.assignedAt}
                      </td>
                      <td className="p-3.5">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          {asg.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDesk(asg.id)}
                          className="text-xs h-7 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MEMBERS & ROLES */}
      {activeTab === "members" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search staff by name or email..."
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <UserPlus className="size-3.5 mr-1.5" />
              Invite Member
            </Button>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5 font-semibold">Member</th>
                  <th className="p-3.5 font-semibold">Role</th>
                  <th className="p-3.5 font-semibold">Title</th>
                  <th className="p-3.5 font-semibold">Department</th>
                  <th className="p-3.5 font-semibold">Joined</th>
                  <th className="p-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {org.members
                  .filter((m) =>
                    !memberSearch ||
                    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.email.toLowerCase().includes(memberSearch.toLowerCase())
                  )
                  .map((mem) => (
                    <tr key={mem.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={mem.avatar || "/pfpImage.png"}
                            alt={mem.name}
                            className="size-7 rounded-full object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/pfpImage.png";
                            }}
                          />
                          <div>
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {mem.name}
                            </div>
                            <div className="text-[11px] text-neutral-400">{mem.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] ${
                            mem.role === "owner"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : mem.role === "admin"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {mem.role}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                        {mem.title || "Specialist"}
                      </td>
                      <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                        {mem.department || "Operations"}
                      </td>
                      <td className="p-3.5 text-neutral-400">{mem.joinedAt}</td>
                      <td className="p-3.5 text-right">
                        {mem.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(mem.id)}
                            className="text-xs h-7 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DISCUSSIONS & CHANNELS */}
      {activeTab === "messages" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs h-[600px] animate-in fade-in duration-150">
          {/* Channels Sidebar */}
          <div className="border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Channels
            </div>
            <div className="space-y-1">
              {(["general", "announcements", "staff"] as const).map((chan) => (
                <button
                  key={chan}
                  onClick={() => setActiveChannel(chan)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                    activeChannel === chan
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <span>#{chan}</span>
                  <span className="text-[10px] opacity-70">
                    {(org.messages || []).filter((m) => m.channel === chan).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Feed & Input */}
          <div className="md:col-span-3 flex flex-col justify-between h-full p-4">
            {/* Header */}
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  #{activeChannel}
                </h4>
                <p className="text-[10px] text-neutral-400">
                  {activeChannel === "general"
                    ? "Organization-wide communications and real-time updates"
                    : activeChannel === "announcements"
                    ? "Critical operational notices"
                    : "Executive and administrative staff discussions"}
                </p>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {(org.messages || [])
                .filter((m) => m.channel === activeChannel)
                .map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 text-xs">
                    <img
                      src={msg.senderAvatar || "/pfpImage.png"}
                      alt={msg.senderName}
                      className="size-7 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/pfpImage.png";
                      }}
                    />
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {msg.senderName}
                        </span>
                        <Badge className="text-[9px] py-0 px-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {msg.senderRole}
                        </Badge>
                        <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Input Bar */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message #${activeChannel}...`}
                className="text-xs h-10"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                className="h-10 px-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ASSET REPOSITORY */}
      {activeTab === "assets" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Shared Master Assets & Schemas
              </h3>
              <p className="text-xs text-neutral-500">
                Download verified column mapping templates and baseline institutional datasets.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssetModal(true)}
              className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <Plus className="size-3.5 mr-1.5" />
              Upload Asset
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(org.assets || []).map((ast) => (
              <div
                key={ast.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] uppercase tracking-wider">
                      {ast.type}
                    </Badge>
                    <span className="text-[10px] text-neutral-400">
                      {ast.downloadsCount} downloads
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {ast.name}
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {ast.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">Updated {ast.updatedAt}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadAsset(ast)}
                    className="text-xs h-7"
                  >
                    <Download className="size-3 mr-1" /> Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Organization Announcements
              </h3>
              <p className="text-xs text-neutral-500">
                Institutional notices broadcasted across all registered members and desks.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAnnounceModal(true)}
              className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <Plus className="size-3.5 mr-1.5" />
              Create Announcement
            </Button>
          </div>

          <div className="space-y-3">
            {(org.announcements || []).map((ann) => (
              <div
                key={ann.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {ann.title}
                      </h4>
                      <Badge
                        className={`text-[9px] ${
                          ann.priority === "urgent"
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        }`}
                      >
                        {ann.priority}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Published by {ann.authorName} ({ann.authorRole}) · {ann.createdAt}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. SETTINGS & POLICIES */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              General Organization Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organization Name
                </label>
                <Input
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Slug
                </label>
                <Input value={org.slug} disabled className="text-xs opacity-70" />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Tagline
                </label>
                <Input
                  value={settingsTagline}
                  onChange={(e) => setSettingsTagline(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Contact Email
                </label>
                <Input
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Website
                </label>
                <Input
                  value={settingsWebsite}
                  onChange={(e) => setSettingsWebsite(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  HQ Location
                </label>
                <Input
                  value={settingsLocation}
                  onChange={(e) => setSettingsLocation(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Phone
                </label>
                <Input
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSaveSettings}
              className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              Save Profile Changes
            </Button>
          </div>

          {/* Governance Rules */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              Governance Policies & Compliance Standards
            </h3>

            <div className="space-y-2">
              {(org.rules || []).map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 text-xs"
                >
                  <span className="text-neutral-700 dark:text-neutral-300">{rule}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-xs h-7 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Add a new policy rule..."
                className="text-xs h-9"
              />
              <Button
                size="sm"
                onClick={handleAddRule}
                className="text-xs h-9 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Add Rule
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
              Danger Zone
            </h4>
            <p className="text-xs text-neutral-500">
              Actions affecting your organization membership or local workspace cache.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={onLeaveOrg}
                className="text-xs"
              >
                Leave Organization
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetOrganizationsToDefault();
                  toast.success("Reset organization directory to default institutional state");
                  window.location.reload();
                }}
                className="text-xs text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
              >
                Reset Demo Data to Factory Defaults
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODALS
      ============================================================ */}

      {/* ASSIGN DESK MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Assign Desk to Department
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Desk Title / Pipeline Name *
                </label>
                <Input
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  placeholder="e.g. Q3 Regional Ingestion MasterSheet"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Assigned Operational Group
                </label>
                <Input
                  value={newAssigneeGroup}
                  onChange={(e) => setNewAssigneeGroup(e.target.value)}
                  placeholder="Operations, Robotics, QA..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Assigned Lead Specialist
                </label>
                <Input
                  value={newAssigneeUser}
                  onChange={(e) => setNewAssigneeUser(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignDesk}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Allocate Desk
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Invite Team Member
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@domain.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name
                </label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Department
                </label>
                <Input
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  placeholder="Operations, Research, Engineering..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Role Permission
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="member" className="bg-white dark:bg-neutral-900">Member (Standard Desk Access)</option>
                  <option value="admin" className="bg-white dark:bg-neutral-900">Admin (Desk & Member Management)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInviteMember}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Create Organization Announcement
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Title *
                </label>
                <Input
                  value={newAnnounceTitle}
                  onChange={(e) => setNewAnnounceTitle(e.target.value)}
                  placeholder="e.g. Schedule Maintenance & Schema Cutover"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Content *
                </label>
                <textarea
                  value={newAnnounceContent}
                  onChange={(e) => setNewAnnounceContent(e.target.value)}
                  rows={4}
                  placeholder="Write announcement details..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Priority
                </label>
                <select
                  value={newAnnouncePriority}
                  onChange={(e) => setNewAnnouncePriority(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="normal" className="bg-white dark:bg-neutral-900">Normal Bulletin</option>
                  <option value="urgent" className="bg-white dark:bg-neutral-900">Urgent Notice</option>
                  <option value="event" className="bg-white dark:bg-neutral-900">Event / Milestone</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnnounceModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateAnnouncement}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Publish Notice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ASSET MODAL */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Publish Shared Asset
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Asset Title *
                </label>
                <Input
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="e.g. Master Financial Ledgers v2.1"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Asset Type
                </label>
                <select
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="template" className="bg-white dark:bg-neutral-900">Spreadsheet Template</option>
                  <option value="dataset" className="bg-white dark:bg-neutral-900">Benchmark Dataset</option>
                  <option value="guideline" className="bg-white dark:bg-neutral-900">Compliance Guideline</option>
                  <option value="rule" className="bg-white dark:bg-neutral-900">Rule Logic Definition</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Description *
                </label>
                <textarea
                  value={newAssetDesc}
                  onChange={(e) => setNewAssetDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the template headers, required fields, and pipeline usage..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssetModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddAsset}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Upload Asset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
