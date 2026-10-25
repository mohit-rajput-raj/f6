"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Users,
  Crown,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  List,
  Check,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import {
  useOrganizationGroups,
  useOrganizationMembers,
  useCreateGroupMutation,
} from "@/hooks/use-organization-queries";
import { CardsGridSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function DesksPage() {
  const router = useRouter();
  const { activeOrg, isOrganizer } = useOrg();
  const orgId = activeOrg?.id || "";

  const { data: groups = [], isLoading: groupsLoading } = useOrganizationGroups(orgId);
  const { data: allMembers = [], isLoading: membersLoading } = useOrganizationMembers(orgId);
  const createGroupMutation = useCreateGroupMutation(orgId);

  const [activeTab, setActiveTab] = useState<"groups" | "allocations">("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Group Form State
  const [groupName, setGroupName] = useState("");
  const [deskName, setDeskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");

  if (!activeOrg) return null;

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const exists = prev.includes(memberId);
      const next = exists ? prev.filter((id) => id !== memberId) : [...prev, memberId];
      // If leader was unselected, clear or reset leader
      if (exists && selectedLeaderId === memberId) {
        setSelectedLeaderId(next[0] || "");
      } else if (!exists && !selectedLeaderId) {
        setSelectedLeaderId(memberId);
      }
      return next;
    });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one employee from the list for this desk group");
      return;
    }

    createGroupMutation.mutate(
      {
        name: groupName.trim(),
        deskName: deskName.trim() || `${groupName.trim()} Desk`,
        description: description.trim(),
        memberIds: selectedMemberIds,
        leaderId: selectedLeaderId || selectedMemberIds[0],
      },
      {
        onSuccess: (newGroup) => {
          setShowCreateModal(false);
          setGroupName("");
          setDeskName("");
          setDescription("");
          setSelectedMemberIds([]);
          setSelectedLeaderId("");
          // Open the newly created group list page
          router.push(`/desks/${newGroup.id}`);
        },
      }
    );
  };

  const filteredGroups = groups.filter(
    (g: any) =>
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.deskName && g.deskName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.leaderName && g.leaderName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 w-full max-w-full px-4 sm:px-6 lg:px-8 py-2">
      {/* View Switcher and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "groups"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Desk Groups & Departments</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                {groups.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("allocations")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "allocations"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <List className="size-3.5" />
              <span>Allocated Pipelines</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search desk groups..."
              className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {isOrganizer && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 shrink-0"
            >
              <Plus className="size-3.5 mr-1.5" />
              Create Desk Group
            </Button>
          )}
        </div>
      </div>

      {/* Tab 1: Desk Groups Cards (Click opens list page) */}
      {activeTab === "groups" && (
        <>
          {groupsLoading ? (
            <CardsGridSkeleton count={6} />
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center space-y-3">
              <Building2 className="size-10 text-neutral-400 mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                No Desk Groups Found
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Desk groups allow you to organize departmental pipelines, select team members, and appoint a lead.
              </p>
              {isOrganizer && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs font-semibold mt-2"
                >
                  <Plus className="size-3.5 mr-1.5" /> Create First Desk Group
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group: any) => {
                const members = group.members || [];
                return (
                  <Link
                    key={group.id}
                    href={`/desks/${group.id}`}
                    className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            {group.deskName || "Operational Desk"}
                          </span>
                          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {group.name}
                          </h3>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          {group.status || "ACTIVE"}
                        </Badge>
                      </div>

                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {group.description || "Dedicated departmental desk for institutional processes and shared workflows."}
                      </p>

                      {/* Group Leader Highlight */}
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="size-4 text-amber-500 shrink-0" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                              {group.leaderName || "No Leader Assigned"}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Desk Owner & Leader
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      {/* Member Avatars */}
                      <div className="flex items-center -space-x-2">
                        {members.slice(0, 4).map((m: any, idx: number) => (
                          <img
                            key={m.id || idx}
                            src={
                              m.avatar ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                m.name || `User ${idx}`
                              )}`
                            }
                            alt={m.name || "Member"}
                            className="size-6 rounded-full border-2 border-white dark:border-neutral-900 object-cover"
                            title={m.name}
                          />
                        ))}
                        {members.length > 4 && (
                          <div className="size-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-900 text-neutral-600 dark:text-neutral-300">
                            +{members.length - 4}
                          </div>
                        )}
                        <span className="text-xs text-neutral-500 pl-3">
                          {members.length} {members.length === 1 ? "member" : "members"}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:translate-x-0.5 transition-transform">
                        <span>View List</span>
                        <ArrowRight className="size-3.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Allocated Pipelines List View */}
      {activeTab === "allocations" && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-3.5 font-semibold">Desk Pipeline</th>
                <th className="p-3.5 font-semibold">Assigned Group</th>
                <th className="p-3.5 font-semibold">Group Leader</th>
                <th className="p-3.5 font-semibold">Team Size</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-400">
                    No desk pipelines provisioned yet.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g: any) => (
                  <tr key={g.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="p-3.5 font-semibold text-neutral-900 dark:text-neutral-100">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-neutral-400" />
                        <span>{g.deskName || g.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                      {g.name}
                    </td>
                    <td className="p-3.5 text-neutral-600 dark:text-neutral-300 font-medium">
                      {g.leaderName || "Unassigned"}
                    </td>
                    <td className="p-3.5 text-neutral-500">
                      {g.members?.length || 0} members
                    </td>
                    <td className="p-3.5">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        <CheckCircle2 className="size-3 mr-1 inline" /> {g.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link href={`/desks/${g.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          Open List <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Group for Desk */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Building2 className="size-4" />
                <span>Create Group for Desk</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Select employees from your organization roster, designate a group leader to hold ownership, and provision the desk pipeline.
              </p>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Group Name *
                  </label>
                  <Input
                    required
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value);
                      if (!deskName) setDeskName(`${e.target.value} Desk`);
                    }}
                    placeholder="e.g. Analytics & Telemetry"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Desk Pipeline Name
                  </label>
                  <Input
                    value={deskName}
                    onChange={(e) => setDeskName(e.target.value)}
                    placeholder="e.g. Analytics Desk"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the scope, deliverables, or pipeline responsibility of this desk group..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              {/* Employee Selection List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Select Employees for this Desk ({selectedMemberIds.length} selected) *
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Click to select / unselect
                  </span>
                </div>

                {membersLoading ? (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    Loading employees...
                  </div>
                ) : allMembers.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 text-center text-xs text-neutral-500">
                    No members in this organization yet. Please invite employees first from the Members tab.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50/50 dark:bg-neutral-950/40">
                    {allMembers.map((mem: any) => {
                      const isSelected = selectedMemberIds.includes(mem.id);
                      return (
                        <div
                          key={mem.id}
                          onClick={() => handleToggleMember(mem.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-xs"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`size-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                  : "border-neutral-300 dark:border-neutral-700"
                              }`}
                            >
                              {isSelected && <Check className="size-3 stroke-[3]" />}
                            </div>
                            <img
                              src={
                                mem.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  mem.name
                                )}`
                              }
                              alt={mem.name}
                              className="size-6 rounded-full object-cover"
                            />
                            <div>
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {mem.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 ml-2">
                                {mem.department || "Operations"} • {mem.title || mem.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Group Leader Designation */}
              {selectedMemberIds.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    <Crown className="size-4" />
                    <span>Appoint Group Leader (Desk Ownership) *</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Grant team lead ownership to any of the selected members:
                  </p>
                  <select
                    value={selectedLeaderId}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    className="w-full text-xs h-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {selectedMemberIds.map((id) => {
                      const member = allMembers.find((m: any) => m.id === id);
                      return (
                        <option key={id} value={id}>
                          {member?.name || id} ({member?.department || "Specialist"})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createGroupMutation.isPending || selectedMemberIds.length === 0}
                  className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  {createGroupMutation.isPending ? "Creating Group..." : "Provision Group & Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
