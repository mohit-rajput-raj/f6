"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Label } from "@repo/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { toast } from "sonner";
import { IconPalette, IconMoon, IconSun, IconDeviceDesktop, IconLanguage, IconClock } from "@tabler/icons-react";
import { cn } from "@repo/ui/lib/utils";

function LocalizationAndThemeForm() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("dark");
  const [language, setLanguage] = useState("en-US");
  const [timezone, setTimezone] = useState("UTC+05:30");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Appearance & Localization settings updated!");
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconPalette className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">Localization & Theme</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Customize interface appearance, color scheme, regional language, timezone, and date formats.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          {/* Theme Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Interface Theme</Label>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {[
                { id: "light", label: "Light", icon: IconSun },
                { id: "dark", label: "Dark", icon: IconMoon },
                { id: "system", label: "System", icon: IconDeviceDesktop },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-semibold"
                        : "border-border/60 hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Icon className="size-6" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 pt-2">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <IconLanguage className="size-4 text-muted-foreground" />
                Display Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                  <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                  <SelectItem value="es-ES">Spanish (Español)</SelectItem>
                  <SelectItem value="de-DE">German (Deutsch)</SelectItem>
                  <SelectItem value="ja-JP">Japanese (日本語)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <IconClock className="size-4 text-muted-foreground" />
                Time Zone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC+05:30">(UTC+05:30) India Standard Time (IST)</SelectItem>
                  <SelectItem value="UTC-08:00">(UTC-08:00) Pacific Time (US & Canada)</SelectItem>
                  <SelectItem value="UTC-05:00">(UTC-05:00) Eastern Time (US & Canada)</SelectItem>
                  <SelectItem value="UTC+00:00">(UTC+00:00) Universal Coordinated Time (UTC)</SelectItem>
                  <SelectItem value="UTC+01:00">(UTC+01:00) Central European Time (CET)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Format */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (Day First)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (Month First)</SelectItem>
                  <SelectItem value="MMM D, YYYY">MMM D, YYYY (e.g. Jul 22, 2026)</SelectItem>
                </SelectContent>
              </Select>
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

export default function LocalizationAndThemePage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <LocalizationAndThemeForm />
      </Suspense>
    </ErrorBoundary>
  );
}
