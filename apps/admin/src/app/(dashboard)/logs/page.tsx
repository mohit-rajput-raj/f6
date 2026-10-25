"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Code2,
  X,
  Layers,
  Building2,
  Laptop,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { fetchAuditLogsAction, type AuditLogItem } from "./_actions";

export default function LogsPage() {
  const [source, setSource] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [page, setPage] = useState(1);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | false>(15000); // 15s default
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: result,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "audit-logs", { source, level, search: debouncedSearch, dateRange, page }],
    queryFn: () =>
      fetchAuditLogsAction({
        source,
        level,
        search: debouncedSearch,
        dateRange,
        page,
        limit: 25,
      }),
    refetchInterval: autoRefreshInterval,
  });

  const logs = result?.data || [];
  const stats = result?.stats || {
    totalLogs: 0,
    dashboardCount: 0,
    orgCount: 0,
    adminCount: 0,
    errorCount: 0,
    warnCount: 0,
  };
  const pagination = result?.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-xs">
              <History className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Platform Audit Logs
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0.5 px-2">
                  Unified Ingestion
                </Badge>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Centralized observability and audit trails capturing user actions, organizational events, and administrative changes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Auto Refresh Select */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Live Stream:</span>
            <select
              value={autoRefreshInterval === false ? "off" : autoRefreshInterval}
              onChange={(e) => {
                const val = e.target.value;
                setAutoRefreshInterval(val === "off" ? false : parseInt(val, 10));
              }}
              className="h-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value="off">Paused</option>
            </select>
          </div>

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
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => {
            setSource("all");
            setLevel("all");
          }}
          className={`p-3.5 rounded-xl border bg-white dark:bg-neutral-950 shadow-xs cursor-pointer transition-all ${
            source === "all" && level === "all"
              ? "border-neutral-900 dark:border-neutral-100 ring-1 ring-neutral-900 dark:ring-neutral-100"
              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
          }`}
        >
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Total Log Volume
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : stats.totalLogs}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">Recorded platform events</p>
        </div>

        <div
          onClick={() => {
            setSource("dashboard");
            setLevel("all");
          }}
          className={`p-3.5 rounded-xl border bg-white dark:bg-neutral-950 shadow-xs cursor-pointer transition-all ${
            source === "dashboard"
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-neutral-200 dark:border-neutral-800 hover:border-blue-400"
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase tracking-wider">
            <span>Dashboard</span>
            <Laptop className="size-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {isLoading ? "..." : stats.dashboardCount}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">App events & joins</p>
        </div>

        <div
          onClick={() => {
            setSource("org");
            setLevel("all");
          }}
          className={`p-3.5 rounded-xl border bg-white dark:bg-neutral-950 shadow-xs cursor-pointer transition-all ${
            source === "org"
              ? "border-purple-500 ring-1 ring-purple-500"
              : "border-neutral-200 dark:border-neutral-800 hover:border-purple-400"
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase tracking-wider">
            <span>Org App</span>
            <Building2 className="size-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {isLoading ? "..." : stats.orgCount}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">Desks & members roster</p>
        </div>

        <div
          onClick={() => {
            setSource("admin");
            setLevel("all");
          }}
          className={`p-3.5 rounded-xl border bg-white dark:bg-neutral-950 shadow-xs cursor-pointer transition-all ${
            source === "admin"
              ? "border-amber-500 ring-1 ring-amber-500"
              : "border-neutral-200 dark:border-neutral-800 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase tracking-wider">
            <span>Admin Portal</span>
            <History className="size-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {isLoading ? "..." : stats.adminCount}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">Admin reviews & changes</p>
        </div>

        <div
          onClick={() => {
            setLevel(level === "ERROR" ? "all" : "ERROR");
          }}
          className={`p-3.5 rounded-xl border bg-white dark:bg-neutral-950 shadow-xs cursor-pointer transition-all ${
            level === "ERROR"
              ? "border-red-500 ring-1 ring-red-500"
              : "border-neutral-200 dark:border-neutral-800 hover:border-red-400"
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase tracking-wider">
            <span>Warnings & Errors</span>
            <ShieldAlert className="size-3.5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {isLoading ? "..." : stats.errorCount + stats.warnCount}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">Requires observation</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, entity, user email, or keyword..."
              className="pl-9 text-xs h-9 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-xs"
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value="all">All Time Range</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Source and Level Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Source Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] text-neutral-400 font-medium mr-1">Source:</span>
            {[
              { id: "all", label: "All Sources" },
              { id: "dashboard", label: "Dashboard" },
              { id: "org", label: "Org App" },
              { id: "admin", label: "Admin" },
              { id: "system", label: "System" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSource(s.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  source === s.id
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] text-neutral-400 font-medium mr-1">Severity:</span>
            {[
              { id: "all", label: "All" },
              { id: "INFO", label: "INFO" },
              { id: "WARN", label: "WARN" },
              { id: "ERROR", label: "ERROR" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => {
                  setLevel(lvl.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  level === lvl.id
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black font-bold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <History className="size-12 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              No audit records found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
              No audit logs matched your current filters. Clear filters or perform actions in Dashboard or Org to generate live logs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Level</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Entity</th>
                  <th className="py-3 px-4 font-semibold">Actor / User</th>
                  <th className="py-3 px-4 font-semibold">Context Preview</th>
                  <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono font-bold uppercase ${
                          log.source === "dashboard"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : log.source === "org"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                            : log.source === "admin"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {log.source}
                      </Badge>
                    </td>

                    {/* Level */}
                    <td className="py-3.5 px-4">
                      <Badge
                        className={`text-[9px] font-mono font-bold ${
                          log.level === "ERROR" || log.level === "FATAL"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                            : log.level === "WARN"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {log.level}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                      {log.action}
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                      <span className="font-medium">{log.entity}</span>
                      {log.entityId && (
                        <span className="text-[10px] text-neutral-400 font-mono ml-1 block truncate max-w-[120px]">
                          {log.entityId}
                        </span>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      {log.userEmail ? (
                        <div className="truncate max-w-[160px]">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">
                            {log.userName || log.userEmail.split("@")[0]}
                          </span>
                          <span className="block text-[10px] text-neutral-400 font-mono truncate">
                            {log.userEmail}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[11px] font-mono">system / anon</span>
                      )}
                    </td>

                    {/* Context Preview */}
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px] max-w-[200px] truncate">
                      {log.details?.note ||
                        log.details?.message ||
                        log.details?.orgName ||
                        log.details?.department ||
                        JSON.stringify(log.details || {})}
                    </td>

                    {/* Inspect Action */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
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
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing {(page - 1) * pagination.limit + 1} to{" "}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} logs
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>
              <span className="px-2 font-mono">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="h-8 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-mono font-bold"
                  >
                    {selectedLog.source}
                  </Badge>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                    {selectedLog.action}
                  </h3>
                </div>
                <div className="text-xs text-neutral-500 font-mono mt-1">
                  ID: {selectedLog.id} • {new Date(selectedLog.createdAt).toUTCString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="size-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Level</span>
                <span className="font-semibold">{selectedLog.level}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Entity</span>
                <span className="font-semibold">{selectedLog.entity}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Actor</span>
                <span className="font-semibold truncate block">{selectedLog.userEmail || "System"}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Entity ID</span>
                <span className="font-mono text-[11px] truncate block">{selectedLog.entityId || "N/A"}</span>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="font-semibold">Full Payload Details</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(JSON.stringify(selectedLog.details, null, 2))}
                  className="h-7 text-xs gap-1"
                >
                  {copiedId ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
              </div>

              <pre className="flex-1 overflow-auto p-4 rounded-xl bg-neutral-900 text-neutral-100 text-xs font-mono border border-neutral-800">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
