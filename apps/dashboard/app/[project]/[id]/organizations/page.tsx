"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Clock,
  Sparkles,
  RefreshCw,
  X,
  ArrowRight,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  getOrganizationsDirectoryAction,
  type DirectoryOrg,
  type UserOrgStatus,
} from "./_actions";

export default function DashboardOrganizationsPage() {
  const params = useParams();
  const router = useRouter();
  const project = params.project as string;
  const projectId = params.id as string;

  const { data: session } = useSession();
  const user = session?.user;

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "available" | "joined">("all");
  const [organizations, setOrganizations] = useState<DirectoryOrg[]>([]);
  const [userStatuses, setUserStatuses] = useState<
    Record<string, UserOrgStatus>
  >({});
  const [isLoading, setIsLoading] = useState(true);

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

  const navigateToOrgDetails = (orgId: string) => {
    router.push(`/${project}/${projectId}/organizations/${orgId}`);
  };

  // Filter organizations
  const filtered = organizations.filter((o) => {
    // Search query match
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText =
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        (o.tagline && o.tagline.toLowerCase().includes(q)) ||
        (o.location && o.location.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    // Filter tab
    const isMember = userStatuses[o.id]?.isMember;
    if (filterTab === "joined") return isMember;
    if (filterTab === "available") return !isMember;
    return true;
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

  const joinedOrgs = organizations.filter(
    (org) => userStatuses[org.id]?.isMember,
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      {/* ─── Page Title & Action Bar (Clean Dual-Mode, No hardcoded dark/pink) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Organizations Directory
            </h1>
            <Badge
              variant="secondary"
              className="text-[10px] font-mono font-medium py-0.5 px-2 bg-muted text-muted-foreground border-0"
            >
              Live DB
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Explore verified enterprise workspaces, collaborative departmental desks, and team pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDirectoryData}
            disabled={isLoading}
            className="text-xs h-8.5 px-3 gap-1.5 rounded-lg border-border/60 hover:bg-muted text-foreground cursor-pointer shadow-xs"
          >
            <RefreshCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <a
            href={
              process.env.ORG_PAGE ||
              process.env.NEXT_PUBLIC_ORG_PAGE ||
              "http://localhost:3004/register"
            }
            target="_blank"
            rel="noreferrer"
          >
            <Button
              size="sm"
              className="text-xs h-8.5 px-3.5 font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Building2 className="size-3.5" />
              <span>Register Org</span>
              <ArrowUpRight className="size-3 opacity-60" />
            </Button>
          </a>
        </div>
      </div>

      {/* ─── Clean Metrics Strip (Adapts naturally to light & dark mode) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card text-card-foreground shadow-xs border border-border/40 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <Building2 className="size-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Verified Hubs
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5">
              {isLoading ? "..." : organizations.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card text-card-foreground shadow-xs border border-border/40 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <FileSpreadsheet className="size-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Active Desks
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5">
              {isLoading ? "..." : totalDesksCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card text-card-foreground shadow-xs border border-border/40 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <Users className="size-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Team Roster
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5">
              {isLoading ? "..." : totalMembersCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card text-card-foreground shadow-xs border border-border/40 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Your Joined
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5">
              {isLoading ? "..." : myJoinedCount}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Structural Layout: 2 Columns (Directory on Left, Joined & Ads on Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN: Organizations Cards (lg:col-span-8) ─── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations by name, slug, tagline, or location..."
                className="pl-9 pr-8 text-xs h-9 bg-card text-foreground placeholder:text-muted-foreground rounded-xl border-border/50 shadow-xs focus-visible:ring-1"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl shrink-0 self-start sm:self-auto border border-border/30">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  filterTab === "all"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({organizations.length})
              </button>
              <button
                onClick={() => setFilterTab("available")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  filterTab === "available"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Available ({organizations.length - myJoinedCount})
              </button>
              <button
                onClick={() => setFilterTab("joined")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  filterTab === "joined"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Joined ({myJoinedCount})
              </button>
            </div>
          </div>

          {/* Results Count Text */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing {filtered.length} of {organizations.length} workspace
              {organizations.length === 1 ? "" : "s"}
            </span>
            {search && (
              <span className="font-mono text-[11px] text-foreground">
                Query: "{search}"
              </span>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/40 bg-card p-5 space-y-4 animate-pulse shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-muted" />
                    <div className="space-y-2 flex-1">
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
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/50">
              <div className="size-11 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
                <Building2 className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No organizations found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                {search
                  ? `No workspaces match "${search}". Try searching for another keyword or location.`
                  : filterTab === "joined"
                    ? "You haven't joined any organizations yet. Switch back to 'All' or 'Available' to discover workspaces."
                    : "No organizations have been registered in the database yet. Launch the registration portal to register the first organization."}
              </p>
              {search ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="mt-4 text-xs h-8 rounded-lg"
                >
                  Clear Search Filter
                </Button>
              ) : (
                <a
                  href={
                    process.env.ORG_PAGE ||
                    process.env.NEXT_PUBLIC_ORG_PAGE ||
                    "http://localhost:3004/register"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 shadow-xs"
                >
                  <Sparkles className="size-3.5" />
                  <span>Register First Organization</span>
                </a>
              )}
            </div>
          )}

          {/* ─── Organization Cards (Clickable card navigates to /organizations/:id, No Join button) ─── */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((org) => {
                const status = userStatuses[org.id];
                const isMember = status?.isMember;
                const reqStatus = status?.requestStatus;

                return (
                  <div
                    key={org.id}
                    onClick={() => navigateToOrgDetails(org.id)}
                    className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card text-card-foreground p-5 shadow-xs hover:shadow-md hover:border-foreground/30 transition-all cursor-pointer group"
                    title={`Click to view ${org.name} details`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Logo, Name, Verified Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="size-11 rounded-xl object-cover bg-muted shrink-0 shadow-2xs border border-border/30"
                            />
                          ) : (
                            <div className="size-11 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate leading-snug group-hover:underline">
                              {org.name}
                            </h3>
                            <span className="text-[11px] font-mono text-muted-foreground block truncate">
                              @{org.slug}
                            </span>
                          </div>
                        </div>

                        {/* Neutral Verified Pill */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          <ShieldCheck className="size-3" />
                          <span>Verified</span>
                        </span>
                      </div>

                      {/* Tagline / Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                        {org.tagline || org.description}
                      </p>

                      {/* Meta Information Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {org.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                            <MapPin className="size-3 text-muted-foreground/70" />
                            <span className="truncate max-w-[120px]">
                              {org.location}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          <Users className="size-3 text-muted-foreground/70" />
                          <span>
                            {org.membersCount} Member
                            {org.membersCount === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          <FileSpreadsheet className="size-3 text-muted-foreground/70" />
                          <span>
                            {org.desksCount} Desk
                            {org.desksCount === 1 ? "" : "s"}
                          </span>
                        </span>
                      </div>

                      {/* Website Link */}
                      {org.website && (
                        <div className="pt-0.5">
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 font-medium truncate max-w-[220px]">
                            <Globe className="size-3 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{org.website.replace(/^https?:\/\//, "")}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: No Join Button! Status + View Details Indicator */}
                    <div className="pt-3.5 mt-3.5 border-t border-border/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-muted px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="size-3" />
                            <span>Member</span>
                          </span>
                        ) : reqStatus === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                            <Clock className="size-3" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {org.desksCount} Desks Available
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>View Details</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: Joined Workspaces Vertical Scroll + Dummy Ad (lg:col-span-4) ─── */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          {/* 1. Joined Organizations Panel (Right Vertical Scroll) */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-4.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-muted text-foreground flex items-center justify-center">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    My Joined Workspaces
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Active team memberships
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {joinedOrgs.length}
              </span>
            </div>

            {/* Vertical Scrollable List for Joined Organizations */}
            <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {joinedOrgs.length > 0 ? (
                joinedOrgs.map((org) => {
                  return (
                    <div
                      key={org.id}
                      onClick={() => navigateToOrgDetails(org.id)}
                      className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      title="Click to view workspace"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="size-8 rounded-lg object-cover bg-muted shrink-0"
                          />
                        ) : (
                          <div className="size-8 rounded-lg bg-foreground text-background font-bold text-xs flex items-center justify-center shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-foreground truncate group-hover:underline">
                            {org.name}
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {org.desksCount} Desks • {org.membersCount} Members
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  );
                })
              ) : (
                /* Clean Empty State when 0 orgs joined */
                <div className="p-4 rounded-xl bg-muted/30 text-center space-y-1.5">
                  <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                    <Users className="size-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-foreground">
                      No joined workspaces yet
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Click any organization card to view details and apply to join team desks.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Dummy Ads Widget (Clean, Modern Monochromatic SaaS style) */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-4.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-mono font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">
                Sponsored
              </span>
              <span className="font-mono text-muted-foreground/70">
                Ad • UNIXL Enterprise
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                UNIXL Enterprise DAG Engine
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automate spreadsheet reconciliations with deterministic visual DAGs, multi-tenant Postgres RLS, and sub-second calculation runs.
              </p>
            </div>

            {/* Ad Feature Points */}
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="size-3 text-foreground" />
                <span>Unlimited Collaborative Desks</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3 text-foreground" />
                <span>Dedicated PostgreSQL RLS & Audit Logs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3 text-foreground" />
                <span>High-Precision Syncfusion Grid Engine</span>
              </div>
            </div>

            {/* Neutral CTA */}
            <Button
              size="sm"
              onClick={() =>
                toast.info("UNIXL Enterprise: 14-day trial initiated.")
              }
              className="w-full text-xs h-8.5 font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <span>Explore Enterprise Plan</span>
              <ArrowRight className="size-3.5" />
            </Button>

            <span className="block text-center text-[10px] text-muted-foreground font-mono">
              14-day free trial • Cancel anytime
            </span>
          </div>

          {/* 3. Register Workspace Quick Helper */}
          <div className="rounded-2xl border border-border/40 bg-card text-card-foreground p-4.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <Building2 className="size-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">
                Launch Your Workspace
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Register an organization for your company or college to deploy custom departmental desks and invite team pipelines.
            </p>
            <a
              href={
                process.env.ORG_PAGE ||
                process.env.NEXT_PUBLIC_ORG_PAGE ||
                "http://localhost:3004/register"
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              <span>Register New Organization</span>
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
