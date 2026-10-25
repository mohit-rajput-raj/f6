"use client";

import React, { useState } from "react";
import {
  Users2,
  UserPlus,
  Search,
  Trash2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import {
  useOrganizationMembers,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useJoinRequests,
  useReviewJoinRequestMutation,
} from "@/hooks/use-organization-queries";
import { TableSkeleton } from "@/components/ui/skeletons";

export default function MembersPage() {
  const { activeOrg, isOrganizer, organizerUser } = useOrg();
  const orgId = activeOrg?.id || "";

  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteDept, setInviteDept] = useState("Operations");
  const [inviteTitle, setInviteTitle] = useState("Pipeline Specialist");

  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(orgId);
  const { data: joinRequests = [], isLoading: requestsLoading } = useJoinRequests(orgId);

  const addMemberMutation = useAddMemberMutation(orgId);
  const removeMemberMutation = useRemoveMemberMutation(orgId);
  const reviewRequestMutation = useReviewJoinRequestMutation(orgId);

  if (!activeOrg) return null;

  const pendingRequests = joinRequests.filter((r: any) => r.status === "PENDING");

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    addMemberMutation.mutate(
      {
        name: inviteName.trim() || inviteEmail.split("@")[0],
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        department: inviteDept,
        title: inviteTitle,
      },
      {
        onSuccess: () => {
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteName("");
        },
      }
    );
  };

  const handleReviewRequest = (requestId: string, action: "approve" | "reject") => {
    reviewRequestMutation.mutate({
      requestId,
      action,
      reviewerName: organizerUser?.name || "Org Admin",
    });
  };

  const filteredMembers = members.filter(
    (m: any) =>
      !memberSearch ||
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.department?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.title?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 animate-in fade-in duration-200">
      {/* Tabs and Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="inline-flex rounded-xl p-1 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "members"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Users2 className="size-3.5" />
            <span>All Employees</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700">
              {members.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "requests"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Join Applications</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members by name or role..."
              className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {isOrganizer && activeTab === "members" && (
            <Button
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shrink-0"
            >
              <UserPlus className="size-3.5 mr-1.5" />
              Invite Employee
            </Button>
          )}
        </div>
      </div>

      {/* Tab 1: All Employees */}
      {activeTab === "members" && (
        <>
          {membersLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="p-3.5 font-semibold">Staff Employee</th>
                    <th className="p-3.5 font-semibold">Access Role</th>
                    <th className="p-3.5 font-semibold">Position Title</th>
                    <th className="p-3.5 font-semibold">Department</th>
                    <th className="p-3.5 font-semibold">Joined Date</th>
                    <th className="p-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400">
                        No employees found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((mem: any) => (
                      <tr
                        key={mem.id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                mem.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  mem.name || "Employee"
                                )}`
                              }
                              alt={mem.name}
                              className="size-8 rounded-full object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
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
                            className={`text-[10px] capitalize ${
                              mem.role === "owner"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : mem.role === "admin"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
                            }`}
                          >
                            {mem.role}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-neutral-700 dark:text-neutral-300">
                          {mem.title || "Specialist"}
                        </td>

                        <td className="p-3.5 text-neutral-600 dark:text-neutral-300">
                          <span className="inline-flex items-center gap-1">
                            <Building className="size-3 text-neutral-400" />
                            {mem.department || "Operations"}
                          </span>
                        </td>

                        <td className="p-3.5 text-neutral-400">
                          {mem.joinedAt ? new Date(mem.joinedAt).toLocaleDateString() : "Active"}
                        </td>

                        <td className="p-3.5 text-right">
                          {mem.role !== "owner" && isOrganizer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove ${mem.name} from this organization?`)) {
                                  removeMemberMutation.mutate(mem.id);
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                              className="text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Join Applications (Select / Reject) */}
      {activeTab === "requests" && (
        <>
          {requestsLoading ? (
            <TableSkeleton rows={5} />
          ) : joinRequests.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center space-y-3">
              <UserCheck className="size-10 text-neutral-400 mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                No Join Applications
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                When users in the Dashboard apply to join this organization, their pending applications will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((req: any) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                const isRejected = req.status === "REJECTED";

                return (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={
                          req.userAvatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            req.userName || "Applicant"
                          )}`
                        }
                        alt={req.userName}
                        className="size-10 rounded-full object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                            {req.userName}
                          </span>
                          <span className="text-xs text-neutral-400">•</span>
                          <span className="text-xs text-neutral-500">{req.userEmail}</span>
                          <Badge
                            className={`text-[10px] ml-1 ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : isRejected
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-neutral-600 dark:text-neutral-300">
                          <span className="font-semibold text-neutral-500">
                            Requested Department:
                          </span>{" "}
                          {req.department || "General Operations"}
                        </div>

                        {req.message && (
                          <p className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-lg italic">
                            &quot;{req.message}&quot;
                          </p>
                        )}

                        <div className="text-[10px] text-neutral-400">
                          Applied: {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Approve / Reject */}
                    {isPending ? (
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewRequest(req.id, "reject")}
                          disabled={reviewRequestMutation.isPending}
                          className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewRequest(req.id, "approve")}
                          disabled={reviewRequestMutation.isPending}
                          className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Select & Approve
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 self-end sm:self-center">
                        {isApproved ? "Approved as Member" : "Application Rejected"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Invite Employee */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <UserPlus className="size-4" />
                <span>Invite Employee to Organization</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Provide the employee details to grant access to departmental desks and projects.
              </p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>
                <Input
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Liam Evans"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Work Email *
                </label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="liam.evans@enterprise.io"
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full text-xs h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="member">Staff Member</option>
                    <option value="admin">Supervisor (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Department
                  </label>
                  <Input
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    placeholder="Operations"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Position Title
                </label>
                <Input
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="Pipeline Specialist"
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addMemberMutation.isPending}
                  className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  {addMemberMutation.isPending ? "Inviting..." : "Add Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
