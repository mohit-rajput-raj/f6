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
  TrendingUp,
  CreditCard,
  Users,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowUpDown,
  X,
} from "lucide-react";
import { fetchSubscribersAction } from "./_actions";
import type { SubscriberItem } from "@/lib/api/subscribers";

export default function SubscribersPage() {
  const router = useRouter();

  // Filter states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [subscribedFrom, setSubscribedFrom] = useState("");
  const [subscribedTo, setSubscribedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // UI helpers
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // TanStack Query with 5min staleTime
  const queryParams = {
    search: debouncedSearch,
    status,
    plan,
    joinedFrom: joinedFrom || undefined,
    joinedTo: joinedTo || undefined,
    subscribedFrom: subscribedFrom || undefined,
    subscribedTo: subscribedTo || undefined,
    page,
    limit,
  };

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "subscribers", queryParams],
    queryFn: () => fetchSubscribersAction(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh cache
    gcTime: 10 * 60 * 1000,
  });

  const subscribers = queryResult?.data || [];
  const stats = queryResult?.stats || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    trialingSubscribers: 0,
    canceledSubscribers: 0,
    totalMrr: 0,
    newThisMonth: 0,
    churnRate: "0.0%",
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
    setStatus("all");
    setPlan("all");
    setJoinedFrom("");
    setJoinedTo("");
    setSubscribedFrom("");
    setSubscribedTo("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || status !== "all" || plan !== "all" || joinedFrom || joinedTo || subscribedFrom || subscribedTo
  );

  const exportCsv = () => {
    if (subscribers.length === 0) return;
    const headers = [
      "Subscription ID",
      "User ID",
      "Name",
      "Email",
      "Plan",
      "Amount (USD)",
      "Status",
      "Joined App",
      "Subscribed At",
      "Current Period End",
    ];
    const rows = subscribers.map((s: SubscriberItem) => [
      s.subscriptionId,
      s.userId || "N/A",
      `"${s.userName}"`,
      s.userEmail,
      s.planName,
      s.amount,
      s.status,
      new Date(s.userJoinedAt).toISOString(),
      new Date(s.startedAt).toISOString(),
      new Date(s.currentPeriodEnd).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subscribers-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-1 md:p-2">
      {/* ─── Top Industrial Header ─── */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-end dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              Enterprise Billing
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">•</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              TanStack Cached • Polar Sandbox & DB Sync
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl dark:text-neutral-50">
            Subscribers & Accounts
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Comprehensive audit, revenue analytics, and member management for recurring plans.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={subscribers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ─── Metric Ribbon (Primary / Neutral Corporate Aesthetic) ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR Card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Recurring Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              ${stats.totalMrr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-neutral-500">USD/mo</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Based on active & trialing subscribers</span>
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Subscribers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.activeSubscribers}
            </span>
            <span className="text-xs text-neutral-500">of {stats.totalSubscribers} total</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Healthy status without payment flags</span>
          </div>
        </div>

        {/* Trialing Members */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Trialing Customers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.trialingSubscribers}
            </span>
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              Sandbox 30d
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>+{stats.newThisMonth} joined current month</span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Churn Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {stats.churnRate}
            </span>
            <span className="text-xs text-neutral-500">
              ({stats.canceledSubscribers} canceled)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Stable account retention</span>
          </div>
        </div>
      </div>

      {/* ─── MNC Control Bar (Search & Advanced Filters) ─── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Universal Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by User ID, Email, Name, Customer ID, or Subscription ID..."
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

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
              {["all", "active", "trialing", "canceled"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setStatus(tab);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    status === tab
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Plan Dropdown */}
            <select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <option value="all">All Plans</option>
              <option value="unixl-pro">unixl-pro ($29/mo)</option>
              <option value="unixl-max">unixl-max ($99/mo)</option>
            </select>

            {/* Limiter Dropdown */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
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
                showAdvancedFilters || joinedFrom || joinedTo || subscribedFrom || subscribedTo
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Date Filters</span>
              {(joinedFrom || joinedTo || subscribedFrom || subscribedTo) && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Advanced Date Range Expandable Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-neutral-200 pt-4 md:grid-cols-2 dark:border-neutral-800">
            {/* App Joined Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                App Joining Date (Registration)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={joinedFrom}
                  onChange={(e) => {
                    setJoinedFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  placeholder="From"
                />
                <span className="text-xs text-neutral-400">to</span>
                <input
                  type="date"
                  value={joinedTo}
                  onChange={(e) => {
                    setJoinedTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Subscription Start Date Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Subscription Start Date (Polar)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={subscribedFrom}
                  onChange={(e) => {
                    setSubscribedFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  placeholder="From"
                />
                <span className="text-xs text-neutral-400">to</span>
                <input
                  type="date"
                  value={subscribedTo}
                  onChange={(e) => {
                    setSubscribedTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Error Notification ─── */}
      {queryError && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{(queryError as any).message || "Unable to connect to the backend server. Please verify the API server is running on port 3000."}</p>
        </div>
      )}

      {/* ─── Subscribers Data Table (Enterprise Industrial Style) ─── */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="py-3.5 pl-4 pr-3 font-semibold">Subscriber & Account</th>
                <th className="px-3 py-3.5 font-semibold">Plan & Tier</th>
                <th className="px-3 py-3.5 font-semibold">Status</th>
                <th className="px-3 py-3.5 font-semibold">Subscribed Date</th>
                <th className="px-3 py-3.5 font-semibold">Next Renewal</th>
                <th className="px-3 py-3.5 font-semibold">Joined App</th>
                <th className="px-3 py-3.5 font-semibold text-center">Workflows</th>
                <th className="py-3.5 pl-3 pr-4 font-semibold text-right">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {isLoading ? (
                // Skeleton Rows
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
                    <td className="px-3 py-4"><div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4"><div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="px-3 py-4 text-center"><div className="mx-auto h-4 w-6 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                    <td className="py-4 pl-3 pr-4 text-right"><div className="ml-auto h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                  </tr>
                ))
              ) : subscribers.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      No subscribers found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {hasActiveFilters
                        ? "Try clearing or adjusting your search keywords and date ranges."
                        : "There are currently no active subscribers in the system."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                // Data rows
                subscribers.map((item: SubscriberItem) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/subscribers/${item.id}`)}
                    className="group cursor-pointer transition hover:bg-neutral-50/75 dark:hover:bg-neutral-800/40"
                  >
                    {/* User & Customer Info */}
                    <td className="py-3.5 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        {item.userAvatar ? (
                          <img
                            src={item.userAvatar}
                            alt={item.userName}
                            className="h-8 w-8 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                            {item.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                              {item.userName}
                            </span>
                            {item.emailVerified && (
                              <ShieldCheck className="h-3 w-3 text-neutral-700 dark:text-neutral-300" />
                            )}
                          </div>
                          <div className="truncate text-neutral-500 dark:text-neutral-400">
                            {item.userEmail}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            {item.userId && (
                              <button
                                onClick={(e) => handleCopy(item.userId!, e)}
                                title="Copy User ID"
                                className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                              >
                                <span>UID: {item.userId.slice(0, 8)}...</span>
                                {copiedId === item.userId ? (
                                  <Check className="h-2.5 w-2.5 text-neutral-900 dark:text-neutral-100" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 text-neutral-400" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Plan & Pricing */}
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                          {item.planName}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          ${item.amount.toFixed(2)} / {item.recurringInterval}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          item.status === "active"
                            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                            : item.status === "trialing"
                            ? "bg-neutral-100 text-neutral-800 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 font-semibold"
                            : "bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === "active"
                              ? "bg-white dark:bg-neutral-900"
                              : item.status === "trialing"
                              ? "bg-neutral-600 dark:bg-neutral-300"
                              : "bg-neutral-400"
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* Subscribed Date */}
                    <td className="px-3 py-3.5 text-neutral-600 dark:text-neutral-300">
                      {new Date(item.startedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Renewal / Period End */}
                    <td className="px-3 py-3.5 text-neutral-600 dark:text-neutral-300">
                      {item.currentPeriodEnd ? (
                        new Date(item.currentPeriodEnd).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Joined App Date */}
                    <td className="px-3 py-3.5 text-neutral-500 dark:text-neutral-400">
                      {item.userJoinedAt ? (
                        new Date(item.userJoinedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Workflows Count */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {item.workflowsCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/subscribers/${item.id}`);
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
            Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{subscribers.length}</span> of{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalCount}</span> subscribers
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
