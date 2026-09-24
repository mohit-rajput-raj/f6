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
  CreditCard,
  Calendar,
  Layers,
  Activity,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  Mail,
  User,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Database,
  Lock,
} from "lucide-react";
import { fetchSubscriberDetailAction } from "../_actions";

export default function SubscriberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<
    "overview" | "subscription" | "workflows" | "security" | "invoices"
  >("overview");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // TanStack Query for individual subscriber details
  const {
    data: detailResult,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "subscriber", id],
    queryFn: () => fetchSubscriberDetailAction(id),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
    enabled: Boolean(id),
  });

  const data = detailResult?.data;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-2 md:p-4">
        {/* Loading skeleton */}
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

  if (queryError || !data) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Subscriber Record Not Found
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
          {(queryError as any)?.message || "We could not find matching records in Polar Sandbox or the Supabase database for ID: " + id}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => router.push("/subscribers")}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Back to Directory
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  const { customer, subscription, workflows, security, orders } = data;

  // Calculate membership tenure in days
  const joinDate = customer.joinedAt ? new Date(customer.joinedAt) : null;
  const tenureDays = joinDate
    ? Math.max(0, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-1 md:p-2">
      {/* ─── Breadcrumb & Navigation Bar ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Link
            href="/subscribers"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 transition"
          >
            Subscribers
          </Link>
          <ChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {customer.name}
          </span>
          <span className="text-neutral-400">•</span>
          <span className="font-mono text-[11px] text-neutral-400">
            {data.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header Profile Bar */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-center dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/subscribers")}
              title="Return to subscribers"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                alt={customer.name}
                className="h-12 w-12 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 text-base font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 md:text-2xl">
                  {customer.name}
                </h1>
                {customer.emailVerified && (
                  <span title="Email Verified" className="text-neutral-700 dark:text-neutral-300">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                )}
                {subscription?.status && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium capitalize ${
                      subscription.status === "active"
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                        : subscription.status === "trialing"
                        ? "bg-neutral-100 text-neutral-800 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 font-semibold"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        subscription.status === "active"
                          ? "bg-white dark:bg-neutral-900"
                          : subscription.status === "trialing"
                          ? "bg-neutral-600 dark:bg-neutral-300"
                          : "bg-neutral-400"
                      }`}
                    />
                    {subscription.status}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{customer.email}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">
                  Role: {customer.role}
                </span>
                {customer.externalId && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => handleCopy("uid", customer.externalId!)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                    >
                      <span>UID: {customer.externalId.slice(0, 10)}...</span>
                      {copiedKey === "uid" ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </>
                )}
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
            {subscription?.checkoutId && (
              <a
                href={`https://sandbox.polar.sh`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <span>Polar Dashboard</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─── Metric Ribbon ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Plan */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Current Tier</span>
            <CreditCard className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold capitalize text-neutral-900 dark:text-neutral-100">
            {subscription?.product?.name || "Free Tier"}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {subscription?.amount ? (
              <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                ${subscription.amount.toFixed(2)} / {subscription.recurringInterval}
              </span>
            ) : (
              "Standard Plan"
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Billing Lifecycle</span>
            <Activity className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold capitalize text-neutral-900 dark:text-neutral-100">
            {subscription?.status || "None"}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {subscription?.cancelAtPeriodEnd ? (
              <span className="text-amber-600 font-medium">Cancels at period end</span>
            ) : subscription?.currentPeriodEnd ? (
              <span>Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
            ) : (
              "No active subscription"
            )}
          </div>
        </div>

        {/* Member Tenure */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Account Tenure</span>
            <Clock className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {tenureDays} <span className="text-sm font-normal text-neutral-500">Days Active</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Joined {joinDate ? joinDate.toLocaleDateString() : "N/A"}
          </div>
        </div>

        {/* Workflows Created */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Application Assets</span>
            <Layers className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {workflows.total} <span className="text-sm font-normal text-neutral-500">Workflows</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {workflows.publicCount} Public • {workflows.templateCount} Templates
          </div>
        </div>
      </div>

      {/* ─── Enterprise MNC Tab Navigation ─── */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: "overview", label: "Overview & Identity" },
            { id: "subscription", label: "Subscription Lifecycle" },
            { id: "workflows", label: `Workflows (${workflows.total})` },
            { id: "security", label: `Security & Sessions (${security.activeSessionsCount})` },
            { id: "invoices", label: `Invoices & Orders (${orders.length})` },
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

      {/* ─── Tab 1: Overview & Identity ─── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Identity & Account Profile */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Account Identification & Profiles
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Verified identity metadata matched across the database and Polar customer record.
            </p>

            <dl className="mt-4 divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Database User ID</dt>
                <dd className="font-mono text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{customer.externalId || "Not registered in DB"}</span>
                  {customer.externalId && (
                    <button
                      onClick={() => handleCopy("extId", customer.externalId!)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {copiedKey === "extId" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Polar Customer ID</dt>
                <dd className="font-mono text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{customer.id || "N/A"}</span>
                  {customer.id && (
                    <button
                      onClick={() => handleCopy("cid", customer.id!)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {copiedKey === "cid" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Full Name</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">{customer.name}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Email Address</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                  <span>{customer.email}</span>
                  {customer.emailVerified && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-bold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                      VERIFIED
                    </span>
                  )}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">System Role</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{customer.role}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Registration Date</dt>
                <dd className="text-neutral-900 dark:text-neutral-100">
                  {customer.joinedAt ? new Date(customer.joinedAt).toLocaleString() : "Unknown"}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Country / Region</dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{customer.country || "IN"}</dd>
              </div>
            </dl>
          </div>

          {/* Configuration & API Key Status */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Configured Integration Credentials
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                AI model provider API keys stored securely in user profile.
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Key className="h-4 w-4 text-neutral-400" />
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">Google Gemini API</span>
                      <p className="text-[11px] text-neutral-500">Required for custom agent intelligence</p>
                    </div>
                  </div>
                  {security.apiKeysConfigured.gemini ? (
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
                      <p className="text-[11px] text-neutral-500">GPT-4o & embeddings support</p>
                    </div>
                  </div>
                  {security.apiKeysConfigured.openai ? (
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
                      <p className="text-[11px] text-neutral-500">Claude 3.5 Sonnet pipeline</p>
                    </div>
                  </div>
                  {security.apiKeysConfigured.claude ? (
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
          </div>
        </div>
      )}

      {/* ─── Tab 2: Subscription Lifecycle ─── */}
      {activeTab === "subscription" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Active Subscription Agreement
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Current contracted terms, recurring intervals, and renewal cycle.
                </p>
              </div>

              {subscription?.id && (
                <div className="flex items-center gap-1.5 font-mono text-xs text-neutral-500">
                  <span>Sub ID: {subscription.id}</span>
                  <button
                    onClick={() => handleCopy("subid", subscription.id)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    {copiedKey === "subid" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>

            {subscription ? (
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                <dl className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Product / Plan</dt>
                    <dd className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">
                      {subscription.product.name}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Billed Amount</dt>
                    <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                      ${subscription.amount.toFixed(2)} {subscription.currency} / {subscription.recurringInterval}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Current Status</dt>
                    <dd className="font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                      {subscription.status}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Subscription Started</dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {new Date(subscription.startedAt).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Polar Checkout ID</dt>
                    <dd className="font-mono text-neutral-900 dark:text-neutral-100">
                      {subscription.checkoutId || "None"}
                    </dd>
                  </div>
                </dl>

                <dl className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Current Period Start</dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {new Date(subscription.currentPeriodStart).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Current Period End</dt>
                    <dd className="text-neutral-900 dark:text-neutral-100 font-semibold">
                      {new Date(subscription.currentPeriodEnd).toLocaleString()}
                    </dd>
                  </div>
                  {subscription.trialStart && (
                    <div className="flex justify-between py-2.5">
                      <dt className="text-neutral-500">Trial Period</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100">
                        {new Date(subscription.trialStart).toLocaleDateString()} –{" "}
                        {subscription.trialEnd ? new Date(subscription.trialEnd).toLocaleDateString() : ""}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between py-2.5">
                    <dt className="text-neutral-500">Auto-Renew Status</dt>
                    <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="text-rose-600">Will terminate at period end</span>
                      ) : (
                        <span className="text-emerald-600">Active Auto-Renew</span>
                      )}
                    </dd>
                  </div>
                  {subscription.canceledAt && (
                    <div className="flex justify-between py-2.5">
                      <dt className="text-neutral-500">Canceled Timestamp</dt>
                      <dd className="text-rose-600">
                        {new Date(subscription.canceledAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500">
                No active recurring Polar subscription attached to this profile.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab 3: Workflows & Projects ─── */}
      {activeTab === "workflows" && (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              User Workflows & Diagrams ({workflows.total})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Workflows authored and maintained by this user in the visual builder.
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
                      No workflows created yet by this subscriber.
                    </td>
                  </tr>
                ) : (
                  workflows.list.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-3 pl-4 pr-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {w.name}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-neutral-500">
                        {w.slug || w.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            w.isPublic
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {w.isPublic ? "PUBLIC" : "PRIVATE"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {w.tags && w.tags.length > 0 ? (
                            w.tags.map((t, i) => (
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

      {/* ─── Tab 4: Security & Sessions ─── */}
      {activeTab === "security" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
            <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Active & Historical Authentication Sessions
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Session tokens, browser user agents, and IP addresses registered for this user.
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
                    <th className="py-3 pl-3 pr-4 font-semibold text-right">Expires At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {security.sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        No active sessions recorded.
                      </td>
                    </tr>
                  ) : (
                    security.sessions.map((s) => {
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
                                  ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
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
        </div>
      )}

      {/* ─── Tab 5: Invoices & Orders ─── */}
      {activeTab === "invoices" && (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Payment Transactions & Invoices ({orders.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Billing receipts, invoices, and charges generated via Polar payment gateway.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Order / Invoice ID</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Billing Reason</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      No invoices or orders recorded yet for this customer in Polar.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-3 pl-4 pr-3 font-mono text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {o.id}
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        ${o.amount.toFixed(2)} {o.currency}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-neutral-500 capitalize">
                        {o.billingReason.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        {o.invoiceUrl ? (
                          <a
                            href={o.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-neutral-900 hover:underline dark:text-neutral-100"
                          >
                            <span>Download</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
