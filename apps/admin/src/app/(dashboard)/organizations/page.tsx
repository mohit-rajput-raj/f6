"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Users,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  Globe,
  Mail,
  ShieldCheck,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { fetchOrganizationsAction, type AdminOrgItem } from "./_actions";

export default function OrganizationsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "membersCount">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: queryResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "admin",
      "organizations",
      { search: debouncedSearch, sortBy, sortOrder },
    ],
    queryFn: () =>
      fetchOrganizationsAction({
        search: debouncedSearch,
        sortBy,
        sortOrder,
      }),
    staleTime: 60 * 1000,
  });

  const orgs = queryResult?.data || [];
  const stats = queryResult?.stats || {
    totalOrganizations: 0,
    totalMembers: 0,
    totalDesks: 0,
    totalPendingRequests: 0,
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Enterprise Organizations
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-medium py-0 px-2 bg-neutral-100 dark:bg-neutral-900"
                >
                  Platform Registry
                </Badge>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage registered institutional workspaces, departmental desks,
                and global member allocations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Workspaces
            </span>
            <Building2 className="size-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : stats.totalOrganizations}
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Registered organizations
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Enrolled Members
            </span>
            <Users className="size-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : stats.totalMembers}
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Across all workspaces
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Operational Desks
            </span>
            <Layers className="size-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {isLoading ? "..." : stats.totalDesks}
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Collaborative pipeline groups
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Join Applications
            </span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 flex items-center gap-1.5">
            <span>{isLoading ? "..." : stats.totalPendingRequests}</span>
            {stats.totalPendingRequests > 0 && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                Action Req
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Pending administrative review
          </p>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by organization name, slug, owner, or location..."
            className="pl-9 text-xs h-9 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="name">Sort: Name</option>
            <option value="membersCount">Sort: Members Count</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="text-xs h-9"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>
        </div>
      </div>

      {/* Organizations Table / List */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse"
              />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="size-12 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              No organizations found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
              {debouncedSearch
                ? `No organizations match "${debouncedSearch}".`
                : "No organizations have been created in the database yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Owner Contact</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Members
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">Desks</th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Pending Req
                  </th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {orgs.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                  >
                    {/* Name & Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="size-9 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="size-9 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {org.name}
                            </span>
                            {org.status === "PENDING_DELETION" ? (
                              <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[9px] py-0 px-1.5 font-bold animate-pulse">
                                Deletion Requested
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                            <span>@{org.slug}</span>
                            <button
                              onClick={(e) => handleCopy(org.id, e)}
                              className="hover:text-neutral-900 dark:hover:text-neutral-100"
                              title="Copy ID"
                            >
                              {copiedId === org.id ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3 opacity-60" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                        <Mail className="size-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {org.ownerEmail}
                        </span>
                      </div>
                    </td>

                    {/* Location & Website */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                          <MapPin className="size-3 text-neutral-400 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {org.location || "Remote"}
                          </span>
                        </div>
                        {org.website && (
                          <a
                            href={
                              org.website.startsWith("http")
                                ? org.website
                                : `https://${org.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Globe className="size-2.5" />
                            <span className="truncate max-w-[110px]">
                              {org.website.replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Members Count */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant="outline"
                        className="text-xs font-mono font-semibold py-0.5 px-2 bg-neutral-100 dark:bg-neutral-900"
                      >
                        {org.membersCount}
                      </Badge>
                    </td>

                    {/* Desks Count */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant="outline"
                        className="text-xs font-mono font-semibold py-0.5 px-2 bg-neutral-100 dark:bg-neutral-900"
                      >
                        {org.groupsCount}
                      </Badge>
                    </td>

                    {/* Pending Requests */}
                    <td className="py-3.5 px-4 text-center">
                      {org.pendingRequestsCount > 0 ? (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-mono font-semibold py-0.5 px-2">
                          {org.pendingRequestsCount} new
                        </Badge>
                      ) : (
                        <span className="text-neutral-400 font-mono text-[11px]">
                          0
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                      {new Date(org.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            router.push(`/organizations/${org.id}`)
                          }
                          className="text-xs h-7 gap-1 font-semibold text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white"
                        >
                          <span>Manage</span>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
