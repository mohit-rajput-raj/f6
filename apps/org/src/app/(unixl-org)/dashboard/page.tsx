"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Mail,
  Megaphone,
  Plus,
  ArrowUpRight,
  UserPlus,
  Package,
  ShieldCheck,
  Building2,
  Users2,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import {
  useOrganizationDetails,
  useJoinRequests,
  useOrganizationGroups,
} from "@/hooks/use-organization-queries";
import { KpiCardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrg, organizerUser, isOrganizer, mounted, isLoading, allOrgs } = useOrg();
  const orgId = activeOrg?.id || "";

  // If a new organizer signs in or completes registration and has no organization yet, take them to the creation wizard
  useEffect(() => {
    if (mounted && !isLoading && !activeOrg && allOrgs.length === 0) {
      router.replace("/register-org");
    }
  }, [mounted, isLoading, activeOrg, allOrgs, router]);

  const { data: orgDetails, isLoading: detailsLoading } = useOrganizationDetails(orgId);
  const { data: joinRequests = [], isLoading: requestsLoading } = useJoinRequests(orgId);
  const { data: groups = [], isLoading: groupsLoading } = useOrganizationGroups(orgId);

  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState("");
  const [newAnnounceContent, setNewAnnounceContent] = useState("");
  const [newAnnouncePriority, setNewAnnouncePriority] = useState<"normal" | "urgent" | "event">("normal");


  if (!activeOrg) {
    return (
      <div className="max-w-md mx-auto my-auto text-center space-y-4 py-16">
        <div className="size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-600 dark:text-neutral-300">
          <Building2 className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            No Active Organization
          </h3>
          <p className="text-xs text-neutral-500">
            Select an organization from the directory or register a new one to access the executive dashboard.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link href="/explore">
            <Button variant="outline" size="sm" className="text-xs">
              Explore Directory
            </Button>
          </Link>
          <Link href="/register-org">
            <Button size="sm" className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
              Create Organization
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter((r: any) => r.status === "PENDING");
  const memberCount = orgDetails?.members?.length ?? activeOrg.members?.length ?? 1;
  const groupsCount = groups?.length ?? activeOrg.assignments?.length ?? 0;
  const assetsCount = orgDetails?.assets?.length ?? activeOrg.assets?.length ?? 0;
  const projectsCount = orgDetails?.projects?.length ?? 0;

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    toast.success("Broadcast notice published across organization channels");
    setShowAnnounceModal(false);
    setNewAnnounceTitle("");
    setNewAnnounceContent("");
  };

  return (
    <div className="space-y-6 w-full max-w-full px-4 sm:px-6 lg:px-8 py-2 animate-in fade-in duration-200">
      {/* Pending Join Requests Alert Banner for Org Admin */}
      {isOrganizer && pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 border border-border">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {pendingRequests.length} Pending Join {pendingRequests.length === 1 ? "Application" : "Applications"}
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                  Action Required
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Prospective employees have applied to join this organization from the dashboard. Review and approve or reject them.
              </p>
            </div>
          </div>

          <Link href="/members">
            <Button
              size="sm"
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <span>Review Applications</span>
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {detailsLoading || groupsLoading ? (
        <KpiCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Staff Employees
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
              {memberCount}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Active Roster
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Desk Groups
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
              {groupsCount}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              Departmental pipelines
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Master Assets
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
              {assetsCount}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              Images, schemas & datasets
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Join Applications
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
              {pendingRequests.length}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              Pending review
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Desks & Discussions + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Desk Groups Summary */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Assigned Desk Groups & Pipelines
                </h3>
              </div>
              <Link href="/desks">
                <Button variant="ghost" size="sm" className="text-xs text-neutral-500">
                  View All Desks
                  <ArrowUpRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {groups.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                <p className="text-xs text-neutral-500">No desk groups currently provisioned.</p>
                <Link href="/desks">
                  <Button
                    size="sm"
                    className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 mt-1"
                  >
                    Provision First Desk Group
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.slice(0, 4).map((g: any) => (
                  <Link
                    key={g.id}
                    href={`/desks/${g.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{g.name}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          ({g.deskName || "Desk"})
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Leader: <span className="font-medium text-neutral-600 dark:text-neutral-300">{g.leaderName || "Unassigned"}</span> • {g.members?.length || 0} members
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        {g.status || "ACTIVE"}
                      </Badge>
                      <ArrowRight className="size-3.5 text-neutral-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Discussions Summary */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Recent Team Discussions (#general)
                </h3>
              </div>
              <Link href="/messages">
                <Button variant="ghost" size="sm" className="text-xs text-neutral-500">
                  Open Discussions
                  <ArrowUpRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {(activeOrg.messages || []).slice(-3).map((msg) => (
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

        {/* Right Column: Announcements & Shortcuts */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Announcements
                </h3>
              </div>
              {isOrganizer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnnounceModal(true)}
                  className="text-[11px] h-7 px-2"
                >
                  <Plus className="size-3 mr-1" /> Post
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {(activeOrg.announcements || []).map((ann) => (
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
                  <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1">
                    <span>{ann.authorName}</span>
                    <span>{ann.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Broadcast Organization Notice
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Notice Title *</label>
                <Input
                  required
                  value={newAnnounceTitle}
                  onChange={(e) => setNewAnnounceTitle(e.target.value)}
                  placeholder="e.g. Q3 Pipeline Review"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Priority</label>
                <select
                  value={newAnnouncePriority}
                  onChange={(e: any) => setNewAnnouncePriority(e.target.value)}
                  className="w-full text-xs h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="normal">Normal Information</option>
                  <option value="urgent">Urgent Operational Notice</option>
                  <option value="event">Organization Event</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Message Content *</label>
                <textarea
                  required
                  rows={3}
                  value={newAnnounceContent}
                  onChange={(e) => setNewAnnounceContent(e.target.value)}
                  placeholder="Detailed announcement broadcast..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnnounceModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                >
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
