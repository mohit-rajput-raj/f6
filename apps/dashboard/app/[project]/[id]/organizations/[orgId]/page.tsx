"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  MapPin,
  Globe,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  UserPlus,
  Clock,
  Sparkles,
  RefreshCw,
  Mail,
  Phone,
  ArrowLeft,
  LogOut,
  X,
  Layers,
  Lock,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  getOrganizationDetailsAction,
  applyToOrganizationAction,
  leaveOrganizationAction,
  type UserOrgStatus,
} from "../_actions";

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const project = params.project as string;
  const projectId = params.id as string;
  const orgId = params.orgId as string;

  const { data: session } = useSession();
  const user = session?.user;

  const [org, setOrg] = useState<any | null>(null);
  const [userStatus, setUserStatus] = useState<UserOrgStatus>({
    isMember: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [department, setDepartment] = useState("Operations");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const res = await getOrganizationDetailsAction(
        orgId,
        user?.id,
        user?.email,
      );
      if (res.success && res.data) {
        setOrg(res.data);
        if (res.userStatus) {
          setUserStatus(res.userStatus);
        }
      } else {
        toast.error(res.error || "Failed to load organization details");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to organization");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, user?.id, user?.email]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    if (!user) {
      toast.info("Please sign in to apply to an organization.");
      return;
    }

    startTransition(async () => {
      const res = await applyToOrganizationAction({
        organizationId: org.id,
        userId: user.id,
        userName: user.name || "Dashboard User",
        userEmail: user.email,
        userAvatar: user.image || null,
        department,
        message,
      });

      if (res.success) {
        toast.success(res.message);
        setUserStatus({
          isMember: Boolean(res.autoApproved),
          requestStatus: res.autoApproved ? "APPROVED" : "PENDING",
        });
        setShowApplyModal(false);
        setMessage("");
        loadData();
      } else {
        toast.error(res.error || "Failed to submit application");
      }
    });
  };

  const handleLeave = () => {
    if (!org) return;
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
        setUserStatus({ isMember: false });
        loadData();
      } else {
        toast.error(res.error || "Failed to leave organization");
      }
    });
  };

  const backUrl = `/${project}/${projectId}/organizations`;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-44 rounded-2xl bg-muted/60" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 rounded-2xl bg-muted/40" />
          <div className="h-72 rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-4 sm:p-6 md:p-8 w-full mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Organizations</span>
        </Button>

        <div className="p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/40 space-y-3">
          <Building2 className="size-10 text-muted-foreground/60 mx-auto" />
          <h2 className="text-base font-semibold text-foreground">
            Organization not found
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            This organization could not be found or may have been removed.
          </p>
          <Button
            size="sm"
            onClick={() => router.push(backUrl)}
            className="text-xs h-8"
          >
            Return to Directory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full mx-auto space-y-6 text-foreground">
      {/* ─── Back Nav ─── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 h-8 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Organizations</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs h-8 px-2.5 gap-1.5 border-border/60 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw
              className={`size-3 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── Workspace Header Card ─── */}
      <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.name}
                className="size-16 sm:size-20 rounded-2xl object-cover bg-muted border border-border/40 shrink-0 shadow-xs"
              />
            ) : (
              <div className="size-16 sm:size-20 rounded-2xl bg-foreground text-background font-bold text-2xl flex items-center justify-center shrink-0 shadow-xs">
                {org.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {org.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <ShieldCheck className="size-3" />
                  <span>Verified Workspace</span>
                </span>
              </div>

              <div className="text-xs font-mono text-muted-foreground">
                @{org.slug}
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground pt-1 max-w-2xl leading-relaxed">
                {org.tagline}
              </p>
            </div>
          </div>

          {/* ─── Apply to Join / Membership Status Action ─── */}
          <div className="shrink-0 self-start md:self-center">
            {userStatus.isMember ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted px-3.5 py-2 rounded-xl">
                  <CheckCircle2 className="size-4" />
                  <span>Active Member</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleLeave}
                  className="text-xs h-9 px-3 border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/30 rounded-xl cursor-pointer"
                >
                  <LogOut className="size-3.5 mr-1" />
                  <span>Leave</span>
                </Button>
              </div>
            ) : userStatus.requestStatus === "PENDING" ? (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted px-3.5 py-2 rounded-xl">
                <Clock className="size-4" />
                <span>Application Pending Review</span>
              </div>
            ) : userStatus.requestStatus === "REJECTED" ? (
              <Button
                onClick={() => setShowApplyModal(true)}
                className="text-xs h-9 px-4 font-medium bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-xs cursor-pointer"
              >
                <UserPlus className="size-3.5 mr-1.5" />
                <span>Re-apply to Join</span>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => setShowApplyModal(true)}
                className="text-xs sm:text-sm h-10 px-5 font-medium bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <UserPlus className="size-4" />
                <span>Apply for Join</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-border/40 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Location
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3 text-muted-foreground" />
              {org.location || "Global Enterprise"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Active Desks
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <FileSpreadsheet className="size-3 text-muted-foreground" />
              {org.desksCount} Operational Desks
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Team Roster
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <Users className="size-3 text-muted-foreground" />
              {org.membersCount} Members
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Governance
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <Lock className="size-3 text-muted-foreground" />
              RLS Audited
            </span>
          </div>
        </div>
      </div>

      {/* ─── Details Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* About Section */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              About {org.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {org.description ||
                "This organization has not provided a detailed description."}
            </p>
          </div>

          {/* Operational Desks Roster */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="size-4" />
                  <span>Operational Desks & Pipelines</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Collaborative departmental workspaces assigned to this
                  organization.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {org.desks?.length || org.desksCount} Desks
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {org.desks && org.desks.length > 0 ? (
                org.desks.map((desk: any) => (
                  <div
                    key={desk.id}
                    className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {desk.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        @{desk.slug}
                      </span>
                    </div>
                    {desk.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {desk.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
                  Active departmental desks will appear here once configured by
                  the administrator.
                </div>
              )}
            </div>
          </div>

          {/* Governance & Rules */}
          {org.rules && org.rules.length > 0 && (
            <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4" />
                <span>Governance & Compliance Rules</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                All members and departmental desks must adhere to these
                policies.
              </p>
              <div className="space-y-2 pt-1">
                {org.rules.map((rule: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/40 border border-border/30 text-xs text-muted-foreground flex items-start gap-2.5"
                  >
                    <ShieldCheck className="size-4 text-foreground shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Apply Card (CTA if not member) */}
          {!userStatus.isMember && userStatus.requestStatus !== "PENDING" && (
            <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Join Workspace
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Apply to access collaborative sheets, time-series expansion
                models, and shared pipelines.
              </p>
              <Button
                size="sm"
                onClick={() => setShowApplyModal(true)}
                className="w-full text-xs h-9 font-medium bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="size-3.5" />
                <span>Apply for Join</span>
              </Button>
            </div>
          )}

          {/* Official Contact & Links Card */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Workspace Profile
            </h4>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              {org.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="size-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={
                      org.website.startsWith("http")
                        ? org.website
                        : `https://${org.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground hover:underline font-medium inline-flex items-center gap-1 truncate"
                  >
                    <span className="truncate">
                      {org.website.replace(/^https?:\/\//, "")}
                    </span>
                    <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                  </a>
                </div>
              )}
              {org.contactEmail && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{org.contactEmail}</span>
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{org.phone}</span>
                </div>
              )}
              {org.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{org.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enterprise Security Card */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <Lock className="size-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">
                Row-Level Governance
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Workspace datasets are isolated with dedicated PostgreSQL RLS
              policies and audited immutable transaction logs.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Modal: Apply for Join ─── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="size-4 text-foreground" />
                  <span>Apply to Join {org.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your application will be sent directly to the organization
                  administrator for review.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">
                  Applicant Identity
                </label>
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/40 text-xs text-foreground flex items-center justify-between">
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
                  className="w-full text-xs h-9 rounded-lg border border-border bg-card px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
                  className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApplyModal(false)}
                  disabled={isPending}
                  className="text-xs rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
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
