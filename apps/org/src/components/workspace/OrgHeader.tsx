"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Users2,
  FileSpreadsheet,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { useOrg } from "@/context/OrgContext";

interface OrgHeaderProps {
  onAssignDeskClick?: () => void;
}

export function OrgHeader({ onAssignDeskClick }: OrgHeaderProps) {
  const { activeOrg, currentUser } = useOrg();

  if (!activeOrg) return null;

  const isOwner =
    activeOrg.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
    activeOrg.ownerId === currentUser.id;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {activeOrg.logoUrl ? (
            <img
              src={activeOrg.logoUrl}
              alt={activeOrg.name}
              className="size-14 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
            />
          ) : (
            <div className="size-14 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-black text-xl shadow-xs">
              {activeOrg.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                {activeOrg.name}
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                <CheckCircle2 className="size-3 mr-1 inline" /> Verified Organization
              </Badge>
              {isOwner && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                  Executive Owner
                </Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl line-clamp-1">
              {activeOrg.tagline || activeOrg.description || "Enterprise workspace"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Link href="/settings">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-neutral-200 dark:border-neutral-800"
            >
              <Settings className="size-3.5 mr-1.5" />
              Settings
            </Button>
          </Link>
          {onAssignDeskClick && (
            <Button
              size="sm"
              onClick={onAssignDeskClick}
              className="text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
            >
              <Plus className="size-3.5 mr-1.5" />
              Assign Desk
            </Button>
          )}
        </div>
      </div>

      {/* Sub-header meta bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <span className="flex items-center gap-1.5">
          <Users2 className="size-3.5 text-neutral-400" />
          <strong>{activeOrg.members?.length || 0}</strong> Members
        </span>
        <span className="flex items-center gap-1.5">
          <FileSpreadsheet className="size-3.5 text-neutral-400" />
          <strong>{activeOrg.assignments?.length || 0}</strong> Active Desks
        </span>
        {activeOrg.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-neutral-400" />
            {activeOrg.location}
          </span>
        )}
        {activeOrg.website && (
          <a
            href={activeOrg.website.startsWith("http") ? activeOrg.website : `https://${activeOrg.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Globe className="size-3.5 text-neutral-400" />
            {activeOrg.website.replace(/^https?:\/\//, "")}
            <ExternalLink className="size-3 text-neutral-400" />
          </a>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="size-3.5" /> Zero-Trust Policy Active
        </span>
      </div>
    </div>
  );
}
