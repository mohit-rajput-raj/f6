"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class NotificationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Notification UI Error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center min-h-[300px] gap-4">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Failed to render notifications</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
          </div>
          <Button onClick={this.handleReset} variant="outline" className="gap-2">
            <RefreshCw className="size-4" /> Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
