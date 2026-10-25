"use client";

import React, { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Layers,
  Clock,
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  Megaphone,
  FolderArchive,
  History,
  AlertTriangle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import {
  fetchOrganizationDetailAction,
  reviewJoinRequestByAdminAction,
  approveOrganizationDeletionAction,
  rejectOrganizationDeletionAction,
} from "../_actions";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [activeTab, setActiveTab] = useState<
    "members" | "groups" | "requests" | "governance" | "audit"
  >("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    data: result,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "organization", orgId],
    queryFn: () => fetchOrganizationDetailAction(orgId),
    enabled: Boolean(orgId),
  });

  const org = result?.data;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleReviewRequest = (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    startTransition(async () => {
      try {
        const res = await reviewJoinRequestByAdminAction(requestId, action);
        toast.success(res.message);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to process join request");
      }
    });
  };

  const handleApproveDeletion = () => {
    if (!org) return;
    if (
      !confirm(
        `DANGER: Are you sure you want to approve the deletion of "${org.name}"? This will PERMANENTLY destroy all desks, workflows, sheets, and members for this organization. This cannot be undone.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await approveOrganizationDeletionAction(org.id);
        toast.success(res.message);
        router.push("/organizations");
      } catch (err: any) {
        toast.error(err.message || "Failed to approve deletion");
      }
    });
  };

  const handleRejectDeletion = () => {
    if (!org) return;
    const reason = prompt(
      "Enter reason for rejecting this deletion request (optional):",
      "Declined by administration",
    );
    if (reason === null) return;

    startTransition(async () => {
      try {
        const res = await rejectOrganizationDeletionAction(
          org.id,
          "admin@campus.io",
          reason,
        );
        toast.success(res.message);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to reject deletion request");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
        <div className="h-8 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-44 rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <Building2 className="size-12 text-neutral-400 mb-3" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Organization Not Found
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          The requested organization record could not be found in the database.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/organizations")}
          className="mt-4 gap-1.5 text-xs"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Organizations</span>
        </Button>
      </div>
    );
  }

  const filteredMembers = (org.members || []).filter((m: any) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  });

  const pendingRequests = (org.joinRequests || []).filter(
    (r: any) => r.status === "PENDING",
  );

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-full">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/organizations")}
          className="text-xs gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          <span>Organizations Directory</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Organization Deletion Request Alert Banner ── */}
      {org.status === "PENDING_DELETION" && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                  Organization Deletion Requested by Organizer
                </h3>
                <Badge className="bg-red-500 text-white text-[9px] py-0 px-2 font-bold uppercase">
                  Action Required
                </Badge>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                <strong>Reason:</strong>{" "}
                {org.deletionReason || "Decommissioning requested"}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                <span>
                  Requested by:{" "}
                  <strong>{org.deletionRequestedBy || org.ownerEmail}</strong>
                </span>
                <span>•</span>
                <span>
                  Date:{" "}
                  {org.deletionRequestedAt
                    ? new Date(org.deletionRequestedAt).toLocaleString()
                    : "Recently"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleRejectDeletion}
              className="text-xs h-9 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Reject Request
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleApproveDeletion}
              className="text-xs h-9 font-semibold gap-1.5 shadow-sm"
            >
              <Trash2 className="size-3.5" />
              <span>Approve & Permanently Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="size-16 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-800 shadow-xs"
            />
          ) : (
            <div className="size-16 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-2xl shadow-xs">
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {org.name}
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0.5 px-2 font-semibold">
                Verified Enterprise Workspace
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              <span>slug: @{org.slug}</span>
              <span>•</span>
              <button
                onClick={() => handleCopy(org.id)}
                className="hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1"
                title="Copy Organization UUID"
              >
                <span>id: {org.id.substring(0, 8)}...</span>
                {copiedText === org.id ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3 opacity-60" />
                )}
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-2xl pt-1">
              {org.tagline ||
                org.description ||
                "Operational desk pipelines and shared institutional assets."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-2">
              {org.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-neutral-400" />
                  {org.location}
                </span>
              )}
              {org.website && (
                <a
                  href={
                    org.website.startsWith("http")
                      ? org.website
                      : `https://${org.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <Globe className="size-3.5" />
                  <span>{org.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              )}
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5 text-neutral-400" />
                {org.ownerEmail}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Info Box */}
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-xs shrink-0 self-stretch md:self-auto min-w-[220px]">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-2">
            Organizer / Owner
          </div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs">
              {org.owner?.name?.charAt(0).toUpperCase() || "O"}
            </div>
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                {org.owner?.name || "Organizer"}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono truncate max-w-[160px]">
                {org.owner?.email || org.ownerEmail}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Members Enrolled</span>
            <Users className="size-4" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {org.members?.length || 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Active organizational employees
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Operational Desks</span>
            <Layers className="size-4" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {org.groups?.length || 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Collaborative pipeline groups
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Pending Applications</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 flex items-center gap-2">
            <span>{pendingRequests.length}</span>
            {pendingRequests.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                Requires review
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Awaiting organizer approval
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Assets & Bulletins</span>
            <Megaphone className="size-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {(org.announcements?.length || 0) + (org.assets?.length || 0)}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Institutional documents & feeds
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto pb-px">
        {[
          {
            key: "members",
            label: `Members (${org.members?.length || 0})`,
            icon: Users,
          },
          {
            key: "groups",
            label: `Desks & Groups (${org.groups?.length || 0})`,
            icon: Layers,
          },
          {
            key: "requests",
            label: `Join Requests (${org.joinRequests?.length || 0})`,
            icon: Clock,
            badge:
              pendingRequests.length > 0 ? pendingRequests.length : undefined,
          },
          {
            key: "governance",
            label: "Governance & Settings",
            icon: ShieldCheck,
          },
          {
            key: "audit",
            label: `Audit Trail (${org.auditLogs?.length || 0})`,
            icon: History,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="size-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Members Roster */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name, email, or department..."
                className="text-xs h-9 bg-white dark:bg-neutral-950"
              />
            </div>
            <div className="text-xs text-neutral-500">
              Showing {filteredMembers.length} of {org.members?.length || 0}{" "}
              members
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredMembers.map((m: any) => (
                  <tr
                    key={m.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="size-7 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      {m.department || "Operations"}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {m.title || "Desk Operator"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono font-bold ${
                          m.role === "owner"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : m.role === "admin"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0">
                        {m.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-400 font-mono text-[11px]">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Groups & Desks */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(org.groups || []).map((grp: any) => (
              <div
                key={grp.id}
                className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      {grp.name}
                    </h3>
                    <span className="text-[11px] font-mono text-neutral-400">
                      slug: {grp.slug}
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px]">
                    {grp.status || "active"}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                    Assigned Desk Pipeline
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 mt-0.5">
                    <FileSpreadsheet className="size-3.5 text-primary" />
                    <span>{grp.deskName || "Primary Workspace Desk"}</span>
                  </span>
                </div>

                <div className="text-xs space-y-1 pt-1">
                  <span className="text-neutral-400 text-[11px] block">
                    Group Leader
                  </span>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>{grp.leaderName || "Organizer"}</span>
                    <span className="text-neutral-400 text-[11px] font-mono">
                      ({grp.leaderEmail || org.ownerEmail})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(!org.groups || org.groups.length === 0) && (
            <div className="p-8 text-center text-xs text-neutral-500 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
              No desk groups created yet in this organization.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Join Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Applicant</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Statement / Note</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Applied At</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Admin Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {(org.joinRequests || []).map((req: any) => (
                  <tr
                    key={req.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {req.userAvatar ? (
                          <img
                            src={req.userAvatar}
                            alt={req.userName}
                            className="size-7 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs">
                            {req.userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {req.userName}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {req.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                      {req.department || "Operations"}
                    </td>
                    <td
                      className="py-3.5 px-4 max-w-xs text-neutral-500 truncate"
                      title={req.message}
                    >
                      {req.message || "No statement provided"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        className={`text-[10px] ${
                          req.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : req.status === "REJECTED"
                              ? "bg-red-500/15 text-red-600 border-red-500/30"
                              : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 font-mono text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              handleReviewRequest(req.id, "approve")
                            }
                            className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() =>
                              handleReviewRequest(req.id, "reject")
                            }
                            className="text-xs h-7 text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1"
                          >
                            <XCircle className="size-3" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-400">
                          {req.reviewedBy || "Reviewed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!org.joinRequests || org.joinRequests.length === 0) && (
              <div className="p-8 text-center text-xs text-neutral-500">
                No join requests received yet for this organization.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Governance & Settings */}
      {activeTab === "governance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>Institutional Compliance Rules</span>
            </h3>
            <div className="space-y-2">
              {Array.isArray(org.rules) && org.rules.length > 0 ? (
                org.rules.map((rule: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2"
                  >
                    <span className="font-mono text-neutral-400 text-[10px] mt-0.5">
                      #{idx + 1}
                    </span>
                    <span>{rule}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-neutral-400 p-4">
                  No custom rules set.
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              Workspace Settings JSON
            </h3>
            <pre className="p-3.5 rounded-lg bg-neutral-900 text-neutral-100 text-xs font-mono overflow-x-auto">
              {JSON.stringify(org.settings || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Trail */}
      {activeTab === "audit" && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Level</th>
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Details</th>
                <th className="py-3 px-4 font-semibold text-right">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {(org.auditLogs || []).map((log: any) => (
                <tr
                  key={log.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {log.action}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={`text-[9px] ${
                        log.level === "ERROR"
                          ? "bg-red-500/15 text-red-600"
                          : log.level === "WARN"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-blue-500/15 text-blue-600"
                      }`}
                    >
                      {log.level}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {log.details?.source || "system"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 max-w-xs truncate">
                    {JSON.stringify(log.details || {})}
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!org.auditLogs || org.auditLogs.length === 0) && (
            <div className="p-8 text-center text-xs text-neutral-500">
              No audit logs captured for this organization yet.
            </div>
          )}
        </div>
      )}

      {/* ── Super Admin Danger Zone ── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="size-4" />
              <span>Permanent Organization Decommissioning</span>
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Permanently purge this organization, all group desks, workflows,
              master sheets, and audit history from the platform.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleApproveDeletion}
            className="text-xs h-9 font-semibold shrink-0 gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Organization</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
