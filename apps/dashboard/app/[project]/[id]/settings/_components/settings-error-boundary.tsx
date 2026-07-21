"use client";

import React from "react";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";

export interface ErrorBoundaryFallbackProps {
  error: any;
  resetErrorBoundary: () => void;
}

export function SettingsErrorFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex items-center justify-center p-6 min-h-[350px] w-full">
      <Card className="w-full max-w-lg border-destructive/20 bg-destructive/5 shadow-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <IconAlertTriangle className="size-6" />
          </div>
          <div>
            <CardTitle className="text-destructive text-lg font-semibold">
              Something went wrong
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              An unexpected error occurred while loading this settings view.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/60 p-3 text-xs font-mono text-muted-foreground overflow-x-auto max-h-32">
            {error?.message || "Unknown error details"}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetErrorBoundary}
            className="gap-2 text-xs font-medium"
          >
            <IconRefresh className="size-3.5" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
