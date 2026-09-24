"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Copy,
  Check,
  ChevronRight,
  Users,
  ShieldCheck,
  Layers,
  Activity,
  X,
  Shield,
  Clock,
  UserCheck,
} from "lucide-react";
import { fetchUsersAction } from "./_actions";
import type { UserItem } from "@/lib/api/users";

export default function UsersPage() {
  const router = useRouter();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [emailVerified, setEmailVerified] = useState("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "workflowsCount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    search: debouncedSearch,
    role,
    emailVerified,
    joinedFrom: joinedFrom || undefined,
    joinedTo: joinedTo || undefined,
    page,
    limit,
    sortBy,
    sortOrder,
  };

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users", queryParams],
    queryFn: () => fetchUsersAction(queryParams),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const users = queryResult?.data || [];
  const stats = queryResult?.stats || {
    totalUsers: 0,
    verifiedUsers: 0,
    adminUsers: 0,
    totalWorkflows: 0,
    activeThisWeek: 0,
  };
  const totalPages = queryResult?.pagination?.totalPages || 1;
  const totalCount = queryResult?.pagination?.total || 0;

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRole("all");
    setEmailVerified("all");
    setJoinedFrom("");
    setJoinedTo("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || role !== "all" || emailVerified !== "all" || joinedFrom || joinedTo
  );

  const exportCsv = () => {
    if (users.length === 0) return;
    const headers = ["User ID", "Name", "Email", "Role", "Email Verified", "Workflows Count", "Joined Date", "Last Active"];
    const rows = users.map((u: UserItem) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.role,
      u.emailVerified ? "Yes" : "No",
      u.workflowsCount,
      new Date(u.createdAt).toISOString(),
      u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-1 md:p-2 text-neutral-900 dark:text-neutral-100">
      {/* ─── Top Enterprise Monochromatic Header ─── */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-end dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
              Identity & Access
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-600">•</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Database Platform Directory
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl dark:text-neutral-50">
            User Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Directory of registered platform accounts, access roles, identity verifications, and user assets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={users.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ─── Metric Ribbon (Primary / Neutral MNC Aesthetic) ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Registered</span>
            <Users className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.totalUsers}
            </span>
            <span className="text-xs text-neutral-500">Accounts</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            All users in Supabase auth directory
          </div>
        </div>

        {/* Verified Accounts */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Verified Accounts</span>
            <UserCheck className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.verifiedUsers}
            </span>
            <span className="text-xs text-neutral-500">
              ({stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Confirmed email verification
          </div>
        </div>

        {/* Platform Admins */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Platform Administrators</span>
            <Shield className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.adminUsers}
            </span>
            <span className="text-xs text-neutral-500">Admins</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Privileged administrative roles
          </div>
        </div>

        {/* Total Workflows */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Authored Workflows</span>
            <Layers className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.totalWorkflows}
            </span>
            <span className="text-xs text-neutral-500">Assets</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {stats.activeThisWeek} active accounts this week
          </div>
        </div>
      </div>

      {/* ─── MNC Control Bar (Search & Filters with Custom Limiter) ─── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Universal Search Input with Debounce */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Email, or User ID..."
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 py-2 pl-9 pr-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-300 dark:focus:bg-neutral-800 dark:focus:ring-neutral-300"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors & Custom Limiter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <option value="all">All Roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            {/* Verification Filter */}
            <select
              value={emailVerified}
              onChange={(e) => {
                setEmailVerified(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <option value="all">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>

            {/* Custom Limiter Dropdown */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              title="Number of users to fetch per request"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            {/* Date Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                showAdvancedFilters || joinedFrom || joinedTo
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined Date</span>
              {(joinedFrom || joinedTo) && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
              )}
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Expandable Date Range Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4 md:flex-row md:items-center dark:border-neutral-800">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Joined App Range:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={joinedFrom}
                onChange={(e) => {
                  setJoinedFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              />
              <span className="text-xs text-neutral-400">to</span>
              <input
                type="date"
                value={joinedTo}
                onChange={(e) => {
                  setJoinedTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Data Table (Enterprise Neutral / Primary Styling) ─── */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="py-3.5 pl-4 pr-3 font-semibold">User & Identity</th>
                <th className="px-3 py-3.5 font-semibold">Role</th>
                <th className="px-3 py-3.5 font-semibold">Verification</th>
                <th className="px-3 py-3.5 font-semibold text-center">Workflows</th>
                <th className="px-3 py-3.5 font-semibold">Active Sessions</th>
                <th className="px-3 py-3.5 font-semibold">Joined Platform</th>
                <th className="py-3.5 pl-3 pr-4 font-semibold text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-2.5 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4"><div className="h-4 w-14 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4 text-center"><div className="mx-auto h-4 w-6 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="py-4 pl-3 pr-4 text-right"><div className="ml-auto h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      No users found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {hasActiveFilters
                        ? "No user records match your search criteria and filters."
                        : "There are no users registered in the database."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((item: UserItem) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/users/${item.id}`)}
                    className="group cursor-pointer transition hover:bg-neutral-50/75 dark:hover:bg-neutral-800/40"
                  >
                    {/* User Identity */}
                    <td className="py-3.5 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-8 w-8 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                              {item.name}
                            </span>
                            {item.emailVerified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                            )}
                          </div>
                          <div className="truncate text-neutral-500 dark:text-neutral-400">
                            {item.email}
                          </div>
                          <div className="mt-0.5">
                            <button
                              onClick={(e) => handleCopy(item.id, e)}
                              title="Click to copy User ID"
                              className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                            >
                              <span>UID: {item.id.slice(0, 10)}...</span>
                              {copiedId === item.id ? (
                                <Check className="h-2.5 w-2.5 text-neutral-900 dark:text-neutral-100" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 text-neutral-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          item.role === "ADMIN"
                            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>

                    {/* Email Verification */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.emailVerified
                            ? "text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-400 dark:text-neutral-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.emailVerified ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                        />
                        {item.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    {/* Workflows Count */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {item.workflowsCount}
                      </span>
                    </td>

                    {/* Active Sessions */}
                    <td className="px-3 py-3.5 text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.activeSessionsCount > 0
                              ? "bg-neutral-900 dark:bg-neutral-100"
                              : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                        />
                        <span>{item.activeSessionsCount} active</span>
                      </div>
                    </td>

                    {/* Joined Platform */}
                    <td className="px-3 py-3.5 text-neutral-500 dark:text-neutral-400">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/users/${item.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3 w-3 text-neutral-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{users.length}</span> of{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalCount}</span> users
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              Previous
            </button>

            <span className="px-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
