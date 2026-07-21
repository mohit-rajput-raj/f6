"use client";

import React from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@repo/ui/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-4xl">
      <Card className="border shadow-xs">
        <CardHeader className="space-y-2 pb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {/* Avatar Section Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-xl bg-muted/30 border">
            <Skeleton className="size-24 rounded-full shrink-0" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>

          {/* Form Fields Skeleton */}
          <div className="grid gap-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3.5 w-56" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3.5 w-72" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Card className="border shadow-xs">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
