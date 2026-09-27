"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Progress } from "@repo/ui/components/ui/progress";
import { toast } from "sonner";
import {
  IconCreditCard,
  IconSparkles,
  IconReceipt,
  IconCheck,
  IconExternalLink,
  IconArrowUpRight,
  IconAlertCircle,
  IconFolder,
  IconScan,
  IconServer,
} from "@tabler/icons-react";
import { useUserSubscription } from "@/lib/use-user-subscription";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

function BillingForm() {
  const router = useRouter();
  const {
    isLoading,
    isLoggedIn,
    hasActivePlan,
    plan,
    planName,
    isPro,
    isMax,
    maxProjects,
    hasOcrAccess,
    activeSubscription,
    refetch,
  } = useUserSubscription();

  const [portalLoading, setPortalLoading] = useState(false);

  // Manage subscription in Polar Customer Portal
  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      if ((authClient as any).customer?.portal) {
        const res = await (authClient as any).customer.portal();
        if (res?.data?.url) {
          window.location.href = res.data.url;
          return;
        }
      }
      // Fallback to pricing page
      router.push("/pricing");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
      router.push("/pricing");
    } finally {
      setPortalLoading(false);
    }
  };

  const formattedPeriodEnd = activeSubscription?.currentPeriodEnd
    ? new Date(activeSubscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconCreditCard className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Billing & Plans</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Manage your subscription tier, track quotas, and inspect purchasing transactions via Polar.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Plan Overview */}
        <div className="p-6 rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs">
                  {planName}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    hasActivePlan
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]"
                      : "border-amber-500 text-amber-600 dark:text-amber-400 font-mono text-[11px]"
                  }
                >
                  {hasActivePlan ? "Active (Polar Verified)" : "Free Tier"}
                </Badge>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <h3 className="text-2xl font-bold tracking-tight">
                  {isMax ? "$99" : isPro ? "$29" : "$0"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {hasActivePlan ? "/ month (Billed via Polar)" : "/ forever"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                {hasActivePlan
                  ? formattedPeriodEnd
                    ? `Next billing cycle on ${formattedPeriodEnd}. Auto-renews unless canceled.`
                    : "Active Polar subscription with uninterrupted platform access."
                  : "Upgrade to Pro or Enterprise for multi-image OCR and expanded project capacity."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                variant="outline"
                className="gap-2 font-medium text-xs"
              >
                <IconExternalLink className="size-4" />
                {portalLoading ? "Opening..." : "Polar Customer Portal"}
              </Button>
              <Button
                onClick={() => router.push("/pricing")}
                className="gap-2 font-semibold text-xs"
              >
                <IconSparkles className="size-4" />
                {hasActivePlan ? "Change Plan" : "Upgrade Plan"}
              </Button>
            </div>
          </div>
        </div>

        {/* Plan Entitlements & Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Plan Entitlements & Quotas</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <IconFolder className="size-4 text-primary" />
                Project Quota
              </div>
              <div className="text-lg font-bold">
                {isMax ? "Unlimited" : isPro ? "20 Projects" : "Community"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isMax
                  ? "Infinite workspaces and team collaboration."
                  : isPro
                  ? "Up to 20 production workspaces."
                  : "Standard project creation allowed."}
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <IconScan className="size-4 text-primary" />
                OCR & Table Scan
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{hasOcrAccess ? "Enabled" : "Locked"}</span>
                {hasOcrAccess ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px]">
                    Requires Pro
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Multi-image structured Gemini table extraction & CSV exports.
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <IconServer className="size-4 text-primary" />
                Compute Priority
              </div>
              <div className="text-lg font-bold">
                {isMax ? "High Priority" : isPro ? "Standard Pro" : "Best Effort"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dedicated queue processing for heavy document parsing.
              </p>
            </div>
          </div>
        </div>

        {/* Polar Purchasing Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Polar Purchasing Details</h4>
          <div className="rounded-lg border bg-card divide-y text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground">Merchant & Billing Provider</span>
              <span className="font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Polar.sh (Global Merchant of Record)
              </span>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-mono">
                {hasActivePlan ? "Card / Automated via Polar" : "No active payment method"}
              </span>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground">Subscription ID</span>
              <span className="font-mono text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                {activeSubscription?.id || "N/A (Free Plan)"}
              </span>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground">Invoicing & VAT</span>
              <span>Self-serve compliant receipts available in Polar Portal</span>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent Transactions & Invoices</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenPortal}
              className="text-xs text-primary gap-1 h-7"
            >
              View in Polar <IconArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="space-y-2">
            {hasActivePlan ? (
              <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card text-xs">
                <div className="flex items-center gap-3">
                  <IconReceipt className="size-4 text-primary" />
                  <div>
                    <div className="font-mono font-medium">
                      POLAR-{activeSubscription?.id?.slice(0, 8).toUpperCase() || "SUB-001"}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {formattedPeriodEnd ? `Period ending ${formattedPeriodEnd}` : "Active Subscription"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">
                    {isMax ? "$99.00" : "$29.00"}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    Paid
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenPortal}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Receipt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-dashed text-center text-xs text-muted-foreground space-y-2">
                <IconAlertCircle className="size-6 text-muted-foreground mx-auto" />
                <p>No active paid invoices yet. You are currently on the Free Starter plan.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/pricing")}
                  className="text-xs mt-1"
                >
                  Explore Paid Plans
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <BillingForm />
      </Suspense>
    </ErrorBoundary>
  );
}
