"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Crown,
  UserPlus,
  Trash2,
  ShieldCheck,
  Search,
  CheckCircle2,
  Sparkles,
  Building2,
  FileSpreadsheet,
  Plus,
  ExternalLink,
  Layers,
  FolderPlus,
  FileText,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import {
  useGroupDetails,
  useOrganizationMembers,
  useSetGroupLeaderMutation,
  useAddMemberToGroupMutation,
  useRemoveMemberFromGroupMutation,
  useGroupDeskProjects,
  useCreateGroupDeskProjectMutation,
  useDeleteGroupDeskProjectMutation,
} from "@/hooks/use-organization-queries";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function GroupDetailsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId;

  const { activeOrg, isOrganizer, organizerUser, currentUser } = useOrg();
  const orgId = activeOrg?.id || "";

  const { data: group, isLoading, error } = useGroupDetails(groupId);
  const { data: allMembers = [] } = useOrganizationMembers(orgId);
  const { data: groupProjects = [], isLoading: isLoadingProjects } = useGroupDeskProjects(groupId);

  const setLeaderMutation = useSetGroupLeaderMutation(groupId, orgId);
  const addMemberMutation = useAddMemberToGroupMutation(groupId, orgId);
  const removeMemberMutation = useRemoveMemberFromGroupMutation(groupId, orgId);
  const createProjectMutation = useCreateGroupDeskProjectMutation(groupId, orgId);
  const deleteProjectMutation = useDeleteGroupDeskProjectMutation(groupId, orgId);

  // Tab State
  const [activeTab, setActiveTab] = useState<"projects" | "members">("projects");

  // Member management state
  const [searchMember, setSearchMember] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState("");
  const [showTransferLeaderModal, setShowTransferLeaderModal] = useState(false);
  const [newLeaderTargetId, setNewLeaderTargetId] = useState("");

  // Create Project Modal state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [formatTemplate, setFormatTemplate] = useState("standard");
  const [instructions, setInstructions] = useState("");

  const handleDeleteProject = (projId: string, projName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${projName}"? This will permanently remove the assigned group project and its MasterSheet.`
      )
    ) {
      return;
    }
    deleteProjectMutation.mutate(projId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        <PageHeaderSkeleton />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Desk Group Not Found
        </h2>
        <p className="text-xs text-neutral-500">
          The requested desk group may have been removed or does not exist in this organization.
        </p>
        <Link href="/desks">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="size-3.5 mr-1.5" /> Back to Desk Groups
          </Button>
        </Link>
      </div>
    );
  }

  const existingMemberIds = new Set((group.members || []).map((m: any) => m.id));
  const availableToAdd = allMembers.filter((m: any) => !existingMemberIds.has(m.id));

  const filteredMembers = (group.members || []).filter(
    (m: any) =>
      !searchMember ||
      m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.department?.toLowerCase().includes(searchMember.toLowerCase())
  );

  const handleTransferLeadership = () => {
    if (!newLeaderTargetId) {
      toast.error("Please select a group member to lead the desk group");
      return;
    }
    setLeaderMutation.mutate(newLeaderTargetId, {
      onSuccess: () => {
        setShowTransferLeaderModal(false);
        setNewLeaderTargetId("");
      },
    });
  };

  const handleAddMember = () => {
    if (!selectedNewMemberId) {
      toast.error("Please select an employee to add");
      return;
    }
    addMemberMutation.mutate(
      { memberId: selectedNewMemberId, role: "member" },
      {
        onSuccess: () => {
          setShowAddMemberModal(false);
          setSelectedNewMemberId("");
        },
      }
    );
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    createProjectMutation.mutate(
      {
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        instructions: instructions.trim() || undefined,
        formatTemplate,
        organizerEmail: organizerUser?.email || currentUser?.email || undefined,
        leaderEmail: group.leaderEmail || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateProjectModal(false);
          setProjectName("");
          setProjectDescription("");
          setInstructions("");
          setFormatTemplate("standard");
        },
      }
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full px-4 sm:px-6 lg:px-8 py-4 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/desks"
          className="inline-flex items-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          <span>Back to All Desk Groups</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
            <CheckCircle2 className="size-3 mr-1 inline" /> {group.status?.toUpperCase() || "ACTIVE"}
          </Badge>
          <span className="text-xs text-neutral-400">
            Created: {new Date(group.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Group Header Card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <Building2 className="size-3.5" />
              <span>{group.deskName || "Operational Desk"}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {group.name}
            </h1>
            <p className="text-xs text-neutral-500 max-w-2xl">
              {group.description || "Dedicated operational desk group assigned to manage departmental workflows and shared assets."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Create Project Button */}
            <Button
              size="sm"
              onClick={() => setShowCreateProjectModal(true)}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <FolderPlus className="size-3.5" />
              <span>+ Create Project for Group</span>
            </Button>

            {isOrganizer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransferLeaderModal(true)}
                className="text-xs border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5"
              >
                <Crown className="size-3.5 text-amber-500" />
                <span>Assign Leader</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setShowAddMemberModal(true)}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 flex items-center gap-1.5"
            >
              <UserPlus className="size-3.5" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        {/* Group Leader Highlight Banner */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-foreground font-bold shrink-0">
              <Crown className="size-4 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {group.leaderName || "No Designated Group Leader"}
                </span>
                <Badge variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-medium">
                  Group Leader & Desk Owner
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500">
                {group.leaderEmail || "Select an employee from the group to lead this desk."}
              </p>
            </div>
          </div>

          {isOrganizer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransferLeaderModal(true)}
              className="text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 h-8 self-start sm:self-auto"
            >
              Transfer Ownership
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-px">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "projects"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <FileSpreadsheet className="size-4" />
          <span>Desk Projects & Workspaces</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1">
            {groupProjects.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Users className="size-4" />
          <span>Group Members & Specialists</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1">
            {group.members?.length || 0}
          </Badge>
        </button>
      </div>

      {/* TAB 1: Projects & Workspaces */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Projects Given by Organization
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Workspaces, automation pipelines, and spreadsheet formats assigned to this team desk.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowCreateProjectModal(true)}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              <span>Create Project</span>
            </Button>
          </div>

          {isLoadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : groupProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 space-y-3">
              <FileSpreadsheet className="size-10 text-neutral-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  No projects assigned to this group yet
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Create the first project for this team desk so members can open the visual desk, work with formatted sheets, and build workflows.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreateProjectModal(true)}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                + Create First Group Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupProjects.map((proj: any) => (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            {proj.name}
                          </h3>
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1.5">
                            ACTIVE DESK
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          {proj.description || "Organization assigned operational desk project."}
                        </p>
                      </div>
                    </div>

                    {/* Format Badge & Instructions */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                          Sheet Format:
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                          {proj.definition?.formatTemplate || "Standard Matrix"}
                        </Badge>
                      </div>

                      {proj.definition?.instructions && (
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
                          <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{proj.definition.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
                    <span>
                      Created: {new Date(proj.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`http://localhost:3002/dashboard/dash/${proj.id}/desk`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 shadow-xs transition-opacity"
                      >
                        <span>Open Desk Editor</span>
                        <ExternalLink className="size-3" />
                      </a>

                      {isOrganizer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteProjectMutation.isPending}
                          onClick={() => handleDeleteProject(proj.id, proj.name)}
                          className="text-xs h-8 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 px-2"
                          title="Delete assigned group work"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Members & Specialists */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search group members by name or department..."
                className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <div className="text-xs text-neutral-500 flex items-center gap-2">
              <Users className="size-3.5 text-neutral-400" />
              <span>
                {filteredMembers.length} of {group.members?.length || 0} members assigned
              </span>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5 font-semibold">Employee</th>
                  <th className="p-3.5 font-semibold">Role in Group</th>
                  <th className="p-3.5 font-semibold">Department & Title</th>
                  <th className="p-3.5 font-semibold">Joined Group</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-400">
                      No employees currently in this group. Click &quot;Add Employee&quot; to assign specialists to this desk.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member: any) => {
                    const isCurrentLeader =
                      member.roleInGroup === "leader" || member.id === group.leaderId;

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                member.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  member.name || "Member"
                                )}`
                              }
                              alt={member.name}
                              className="size-8 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover"
                            />
                            <div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                                <span>{member.name}</span>
                                {isCurrentLeader && (
                                  <Crown className="size-3.5 text-amber-500" />
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-500">{member.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          {isCurrentLeader ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold">
                              Group Leader / Owner
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-neutral-500 border-neutral-200 dark:border-neutral-800">
                              Group Member
                            </Badge>
                          )}
                        </td>

                        <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                          <div>{member.title || "Specialist"}</div>
                          <span className="text-[10px] text-neutral-400">
                            {member.department || "Operations"}
                          </span>
                        </td>

                        <td className="p-3.5 text-neutral-400">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Active"}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrentLeader && isOrganizer && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setLeaderMutation.mutate(member.id);
                                }}
                                disabled={setLeaderMutation.isPending}
                                className="text-[11px] h-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              >
                                <Crown className="size-3 mr-1" />
                                Make Leader
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove ${member.name} from ${group.name}?`)) {
                                  removeMemberMutation.mutate(member.id);
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                              className="text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Project for Group */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <FolderPlus className="size-4 text-emerald-600" />
                <span>Create Group Project for {group.name}</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Set up a shared desk pipeline, spreadsheet format, and compliance instructions for team members.
              </p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Project / Pipeline Name *
                </label>
                <Input
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Regional Telemetry & Operations Ledger"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <Input
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Purpose of this desk pipeline..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  MasterSheet Format Template *
                </label>
                <select
                  value={formatTemplate}
                  onChange={(e) => setFormatTemplate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="standard">Standard MNC Format (ID, Name, Category, Status, Date)</option>
                  <option value="attendance">Student Attendance & Score Matrix</option>
                  <option value="finance">Financial Settlement & Clearing Ledger</option>
                  <option value="operations">Operational Task & Pipeline Board</option>
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Instructions & Guidelines for Team
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specify guidelines (e.g. Column formats to preserve, auto-merge policies, deadlines)..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createProjectMutation.isPending}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Employee to Group */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Add Employee to {group.name}
              </h3>
              <p className="text-xs text-neutral-500">
                Select an employee from the organization roster to assign to this desk group.
              </p>
            </div>

            {availableToAdd.length === 0 ? (
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-center text-xs text-neutral-500">
                All organization members are already assigned to this desk group.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableToAdd.map((mem: any) => (
                  <div
                    key={mem.id}
                    onClick={() => setSelectedNewMemberId(mem.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedNewMemberId === mem.id
                        ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          mem.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`
                        }
                        alt={mem.name}
                        className="size-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {mem.name}
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {mem.department || "Operations"} • {mem.title || mem.role}
                        </span>
                      </div>
                    </div>

                    <div className="size-4 rounded-full border flex items-center justify-center">
                      {selectedNewMemberId === mem.id && (
                        <div className="size-2 rounded-full bg-neutral-900 dark:bg-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedNewMemberId("");
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedNewMemberId || addMemberMutation.isPending}
                onClick={handleAddMember}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                {addMemberMutation.isPending ? "Assigning..." : "Assign to Group"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer Leadership / Ownership */}
      {showTransferLeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                <Crown className="size-4" />
                <span>Desk Group Leadership Ownership</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Select New Group Leader
              </h3>
              <p className="text-xs text-neutral-500">
                Grant ownership and lead authority for this desk group to any member below.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(group.members || []).map((mem: any) => {
                const isSelected = newLeaderTargetId === mem.id;
                const isCurrent = mem.id === group.leaderId;
                return (
                  <div
                    key={mem.id}
                    onClick={() => setNewLeaderTargetId(mem.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          mem.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`
                        }
                        alt={mem.name}
                        className="size-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <span>{mem.name}</span>
                          {isCurrent && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] px-1 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {mem.department || "Operations"} • {mem.title || "Specialist"}
                        </span>
                      </div>
                    </div>

                    <div className="size-4 rounded-full border border-neutral-400 flex items-center justify-center">
                      {isSelected && <div className="size-2 rounded-full bg-amber-500" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTransferLeaderModal(false);
                  setNewLeaderTargetId("");
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!newLeaderTargetId || setLeaderMutation.isPending}
                onClick={handleTransferLeadership}
                className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                {setLeaderMutation.isPending ? "Transferring..." : "Confirm Leadership"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
