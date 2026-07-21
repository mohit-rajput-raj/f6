"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Switch } from "@repo/ui/components/ui/switch";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { toast } from "sonner";
import { IconShieldLock, IconDeviceLaptop, IconDeviceMobile, IconKey, IconLock, IconLogout } from "@tabler/icons-react";

function SecurityForm() {
  const [twoFactor, setTwoFactor] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleRevokeSession = (deviceName: string) => {
    toast.info(`Session on "${deviceName}" logged out.`);
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconShieldLock className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Security & Authentication</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Enhance account security with 2FA, session control, and credentials management.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Two Factor Auth */}
        <div className="p-4 rounded-xl border bg-card flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Two-Factor Authentication (2FA)</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                Recommended
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Require an authenticator app code (TOTP) when logging into your account.
            </p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <IconKey className="size-4 text-muted-foreground" />
            Change Password
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="curr-pass" className="text-xs font-medium">Current Password</Label>
              <Input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pass" className="text-xs font-medium">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="outline" size="sm" className="font-semibold">
              Update Password
            </Button>
          </div>
        </form>

        {/* Active Sessions */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-semibold">Active Signed-in Sessions</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
              <div className="flex items-center gap-3">
                <IconDeviceLaptop className="size-5 text-primary" />
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Windows PC • Chrome Browser
                    <Badge variant="secondary" className="text-[10px] py-0">Current Session</Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">Last active: Just now • IP: 182.73.12.94</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
              <div className="flex items-center gap-3">
                <IconDeviceMobile className="size-5 text-muted-foreground" />
                <div>
                  <div className="font-semibold">iPhone 15 Pro • Safari Mobile</div>
                  <div className="text-muted-foreground text-[11px]">Last active: 3 hours ago • IP: 182.73.14.21</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevokeSession("iPhone 15 Pro")}
                className="text-destructive hover:bg-destructive/10 text-xs gap-1"
              >
                <IconLogout className="size-3.5" />
                Revoke
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecurityPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <SecurityForm />
      </Suspense>
    </ErrorBoundary>
  );
}
