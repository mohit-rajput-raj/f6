"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Building2,
  Search,
  Users,
  MapPin,
  Globe,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  UserPlus,
  Clock,
  Sparkles,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  getOrganizationsDirectoryAction,
  applyToOrganizationAction,
  leaveOrganizationAction,
  type DirectoryOrg,
  type UserOrgStatus,
} from "./_actions";

export default function DashboardOrganizationsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<DirectoryOrg[]>([]);
  const [userStatuses, setUserStatuses] = useState<
    Record<string, UserOrgStatus>
  >({});
  const [selectedOrg, setSelectedOrg] = useState<DirectoryOrg | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Apply Modal State
  const [applyingOrg, setApplyingOrg] = useState<DirectoryOrg | null>(null);
  const [department, setDepartment] = useState("Operations");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load organizations from database via Server Action
  const loadDirectoryData = async () => {
    setIsLoading(true);
    try {
      const res = await getOrganizationsDirectoryAction(user?.id, user?.email);
      if (res.success) {
        setOrganizations(res.data);
        setUserStatuses(res.userStatuses);
      } else {
        toast.error(res.error || "Failed to load organizations");
      }
    } catch (err: any) {
      toast.error(
        err.message || "Failed to connect to organizations directory",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
  }, [user?.id, user?.email]);

  const handleApplyToJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOrg) return;

    if (!user) {
      toast.info(
        "Please sign in to your dashboard account to join an organization.",
      );
      return;
    }

    startTransition(async () => {
      const res = await applyToOrganizationAction({
        organizationId: applyingOrg.id,
        userId: user.id,
        userName: user.name || "Dashboard User",
        userEmail: user.email,
        userAvatar: user.image || null,
        department,
        message,
      });

      if (res.success) {
        toast.success(res.message);
        // Optimistically update status
        setUserStatuses((prev) => ({
          ...prev,
          [applyingOrg.id]: {
            isMember: Boolean(res.autoApproved),
            requestStatus: res.autoApproved ? "APPROVED" : "PENDING",
          },
        }));
        setApplyingOrg(null);
        setMessage("");
      } else {
        toast.error(res.error || "Failed to submit application");
      }
    });
  };

  const handleLeaveOrg = (org: DirectoryOrg) => {
    if (
      !confirm(
        `Are you sure you want to leave ${org.name}? You will lose access to team desk projects and workflows.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await leaveOrganizationAction(org.id, user?.id, user?.email);
      if (res.success) {
        toast.success(res.message);
        setUserStatuses((prev) => ({
          ...prev,
          [org.id]: {
            isMember: false,
            requestStatus: undefined,
          },
        }));
        setSelectedOrg(null);
        // Refresh directory to update member counts
        loadDirectoryData();
      } else {
        toast.error(res.error || "Failed to leave organization");
      }
    });
  };

  const filtered = organizations.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.tagline && o.tagline.toLowerCase().includes(q)) ||
      (o.location && o.location.toLowerCase().includes(q))
    );
  });

  const totalMembersCount = organizations.reduce(
    (acc, curr) => acc + (curr.membersCount || 0),
    0,
  );
  const totalDesksCount = organizations.reduce(
    (acc, curr) => acc + (curr.desksCount || 0),
    0,
  );
  const myJoinedCount = Object.values(userStatuses).filter(
    (s) => s.isMember,
  ).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Organizations Directory
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-medium py-0 px-2 bg-muted/40"
                >
                  Live DB
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore verified enterprise workspaces, collaborative
                departmental desks, and apply to join team pipelines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDirectoryData}
            disabled={isLoading}
            className="text-xs h-8 gap-1.5 shadow-xs"
          >
            <RefreshCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Discovery Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Verified Organizations
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? "..." : organizations.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Active institutional hubs
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Operational Desks
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? "..." : totalDesksCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Collaborative data pipelines
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Members Roster
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? "..." : totalMembersCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Across all workspaces
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Your Status
          </div>
          <div className="text-2xl font-bold text-foreground mt-1 flex items-center gap-1.5">
            <span>{myJoinedCount}</span>
            <span className="text-xs font-normal text-muted-foreground">
              Joined
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            <span>MNC Data Access</span>
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations by name, slug, tagline, or location..."
          className="pl-9 text-xs h-9 bg-card border-border shadow-xs"
        />
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-border bg-card/60 animate-pulse p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <Building2 className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No organizations found
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mt-1">
            {search
              ? `No organizations match "${search}". Try searching for another name or keyword.`
              : "No organizations have been registered in the database yet. Launch the Organization portal to create the first organization."}
          </p>
          <a
            href={
              process.env.ORG_PAGE ||
              process.env.NEXT_PUBLIC_ORG_PAGE ||
              "http://localhost:3004/register"
            }
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>Register New Organization</span>
          </a>
        </div>
      )}

      {/* Organizations Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => {
            const status = userStatuses[org.id];
            const isMember = status?.isMember;
            const reqStatus = status?.requestStatus;

            return (
              <div
                key={org.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="size-11 rounded-xl object-cover border border-border shadow-2xs"
                        />
                      ) : (
                        <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-2xs">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-foreground leading-snug">
                          {org.name}
                        </h3>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          @{org.slug}
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1.5">
                      Verified
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {org.tagline || org.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    {org.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground/70" />
                        <span className="truncate max-w-[130px]">
                          {org.location}
                        </span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3 text-muted-foreground/70" />
                      {org.membersCount} Member
                      {org.membersCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileSpreadsheet className="size-3 text-muted-foreground/70" />
                      {org.desksCount} Desk{org.desksCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  {org.website && (
                    <div className="pt-0.5">
                      <a
                        href={
                          org.website.startsWith("http")
                            ? org.website
                            : `https://${org.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary/80 hover:text-primary inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        <Globe className="size-3" />
                        <span>{org.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="size-2.5 opacity-60" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedOrg(org)}
                    className="text-xs h-8 text-muted-foreground hover:text-foreground"
                  >
                    <Info className="size-3 mr-1" /> Dossier
                  </Button>

                  {/* Dynamic Join / Membership Status */}
                  {isMember ? (
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-1 px-2.5 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="size-3" />
                        <span>Member</span>
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleLeaveOrg(org)}
                        className="text-xs h-8 border-red-500/30 text-red-500 hover:text-red-600 hover:bg-red-500/10 font-medium"
                        title="Leave this organization"
                      >
                        <LogOut className="size-3 mr-1" />
                        <span>Leave</span>
                      </Button>
                    </div>
                  ) : reqStatus === "PENDING" ? (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] py-1 px-2.5 flex items-center gap-1 font-semibold">
                      <Clock className="size-3" />
                      <span>Pending Approval</span>
                    </Badge>
                  ) : reqStatus === "REJECTED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setApplyingOrg(org)}
                      className="text-xs h-8 border-red-500/30 text-red-600 hover:bg-red-500/10 font-medium"
                    >
                      <span>Re-apply</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setApplyingOrg(org)}
                      className="text-xs h-8 bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-xs hover:opacity-90 transition-opacity"
                    >
                      <UserPlus className="size-3.5" />
                      <span>Join Org</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Dossier Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedOrg.logoUrl ? (
                  <img
                    src={selectedOrg.logoUrl}
                    alt={selectedOrg.name}
                    className="size-14 rounded-2xl object-cover border border-border shadow-xs"
                  />
                ) : (
                  <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-xs">
                    {selectedOrg.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {selectedOrg.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">
                      @{selectedOrg.slug}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0 border-emerald-500/20">
                      Verified Workspace
                    </Badge>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrg(null)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedOrg.description}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                  Location
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-muted-foreground" />
                  {selectedOrg.location || "Global Enterprise"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                  Roster & Pipeline
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedOrg.membersCount} Members • {selectedOrg.desksCount}{" "}
                  Desks
                </span>
              </div>
            </div>

            {/* Contact & Links */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {selectedOrg.website && (
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5 text-primary" />
                  <a
                    href={
                      selectedOrg.website.startsWith("http")
                        ? selectedOrg.website
                        : `https://${selectedOrg.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground hover:text-primary font-medium inline-flex items-center gap-1"
                  >
                    <span>{selectedOrg.website}</span>
                    <ExternalLink className="size-2.5 opacity-60" />
                  </a>
                </div>
              )}
              {selectedOrg.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-primary" />
                  <span>{selectedOrg.contactEmail}</span>
                </div>
              )}
              {selectedOrg.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-primary" />
                  <span>{selectedOrg.phone}</span>
                </div>
              )}
            </div>

            {/* Compliance Rules */}
            {selectedOrg.rules && selectedOrg.rules.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                  Governance & Compliance Rules
                </span>
                <div className="space-y-1.5">
                  {selectedOrg.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-card border border-border/80 text-[11px] text-muted-foreground flex items-start gap-2"
                    >
                      <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrg(null)}
                className="text-xs"
              >
                Close
              </Button>

              {userStatuses[selectedOrg.id]?.isMember && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleLeaveOrg(selectedOrg)}
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <LogOut className="size-3.5" />
                  <span>Leave Organization</span>
                </Button>
              )}

              {!userStatuses[selectedOrg.id]?.isMember &&
                userStatuses[selectedOrg.id]?.requestStatus !== "PENDING" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setApplyingOrg(selectedOrg);
                      setSelectedOrg(null);
                    }}
                    className="text-xs bg-primary text-primary-foreground font-semibold flex items-center gap-1"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Apply to Join</span>
                  </Button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apply to Join Organization */}
      {applyingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="size-4 text-primary" />
                  <span>Apply to Join {applyingOrg.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your application will be sent directly to the organization
                  administrator for review.
                </p>
              </div>
              <button
                onClick={() => setApplyingOrg(null)}
                className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleApplyToJoin} className="space-y-3.5">
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">
                  Applicant Identity
                </label>
                <div className="p-2.5 rounded-lg border border-border bg-muted/40 text-xs text-foreground flex items-center justify-between">
                  <span className="font-medium">
                    {user?.name || "Workspace Member"}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {user?.email || "Signed In"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">
                  Select Department Desk *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs h-9 rounded-lg border border-border bg-card px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Operations">Operations & Logistics</option>
                  <option value="Engineering">
                    Core Systems & Engineering
                  </option>
                  <option value="Analytics">Analytics & Data Desk</option>
                  <option value="Research">
                    Research & Quantitative Modeling
                  </option>
                  <option value="Finance">
                    Finance & Compliance Clearinghouse
                  </option>
                  <option value="Marketing">Growth & Community</option>
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">
                  Personal Statement / Role Details
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share a brief statement about your background, intended desk duties, or project focus..."
                  className="w-full rounded-lg border border-border bg-transparent p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setApplyingOrg(null)}
                  disabled={isPending}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="size-3 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
