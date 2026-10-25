"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  Users2,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  ChevronRight,
  Building2,
  Home,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ThemeToggleButton } from "@repo/ui/components/themes/toogle";
import { useOrg } from "@/context/OrgContext";

const ROUTE_LABELS: Record<string, { label: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/desks": { label: "Desk Pipelines" },
  "/members": { label: "Members & Roles" },
  "/messages": { label: "Discussions" },
  "/assets": { label: "Asset Library" },
  "/announcements": { label: "Announcements" },
  "/settings": { label: "Org Settings" },
  "/register-org": { label: "New Organization" },
  "/explore": { label: "Explore Orgs" },
};

export function OrgTopNav() {
  const pathname = usePathname();
  const { activeOrg, currentUser, organizerUser } = useOrg();

  // Compute dynamic breadcrumbs based on the current pathname
  const getBreadcrumbs = () => {
    if (!pathname || pathname === "/dashboard") {
      return [{ label: "Dashboard", href: "/dashboard", active: true }];
    }

    // Direct match from ROUTE_LABELS
    if (ROUTE_LABELS[pathname]) {
      return [
        { label: ROUTE_LABELS[pathname].label, href: pathname, active: true },
      ];
    }

    // Dynamic desk detail: /desks/[groupId]
    if (pathname.startsWith("/desks/")) {
      return [
        { label: "Desk Pipelines", href: "/desks", active: false },
        { label: "Pipeline Details", href: pathname, active: true },
      ];
    }

    // Fallback: parse route segments
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => {
      const href = "/" + segments.slice(0, i + 1).join("/");
      const label =
        ROUTE_LABELS[href]?.label ||
        seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      return {
        label,
        href,
        active: i === segments.length - 1,
      };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const isOwner =
    activeOrg &&
    (activeOrg.ownerEmail?.toLowerCase() === currentUser?.email?.toLowerCase() ||
      activeOrg.ownerEmail?.toLowerCase() === organizerUser?.email?.toLowerCase() ||
      activeOrg.ownerId === currentUser?.id ||
      activeOrg.ownerId === organizerUser?.id);

  const memberCount = activeOrg?.members?.length ?? 0;
  const deskCount = activeOrg?.assignments?.length ?? 0;

  return (
    <header className="shrink-0 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-30 transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
        {/* Upper Breadcrumb Row */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap min-w-0">
            <Link
              href="/dashboard"
              className="hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 transition-colors text-neutral-500 dark:text-neutral-400"
              title="Dashboard"
            >
              <Home className="size-3.5" />
              <span className="font-medium truncate max-w-[140px]">
                {activeOrg?.name || "UNIXL Org"}
              </span>
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href + idx}>
                <ChevronRight className="size-3 text-neutral-400 shrink-0" />
                {crumb.active ? (
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Live Activity indicator */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Workspace Active</span>
          </div>
        </div>

        {/* Main Identity Row: Avatar, Name, Badges, Tagline + Settings */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Org Logo / Avatar */}
            {activeOrg?.logoUrl ? (
              <img
                src={activeOrg.logoUrl}
                alt={activeOrg.name}
                className="size-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs shrink-0"
              />
            ) : (
              <div className="size-11 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                {activeOrg?.name ? activeOrg.name.charAt(0).toLowerCase() : "s"}
              </div>
            )}

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                  {activeOrg?.name || "UNIXL Organization"}
                </h1>
                {activeOrg && (
                  <>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] py-0.5 px-2 font-medium shrink-0">
                      <CheckCircle2 className="size-3 mr-1 inline" />
                      Verified Organization
                    </Badge>
                    {isOwner && (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] py-0.5 px-2 font-medium shrink-0">
                        Executive Owner
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xl">
                {activeOrg?.tagline ||
                  activeOrg?.description ||
                  "Institutional Data & Transformation Hub"}
              </p>
            </div>
          </div>

          {/* Actions: Website Link, Settings, Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {activeOrg?.website && (
              <a
                href={activeOrg.website.startsWith("http") ? activeOrg.website : `https://${activeOrg.website}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Visit official website: ${activeOrg.website}`}
                className="shrink-0"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2.5 border-neutral-200 dark:border-neutral-800 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors gap-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                >
                  <Globe className="size-3.5 text-emerald-500" />
                  <span className="hidden sm:inline font-medium max-w-[130px] truncate">
                    {activeOrg.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                  </span>
                  <ExternalLink className="size-3 opacity-60" />
                </Button>
              </a>
            )}

            {/* Settings Button */}
            <Link href="/settings" className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 border-neutral-200 dark:border-neutral-800 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors gap-1.5"
              >
                <Settings className="size-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </Link>

            {/* Theme Toggle Button (Single Click, No Dropdown) */}
            <ThemeToggleButton />
          </div>
        </div>

        {/* Sub Row: Members, Active Desks, Website, Zero-Trust */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/60 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs">
              <Users2 className="size-3.5 text-neutral-400 shrink-0" />
              <span>{memberCount} Members</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <FileSpreadsheet className="size-3.5 text-neutral-400 shrink-0" />
              <span>{deskCount} Active Desks</span>
            </span>
            {activeOrg?.website && (
              <a
                href={activeOrg.website.startsWith("http") ? activeOrg.website : `https://${activeOrg.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-xs hover:text-emerald-500 transition-colors"
              >
                <Globe className="size-3.5 text-neutral-400" />
                <span className="truncate max-w-[160px]">
                  {activeOrg.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                </span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>Zero-Trust Policy Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}

