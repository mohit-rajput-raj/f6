"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Progress } from "@repo/ui/components/ui/progress";
import { toast } from "sonner";
import { IconCreditCard, IconSparkles, IconReceipt, IconCheck, IconDownload } from "@tabler/icons-react";

function BillingForm() {
  const handleUpgrade = () => {
    toast.info("Redirecting to Plan Management billing portal...");
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconCreditCard className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Billing & Subscriptions</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          View current subscription plan, track compute resource usage, and download invoices.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Plan Overview */}
        <div className="p-6 rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5">
                  Pro Enterprise Plan
                </Badge>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  Active
                </Badge>
              </div>
              <h3 className="text-lg font-bold mt-2">$149 / month</h3>
              <p className="text-xs text-muted-foreground">
                Next billing cycle on August 15, 2026. Auto-renews via Visa ending in 4242.
              </p>
            </div>
            <Button onClick={handleUpgrade} className="gap-2 font-semibold shrink-0">
              <IconSparkles className="size-4" />
              Manage Subscription
            </Button>
          </div>
        </div>

        {/* Usage Progress Meters */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Current Billing Period Usage</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Model Compute Operations</span>
                <span className="text-muted-foreground">64,200 / 100,000</span>
              </div>
              <Progress value={64} className="h-2" />
              <p className="text-[11px] text-muted-foreground">64% of allocated monthly compute credits used</p>
            </div>

            <div className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Cloud Image & Media Storage</span>
                <span className="text-muted-foreground">18.4 GB / 50 GB</span>
              </div>
              <Progress value={36.8} className="h-2" />
              <p className="text-[11px] text-muted-foreground">Hosted via Cloudinary CDN integration</p>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Recent Invoices</h4>
          <div className="space-y-2">
            {[
              { id: "INV-2026-007", date: "Jul 15, 2026", amount: "$149.00", status: "Paid" },
              { id: "INV-2026-006", date: "Jun 15, 2026", amount: "$149.00", status: "Paid" },
              { id: "INV-2026-005", date: "May 15, 2026", amount: "$149.00", status: "Paid" },
            ].map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconReceipt className="size-4 text-muted-foreground" />
                  <div>
                    <span className="font-mono font-medium">{invoice.id}</span>
                    <div className="text-muted-foreground text-[11px]">{invoice.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-sm">{invoice.amount}</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download PDF">
                    <IconDownload className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
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
