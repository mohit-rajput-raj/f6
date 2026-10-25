"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Users,
  MapPin,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  ExternalLink,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { useOrg } from "@/context/OrgContext";
import { Organization } from "@/lib/organization-data";

export default function ExplorePage() {
  const { allOrgs, publicOrgs, activeOrg, currentUser, selectOrg } = useOrg();
  const orgsToDisplay = publicOrgs && publicOrgs.length > 0 ? publicOrgs : allOrgs;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");

  const filteredOrgs = orgsToDisplay.filter((org) => {
    if (!searchQuery.trim() && selectedSector === "all") return true;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      org.name.toLowerCase().includes(q) ||
      org.slug.toLowerCase().includes(q) ||
      (org.description && org.description.toLowerCase().includes(q)) ||
      (org.location && org.location.toLowerCase().includes(q)) ||
      (org.tagline && org.tagline.toLowerCase().includes(q));

    return matchesSearch;
  });

  const totalMembers = orgsToDisplay.reduce((acc, o) => acc + (o.members?.length || 0), 0);
  const totalDesks = orgsToDisplay.reduce((acc, o) => acc + (o.assignments?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Top Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Organization Directory
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Explore verified institutional workspaces, departmental units, and active data transformations.
          </p>
        </div>

        <Link href="/register-org">
          <Button
            size="sm"
            className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
          >
            <Plus className="size-3.5 mr-1.5" />
            Register Organization
          </Button>
        </Link>
      </div>

      {/* ─── Metrics Ribbon ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Verified Units
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {orgsToDisplay.length}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Enterprise Staff
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {totalMembers}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Active Desks
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {totalDesks}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Integrity Check
          </div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-2">
            <ShieldCheck className="size-4" /> 100% Zero-Trust
          </div>
        </div>
      </div>

      {/* ─── Search & Discovery Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations by name, domain, region..."
            className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>
        <div className="text-xs text-neutral-400">
          Showing {filteredOrgs.length} of {orgsToDisplay.length} organizations
        </div>
      </div>

      {/* ─── Organizations Cards Grid (NO JOIN ORG BUTTON) ──────── */}
      {filteredOrgs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center space-y-3 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div className="size-12 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Building2 className="size-6" />
          </div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No organizations match your query
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new enterprise organization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrgs.map((org) => {
            const isActiveCurrent = activeOrg?.id === org.id;
            const isOwner =
              org.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
              org.ownerId === currentUser.id;

            return (
              <div
                key={org.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isActiveCurrent
                    ? "border-emerald-500/50 bg-emerald-500/[0.03] shadow-md dark:border-emerald-500/40"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="size-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-xs">
                          {org.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            {org.name}
                          </h3>
                          {isActiveCurrent && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1.5">
                              Active
                            </Badge>
                          )}
                          {isOwner && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] py-0 px-1.5">
                              Owner
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400">
                          @{org.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        <Users className="size-3" />
                        {org.members?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Tagline / Description */}
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {org.tagline || org.description || "Enterprise organization workspace"}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                    {org.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-neutral-400" />
                        {org.location}
                      </span>
                    )}
                    {org.website && (
                      <a
                        href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 truncate max-w-[170px] hover:text-emerald-500 hover:underline transition-colors"
                      >
                        <Globe className="size-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{org.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
                        <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileSpreadsheet className="size-3 text-neutral-400" />
                      {org.assignments?.length || 0} Desks
                    </span>
                  </div>
                </div>

                {/* Card Actions (NOTE: NO "JOIN ORG" BUTTON AS EXPLICITLY REQUESTED) */}
                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-neutral-400">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {isActiveCurrent ? (
                      <Link href="/dashboard">
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        >
                          Enter Workspace
                          <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectOrg(org)}
                        className="text-xs h-8 border-neutral-200 dark:border-neutral-800"
                      >
                        Select Organization
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
