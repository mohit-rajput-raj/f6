"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Layers,
  Key,
  Shield,
  Activity,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileCode,
  Calendar,
} from "lucide-react";
import { fetchUserDetailAction } from "../_actions";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<
    "overview" | "workflows" | "security" | "integrations"
  >("overview");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const {
    data: detailResult,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => fetchUserDetailAction(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: Boolean(id),
  });

  const user = detailResult?.data;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-2 md:p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  if (queryError || !user) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
          User Record Not Found
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
          {(queryError as any)?.message || "No matching user record found in the database for ID: " + id}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => router.push("/users")}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Back to Directory
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { workflows, security, apiKeysConfigured } = user;
  const joinDate = user.createdAt ? new Date(user.createdAt) : null;
  const tenureDays = joinDate
    ? Math.max(0, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalKeysCount = Object.values(apiKeysConfigured).filter(Boolean).length;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-1 md:p-2 text-neutral-900 dark:text-neutral-100">
      {/* ─── Breadcrumb & Navigation ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Link
            href="/users"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 transition"
          >
            Users
          </Link>
          <ChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {user.name}
          </span>
          <span className="text-neutral-400">•</span>
          <span className="font-mono text-[11px] text-neutral-400">
            {user.id.slice(0, 12)}...
          </span>
        </div>

        {/* Profile Header Bar */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-center dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/users")}
              title="Back to directory"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="h-12 w-12 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 text-base font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 md:text-2xl">
                  {user.name}
                </h1>
                {user.emailVerified && (
                  <span title="Email Verified" className="text-neutral-900 dark:text-neutral-100">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${
                    user.role === "ADMIN"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{user.email}</span>
                <span>•</span>
                <button
                  onClick={() => handleCopy("uid", user.id)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                >
                  <span>UID: {user.id.slice(0, 10)}...</span>
                  {copiedKey === "uid" ? (
                    <Check className="h-3 w-3 text-neutral-900 dark:text-neutral-100" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metric Ribbon ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Workflows */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Authored Workflows</span>
            <Layers className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {workflows.total} <span className="text-sm font-normal text-neutral-500">Workflows</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {workflows.publicCount} Public • {workflows.templateCount} Templates
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Sessions</span>
            <Activity className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {security.activeSessions} <span className="text-sm font-normal text-neutral-500">Live</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {security.totalSessionsEver} historical sessions
          </div>
        </div>

        {/* Member Tenure */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Account Tenure</span>
            <Clock className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {tenureDays} <span className="text-sm font-normal text-neutral-500">Days</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Registered {joinDate ? joinDate.toLocaleDateString() : "N/A"}
          </div>
        </div>

        {/* AI Key Integrations */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">API Keys Configured</span>
            <Key className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalKeysCount} / 3 <span className="text-sm font-normal text-neutral-500">Providers</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Gemini, OpenAI, Claude credentials
          </div>
        </div>
      </div>

      {/* ─── MNC Tab Navigation ─── */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: "overview", label: "Identity & Profile" },
            { id: "workflows", label: `Workflows (${workflows.total})` },
            { id: "security", label: `Security & Sessions (${security.activeSessions})` },
            { id: "integrations", label: `Model Keys (${totalKeysCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`border-b-2 py-3 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Tab 1: Identity & Profile ─── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Account Attributes & Metadata
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Verified identity data stored in the core platform database.
            </p>

            <dl className="mt-4 divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Unique User ID</dt>
                <dd className="font-mono text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{user.id}</span>
                  <button
                    onClick={() => handleCopy("id", user.id)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    {copiedKey === "id" ? <Check className="h-3 w-3 text-neutral-900 dark:text-neutral-100" /> : <Copy className="h-3 w-3" />}
                  </button>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Display Name</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">{user.name}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Email Address</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                  <span>{user.email}</span>
                  {user.emailVerified ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-bold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] text-neutral-500 dark:bg-neutral-800">
                      UNVERIFIED
                    </span>
                  )}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">System Role</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{user.role}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Account Created</dt>
                <dd className="text-neutral-900 dark:text-neutral-100">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Last Modified</dt>
                <dd className="text-neutral-900 dark:text-neutral-100">
                  {new Date(user.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Connected Authentication Providers
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Identity providers linked for sign-in and SSO.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              {security.connectedProviders && security.connectedProviders.length > 0 ? (
                security.connectedProviders.map((p: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-neutral-500" />
                      <span className="font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                        {p} Provider
                      </span>
                    </div>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      LINKED
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-neutral-500">
                  Email & Password credentials authentication
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Workflows ─── */}
      {activeTab === "workflows" && (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Authored Workflows & Projects ({workflows.total})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Visual flow diagrams and project automations configured by this user.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Workflow Name</th>
                  <th className="px-3 py-3 font-semibold">Slug / ID</th>
                  <th className="px-3 py-3 font-semibold">Visibility</th>
                  <th className="px-3 py-3 font-semibold">Tags</th>
                  <th className="px-3 py-3 font-semibold">Created Date</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Last Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {workflows.list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-500">
                      No workflows created yet by this user.
                    </td>
                  </tr>
                ) : (
                  workflows.list.map((w: any) => (
                    <tr key={w.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-3 pl-4 pr-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {w.name}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-neutral-500">
                        {w.slug || w.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {w.isPublic ? "PUBLIC" : "PRIVATE"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {w.tags && w.tags.length > 0 ? (
                            w.tags.map((t: string, i: number) => (
                              <span
                                key={i}
                                className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right text-neutral-500">
                        {new Date(w.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab 3: Security & Sessions ─── */}
      {activeTab === "security" && (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Active & Historical Authentication Sessions
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Token footprints, devices, and IP addresses registered for this account.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Session Token</th>
                  <th className="px-3 py-3 font-semibold">IP Address</th>
                  <th className="px-3 py-3 font-semibold">User Agent / Platform</th>
                  <th className="px-3 py-3 font-semibold">Created</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {security.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      No sessions recorded.
                    </td>
                  </tr>
                ) : (
                  security.sessions.map((s: any) => {
                    const isExpired = new Date(s.expiresAt) < new Date();
                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="py-3 pl-4 pr-3 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                          {s.token ? `${s.token.slice(0, 16)}...` : s.id.slice(0, 12)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                          {s.ipAddress || "127.0.0.1"}
                        </td>
                        <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                          {s.userAgent || "Unknown Client"}
                        </td>
                        <td className="px-3 py-3 text-neutral-500">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              isExpired
                                ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                                : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            }`}
                          >
                            {isExpired ? "EXPIRED" : "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab 4: Integrations ─── */}
      {activeTab === "integrations" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            AI Provider Credentials
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Model API keys configured on this user account.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-neutral-400" />
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">Google Gemini API</span>
                  <p className="text-[11px] text-neutral-500">Agentic orchestration provider</p>
                </div>
              </div>
              {apiKeysConfigured.gemini ? (
                <span className="inline-flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                  Not Set
                </span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-neutral-400" />
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">OpenAI API</span>
                  <p className="text-[11px] text-neutral-500">GPT-4o & text embedding engine</p>
                </div>
              </div>
              {apiKeysConfigured.openai ? (
                <span className="inline-flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                  Not Set
                </span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-neutral-400" />
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">Anthropic Claude API</span>
                  <p className="text-[11px] text-neutral-500">Claude 3.5 models pipeline</p>
                </div>
              </div>
              {apiKeysConfigured.claude ? (
                <span className="inline-flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                  Not Set
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
