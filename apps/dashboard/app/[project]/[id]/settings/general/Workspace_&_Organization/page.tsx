"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { IconBuilding, IconCopy, IconCheck, IconUsers, IconWorld } from "@tabler/icons-react";

function WorkspaceAndOrganizationForm() {
  const [workspaceName, setWorkspaceName] = useState("Acme Global Operations");
  const [orgId] = useState("org_9481a8c72b0e91");
  const [domain, setDomain] = useState("acme-global.unixl.io");
  const [copied, setCopied] = useState(false);

  const handleCopyOrgId = () => {
    navigator.clipboard.writeText(orgId);
    setCopied(true);
    toast.success("Organization ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Workspace settings updated!");
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconBuilding className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Workspace & Organization</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Manage workspace metadata, organization identification, custom subdomains, and team settings.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          <div className="grid gap-5">
            {/* Workspace Name */}
            <div className="space-y-2">
              <Label htmlFor="ws-name" className="text-sm font-medium">Workspace Name</Label>
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corporation"
              />
            </div>

            {/* Org ID (Read Only with Copy) */}
            <div className="space-y-2">
              <Label htmlFor="org-id" className="text-sm font-medium">Organization Unique ID</Label>
              <div className="flex gap-2">
                <Input
                  id="org-id"
                  value={orgId}
                  readOnly
                  disabled
                  className="font-mono text-xs bg-muted/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOrgId}
                  className="gap-1.5 shrink-0"
                >
                  {copied ? <IconCheck className="size-4 text-emerald-500" /> : <IconCopy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this unique ID when connecting API integrations or automated webhooks.
              </p>
            </div>

            {/* Custom Subdomain */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium flex items-center gap-1.5">
                <IconWorld className="size-4 text-muted-foreground" />
                Workspace Subdomain
              </Label>
              <div className="flex items-center">
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="my-company.unixl.io"
                />
              </div>
            </div>

            {/* Team Summary */}
            <div className="p-4 rounded-lg bg-muted/40 border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconUsers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Team Members</span>
                </div>
                <Badge variant="outline" className="font-semibold">14 / 25 seats used</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                You have 11 remaining seats available under your current Enterprise plan.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
          <Button type="submit" className="px-6 font-semibold">
            Save Workspace Details
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function WorkspaceAndOrgPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <WorkspaceAndOrganizationForm />
      </Suspense>
    </ErrorBoundary>
  );
}
