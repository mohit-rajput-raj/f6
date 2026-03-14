"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/components/ui/card";
import { Separator } from "@repo/ui/components/ui/separator";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { cn } from "@repo/ui/lib/utils";

export function PageSkeleton({ className }: { className?: String }) {
  return (
    <div className={cn("min-w-full flex", className)}>
      <Card className="w-full  h-full">
        <CardHeader>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
export const PlaneSkeleton = () => {
  return (
    <div className="min-w-full flex">
      <Card className="w-full  h-full">
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function SkeletonAvatar() {
  return (
    <>
      <div className="flex w-full items-center gap-4">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="grid gap-2 w-full">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>

      </div>
      <Separator /></>
  )
}

export function SkeletonText() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Skeleton className="h-4 w-full animate-pulse" />
      <Skeleton className="h-4 w-full animate-pulse" />
      <Skeleton className="h-4 w-3/4 animate-pulse" />
    </div>
  )
}
