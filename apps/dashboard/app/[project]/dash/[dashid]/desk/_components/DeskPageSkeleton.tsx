"use client";

import React from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Crown,
  Mail,
  ShieldCheck,
  Clock,
  ArrowLeftRight,
  Pencil,
  ArrowDown,
  Workflow,
  Plus,
  Table2,
  History,
  FileSpreadsheet,
  Settings,
  Play,
  KeyRound,
} from "lucide-react";

/** Top Desk Owner Profile Header Skeleton */
function DeskOwnerHeaderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all">
      {/* Subtle background glow */}
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar + Details */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
          {/* Avatar with gold crown badge */}
          <div className="relative shrink-0">
            <div className="size-14 sm:size-16 rounded-2xl bg-muted/90 ring-2 ring-border/60 animate-pulse overflow-hidden flex items-center justify-center">
              <Skeleton className="size-full rounded-2xl" />
            </div>
            {/* Crown badge */}
            <div className="absolute -bottom-1 -right-1 size-6 sm:size-7 rounded-lg bg-amber-500/20 border-2 border-card flex items-center justify-center shadow-xs">
              <Crown className="size-3.5 sm:size-4 text-amber-500 fill-amber-500/50" />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col min-w-0 space-y-1.5">
            {/* Row 1: Name + Active badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 rounded-lg" />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Active</span>
              </div>
            </div>

            {/* Row 2: Role + Desk Tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-3.5 sm:h-4 w-28 sm:w-36 rounded" />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/80 border border-border/70">
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>

            {/* Row 3: Meta items */}
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs text-muted-foreground pt-0.5">
              <div className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground/70 shrink-0" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-sky-500 shrink-0" />
                <span className="text-[11px] font-medium text-foreground/80">2FA Enforced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground/70 shrink-0" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons Skeleton */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-background/60 shadow-xs">
            <ArrowLeftRight className="size-3.5 text-muted-foreground" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/15 border border-primary/20 shadow-xs">
            <Pencil className="size-3.5 text-primary" />
            <Skeleton className="h-3.5 w-16 rounded bg-primary/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Realistic Spreadsheet Grid Skeleton */
