"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Switch } from "@repo/ui/components/ui/switch";
import { Label } from "@repo/ui/components/ui/label";
import { toast } from "sonner";
import { IconBell, IconMail, IconDeviceMobile, IconShieldCheck } from "@tabler/icons-react";

function NotificationsForm() {
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [workflowFailures, setWorkflowFailures] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Notification preferences saved successfully!");
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconBell className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Notification Preferences</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Control how and when you receive activity updates, security alerts, and system notifications.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Security Alerts */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <IconShieldCheck className="size-4 text-emerald-500" />
                  <Label className="text-sm font-semibold">Security & Login Alerts</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive instant alerts when logins occur from unrecognized devices or IP addresses.
                </p>
              </div>
              <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
            </div>

            {/* Workflow Failures */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <IconBell className="size-4 text-amber-500" />
                  <Label className="text-sm font-semibold">Execution Failure Alerts</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get notified immediately if an execution pipeline or background process fails.
                </p>
              </div>
              <Switch checked={workflowFailures} onCheckedChange={setWorkflowFailures} />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <IconMail className="size-4 text-primary" />
                  <Label className="text-sm font-semibold">Weekly Workspace Summary</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive a weekly summary email detailing project usage metrics and team updates.
                </p>
              </div>
              <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
            </div>

            {/* Product Updates */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <IconDeviceMobile className="size-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Product Updates & News</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Learn about major product releases, new nodes, feature announcements, and tips.
                </p>
              </div>
              <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
          <Button type="submit" className="px-6 font-semibold">
            Save Preferences
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function NotificationsPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <NotificationsForm />
      </Suspense>
    </ErrorBoundary>
  );
}
