"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsNav } from "./_components/settings-nav";
import { SettingsErrorFallback } from "./_components/settings-error-boundary";
import { SettingsPageSkeleton } from "./_components/settings-skeletons";
import { Separator } from "@repo/ui/components/ui/separator";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account profile, workspace preferences, security options, and integrations.
        </p>
      </div>

      <Separator className="my-2" />

      {/* Main Content Area with Navigation */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <SettingsNav />
        <div className="flex-1 w-full min-w-0">
          <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
            <Suspense fallback={<SettingsPageSkeleton />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