function SpreadsheetSkeletonGrid({ cols = 6, rows = 6 }: { cols?: number; rows?: number }) {
  const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cellWidths = ["w-3/4", "w-1/2", "w-2/3", "w-4/5", "w-3/5", "w-1/2"];

  return (
    <div className="h-full border border-border/80 rounded-lg overflow-hidden bg-background/60 flex flex-col">
      {/* Column Headers */}
      <div className="flex border-b border-border bg-muted/60 shrink-0">
        <div className="w-10 h-7 border-r border-border/80 flex items-center justify-center shrink-0">
          <span className="text-[10px] text-muted-foreground/40 font-mono">#</span>
        </div>
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="flex-1 min-w-[75px] h-7 border-r border-border/80 last:border-r-0 flex items-center justify-center px-2"
          >
            <span className="text-[11px] font-semibold text-muted-foreground/70 font-mono">
              {colLetters[i] || "Col"}
            </span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 min-h-0 flex flex-col divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex h-7 items-stretch">
            {/* Row Number */}
            <div className="w-10 border-r border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground/60">{rIdx + 1}</span>
            </div>

            {/* Data Cells with Realistic Bar Shimmer */}
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="flex-1 min-w-[75px] border-r border-border/40 last:border-r-0 flex items-center px-2.5"
              >
                <Skeleton
                  className={`h-2.5 rounded ${cellWidths[(rIdx + cIdx) % cellWidths.length]}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** BigBlock Pipeline Skeleton with Split View & Segmented Tabs */
function BigBlockSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm shadow-xs overflow-hidden transition-all">
      {/* BigBlock Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shadow-2xs">
            {index + 1}
          </div>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-background/80 shadow-2xs">
            <Play className="size-3 text-emerald-500 fill-emerald-500/30" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          <div className="size-7 rounded-lg border border-border bg-background/80 flex items-center justify-center">
            <Settings className="size-3.5 text-muted-foreground/60" />
          </div>
        </div>
      </div>

      {/* Segmented Tab Bar (Matches the new bordered pill tabs) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {/* Active Tab Pill Skeleton */}
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary shadow-xs overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              <Workflow className="size-2.5 text-primary" />
              <Skeleton className="h-2.5 w-8 rounded" />
            </div>
          </div>

          {/* Inactive Tab Pill Skeleton */}
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/80 shadow-2xs overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <div className="h-4 w-px bg-border/60 shrink-0" />
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              <Workflow className="size-2.5 text-muted-foreground/60" />
              <Skeleton className="h-2.5 w-8 rounded" />
            </div>
          </div>
        </div>

        {/* Right Tab Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-background shadow-2xs">
            <Workflow className="size-3 text-primary" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <div className="flex items-center gap-1 h-7 px-2 rounded-md bg-muted/60">
            <Plus className="size-3 text-muted-foreground" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        </div>
      </div>

      {/* Split View: Left Inputs Panel + Right Spreadsheet Preview */}
      <div className="flex flex-col md:flex-row min-h-[290px]">
        {/* Left Inputs Panel (35%) */}
        <div className="w-full md:w-[35%] border-b md:border-b-0 md:border-r border-border p-3.5 space-y-3.5 bg-card/40">
          {/* Text Inputs Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl border border-border/80 bg-background/70 space-y-1.5 shadow-2xs">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
              <div className="p-2.5 rounded-xl border border-border/80 bg-background/70 space-y-1.5 shadow-2xs">
                <Skeleton className="h-2.5 w-20 rounded" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Sheets Section */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="p-2.5 rounded-xl border border-border/80 bg-muted/30 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-2.5 w-14 rounded" />
              </div>
              <div className="flex gap-1">
                {[28, 36, 42, 30].map((w, i) => (
                  <Skeleton key={i} className="h-4 rounded-md border border-border/60" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Spreadsheet Preview (65%) */}
        <div className="flex-1 p-2.5 flex flex-col bg-background/30 min-w-0">
          {/* Preview Tabs Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="h-6 px-3 rounded-md bg-secondary border border-border flex items-center shadow-2xs">
                <Skeleton className="h-2.5 w-20 rounded" />
              </div>
              <div className="h-6 px-2.5 rounded-md bg-muted/40 flex items-center">
                <Skeleton className="h-2.5 w-14 rounded" />
              </div>
              <div className="h-6 px-2 rounded-md bg-muted/30 flex items-center">
                <Skeleton className="h-2.5 w-12 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>

          {/* Real Spreadsheet Grid */}
          <div className="flex-1 min-h-[220px]">
            <SpreadsheetSkeletonGrid cols={6} rows={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Animated Flow Connector between BigBlocks */
function ArrowConnectorSkeleton() {
  return (
    <div className="flex justify-center py-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/70 bg-card/60 shadow-2xs">
        <ArrowDown className="size-3.5 text-primary animate-bounce" />
        <span className="text-[10px] font-medium text-muted-foreground">data flows</span>
      </div>
    </div>
  );
}

/** Master Sheet Section Skeleton */
function MasterSheetSectionSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {/* Tabs navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-background border border-border/80 shadow-2xs">
            <Table2 className="size-3.5 text-primary" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground">
            <History className="size-3.5 text-muted-foreground/60" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>

      {/* Spreadsheet Card */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-3.5 shadow-xs">
        <div className="h-[240px]">
          <SpreadsheetSkeletonGrid cols={7} rows={7} />
        </div>
      </div>
    </div>
  );
}

/** Main Export: Complete Aesthetic Desk Page Skeleton */
export function DeskPageSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background animate-in fade-in duration-300">
      {/* Desk Owner Header */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <DeskOwnerHeaderSkeleton />
      </div>

      {/* Pipeline Container */}
      <div className="flex-1 min-h-full max-h-full overflow-y-auto p-4 space-y-3">
        {/* BigBlock 1 */}
        <BigBlockSkeleton index={0} />

        {/* Animated Connector */}
        <ArrowConnectorSkeleton />

        {/* BigBlock 2 */}
        <BigBlockSkeleton index={1} />

        {/* Master Sheet Section */}
        <MasterSheetSectionSkeleton />
      </div>
    </div>
  );
}
