"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Layers,
  FileSpreadsheet,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  History,
  Server,
  Zap,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { fetchAdminDashboardStatsAction } from "./_actions";

export default function AdminDashboardPage() {
  const router = useRouter();

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "dashboard", "metrics"],
    queryFn: () => fetchAdminDashboardStatsAction(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const metrics = response?.data;
  const kpis = metrics?.kpis;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-xs">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Executive Command Center
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0.5 px-2">
                  Live Telemetry
                </Badge>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Real-time oversight of users, enterprise workspaces, collaborative desks, and audit streams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-8 gap-1.5 shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button
            size="sm"
            onClick={() => router.push("/organizations")}
            className="text-xs h-8 gap-1.5 bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs hover:opacity-90 transition-opacity"
          >
            <Building2 className="size-3.5" />
            <span>Manage Orgs</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Users */}
        <div
          onClick={() => router.push("/users")}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-medium text-[11px] uppercase tracking-wider">Total Users</span>
            <Users className="size-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : kpis?.totalUsers}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <CheckCircle2 className="size-3" />
            <span>{kpis?.verifiedUsers || 0} Verified</span>
          </div>
        </div>

        {/* KPI 2: Organizations */}
        <div
          onClick={() => router.push("/organizations")}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-medium text-[11px] uppercase tracking-wider">Organizations</span>
            <Building2 className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : kpis?.totalOrganizations}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            <span>{kpis?.totalMembers || 0} Members enrolled</span>
          </div>
        </div>

        {/* KPI 3: Desks & Groups */}
        <div
          onClick={() => router.push("/organizations")}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-medium text-[11px] uppercase tracking-wider">Active Desks</span>
            <Layers className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : kpis?.totalDesks}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            <span>{kpis?.totalOrganizers || 0} Lead Organizers</span>
          </div>
        </div>

        {/* KPI 4: Workflows */}
        <div
          onClick={() => router.push("/analytics")}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-medium text-[11px] uppercase tracking-wider">Workflows</span>
            <FileSpreadsheet className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : kpis?.totalWorkflows}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            <span>Automation pipelines</span>
          </div>
        </div>

        {/* KPI 5: Audit Events & Health */}
        <div
          onClick={() => router.push("/logs")}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-medium text-[11px] uppercase tracking-wider">Audit Stream</span>
            <History className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : kpis?.totalAuditLogs}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            {kpis?.errorLogsCount ? (
              <span className="text-red-500 font-semibold">{kpis.errorLogsCount} Critical Errors</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">0 Errors Reported</span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Grid: Top Organizations & Infrastructure Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Registered Enterprise Workspaces */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span>Enterprise Workspaces Directory</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Top registered organizations with active desks and employee rosters.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/organizations")}
              className="text-xs h-7 gap-1 font-semibold text-neutral-600 dark:text-neutral-300"
            >
              <span>View All</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Workspace</th>
                  <th className="py-2.5 px-3 font-semibold">Owner</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Members</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Desks</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {(metrics?.topOrganizations || []).map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="size-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
                          />
                        ) : (
                          <div className="size-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {org.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono">
                            @{org.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300">
                      <span className="truncate max-w-[140px] block">{org.ownerEmail}</span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge variant="outline" className="text-xs font-mono font-medium">
                        {org.membersCount}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge variant="outline" className="text-xs font-mono font-medium">
                        {org.groupsCount}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/organizations/${org.id}`);
                        }}
                        className="text-xs h-7 text-neutral-600 hover:text-black dark:hover:text-white"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!metrics?.topOrganizations || metrics.topOrganizations.length === 0) && (
              <div className="p-8 text-center text-xs text-neutral-500">
                No organizations registered yet in the database.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Platform Health & Services Matrix */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Server className="size-4 text-emerald-500" />
              <span>Infrastructure Status</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Core platform microservices and connected databases.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    PostgreSQL Supabase Pooler
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">aws-0-ap-northeast-1:6543</div>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0">
                Connected
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Workflow Python Engine
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">localhost:8000</div>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0">
                Ready
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Cloudinary CDN Asset Engine
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">Avatar & File Uploads</div>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0">
                Operational
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Better-Auth Gateway
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">Multi-App Cookie Sessions</div>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Live Activity Stream & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Activity Stream */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <History className="size-4 text-primary" />
                <span>Cross-Platform Activity Stream</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Live audit telemetry captured from Dashboard, Org, and Admin environments.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/logs")}
              className="text-xs h-7 gap-1 font-semibold text-neutral-600 dark:text-neutral-300"
            >
              <span>Full Logs</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {(metrics?.recentActivity || []).map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-mono font-bold uppercase shrink-0 ${
                      act.source === "dashboard"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        : act.source === "org"
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600"
                    }`}
                  >
                    {act.source}
                  </Badge>

                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono truncate">
                      {act.action}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate max-w-md">
                      {act.details?.note ||
                        act.details?.message ||
                        act.details?.userEmail ||
                        act.entity}
                    </div>
                  </div>
                </div>

                <div className="text-neutral-400 font-mono text-[11px] shrink-0">
                  {new Date(act.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}

            {(!metrics?.recentActivity || metrics.recentActivity.length === 0) && (
              <div className="p-8 text-center text-xs text-neutral-500">
                No recent activity events recorded.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Latest Registered Users */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Users className="size-4 text-neutral-600" />
                <span>Recent Platform Users</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                New user registrations across all apps.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/users")}
              className="text-xs h-7 text-neutral-600"
            >
              All Users
            </Button>
          </div>

          <div className="space-y-3">
            {(metrics?.recentUsers || []).map((u) => (
              <div
                key={u.id}
                onClick={() => router.push(`/users`)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {u.image ? (
                    <img
                      src={u.image}
                      alt={u.name}
                      className="size-7 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="size-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {u.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono truncate max-w-[140px]">
                      {u.email}
                    </div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-mono font-semibold"
                >
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
