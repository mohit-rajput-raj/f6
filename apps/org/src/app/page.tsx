"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconBuilding,
  IconFileSpreadsheet,
  IconUsers,
  IconShieldCheck,
  IconArrowRight,
  IconSparkles,
  IconCheck,
  IconMessage,
  IconPackage,
} from "@tabler/icons-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ModeToggle } from "@repo/ui/components/themes/toogle";
import { orgApi, DBOrganization } from "@/lib/org-api";

export default function LandingPage() {
  const [orgs, setOrgs] = useState<DBOrganization[]>([]);

  useEffect(() => {
    orgApi
      .getPublicOrganizations()
      .then((data) => setOrgs(data || []))
      .catch((err) => {
        console.warn("Failed to load public orgs on landing:", err);
        setOrgs([]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      {/* ─── Top Global Navbar ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-black text-xs shadow-sm">
              UX
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                UNIXL
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Org
              </span>
            </div>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            <Link href="#features" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#architecture" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Architecture
            </Link>
            <Link href="/explore" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Directory
            </Link>
            <Link href="/blog" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Blog
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="sm"
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
              >
                Launch App
                <IconArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-xs">
            <IconSparkles className="size-3.5 text-emerald-500" />
            <span>UNIXL Organizations 2.0 · Multi-Desk Data Governance</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.12]">
            Scale Complex Data Workflows Across Distributed Teams
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Assign institutional desks, automate transformation pipelines with strict schema governance, and empower departmental specialists with zero-latency collaborative workspaces.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="text-xs sm:text-sm font-semibold h-11 px-6 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md hover:opacity-90"
              >
                Enter Organization Workspace
                <IconArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button
                variant="outline"
                size="lg"
                className="text-xs sm:text-sm h-11 px-6 border-neutral-300 dark:border-neutral-700"
              >
                Explore Organization Directory
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-[11px] text-neutral-500 dark:text-neutral-400 pt-6">
            <span className="flex items-center gap-1.5">
              <IconCheck className="size-3.5 text-emerald-500" /> Zero-Trust Verified
            </span>
            <span className="flex items-center gap-1.5">
              <IconCheck className="size-3.5 text-emerald-500" /> Real-time Pipelines
            </span>
            <span className="flex items-center gap-1.5">
              <IconCheck className="size-3.5 text-emerald-500" /> Role-based Desks
            </span>
          </div>
        </div>

        {/* ─── Hero Product UI Mockup ────────────────────────────── */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 space-y-4">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  AP
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">Apex Autonomous Systems</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] py-0">Verified</Badge>
                  </div>
                  <span className="text-[10px] text-neutral-400">Telemetry Multi-Block Flow · 4 Members</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-neutral-400 font-mono">Realtime Live</span>
              </div>
            </div>

            {/* Mock Desks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Desk 01</div>
                <div className="text-xs font-semibold">Fleet Telemetry Ingestion</div>
                <div className="text-[10px] text-emerald-600">Active · Sub-50ms Sync</div>
              </div>
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Desk 02</div>
                <div className="text-xs font-semibold">Actuator Calibration Flow</div>
                <div className="text-[10px] text-emerald-600">Active · Zurich Lab</div>
              </div>
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Desk 03</div>
                <div className="text-xs font-semibold">ISO-Compliance Audit</div>
                <div className="text-[10px] text-amber-600">In Progress · QA Team</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-neutral-900/50 border-t border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Core Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
              Built for Enterprise Precision
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Everything required to orchestrate multi-departmental data transformation pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/90 space-y-3">
              <div className="size-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
                <IconFileSpreadsheet className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Departmental Desk Allocations
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Assign dedicated transformation desks to individual teams (Operations, Risk, Robotics, QA) with isolated schemas and direct pipeline triggers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/90 space-y-3">
              <div className="size-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
                <IconShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Strict Zero-Trust Governance
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Ensure all incoming data conforms to standardized organizational rules, column mappings, and compliance boundaries before merging into the MasterSheet.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/90 space-y-3">
              <div className="size-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
                <IconMessage className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Channel Discussions & Broadcasts
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Dedicated channels (`#general`, `#announcements`, `#staff`) keep operators, supervisors, and executive owners coordinated in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Directory Preview ─────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Directory
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Active Organizations
              </h2>
            </div>
            <Link href="/explore">
              <Button variant="outline" size="sm" className="text-xs">
                View All Directory ({orgs.length})
                <IconArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orgs.slice(0, 3).map((org) => (
              <div
                key={org.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="size-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-lg bg-neutral-800 text-white flex items-center justify-center font-bold text-xs">
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        {org.name}
                      </h4>
                      <span className="text-[10px] text-neutral-400">@{org.slug}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {org.tagline || org.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-400">
                    {org.membersCount ?? 1} members · {org.desksCount ?? 0} desks
                  </span>
                  <Link href={`/dashboard`}>
                    <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                      Enter →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-10 px-4 sm:px-6 text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-6 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-[10px] flex items-center justify-center">
              UX
            </div>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              UNIXL Organizations
            </span>
            <span className="text-neutral-400">· Enterprise Multi-Desk Hub</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-neutral-900 dark:hover:text-white">
              Directory
            </Link>
            <Link href="/blog" className="hover:text-neutral-900 dark:hover:text-white">
              Engineering Blog
            </Link>
            <Link href="/login" className="hover:text-neutral-900 dark:hover:text-white">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-neutral-900 dark:hover:text-white">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
