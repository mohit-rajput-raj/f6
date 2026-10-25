"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/context/OrgContext";
import { AppNavSidebar } from "@/components/layout/AppNavSidebar";
import { OrgTopNav } from "@/components/layout/OrgTopNav";
import { Loader2, ShieldAlert } from "lucide-react";

function OrgLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mounted, isLoading, organizerUser, activeOrg, allOrgs } = useOrg();

  // Strict client-side authentication & organization registration guard for (unixl-org) routes
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!organizerUser) {
        router.replace("/login");
      } else if (!activeOrg && allOrgs.length === 0) {
        // Must have at least one organization registered before accessing unixl-org panel
        router.replace("/register?step=org");
      }
    }
  }, [mounted, isLoading, organizerUser, activeOrg, allOrgs.length, router]);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
          <span className="text-xs font-medium text-neutral-500">
            Initializing Organization Workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!organizerUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <ShieldAlert className="size-7 text-amber-500" />
          <span className="text-xs font-medium text-neutral-500">
            Redirecting to organizer sign in...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-1 overflow-hidden bg-background">
      <AppNavSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Fixed Top Navigation Bar across the layout with breadcrumbs */}
        <OrgTopNav />
        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function UnixlOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrgLayoutInner>{children}</OrgLayoutInner>;
}
