"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, Building2, Sparkles, HelpCircle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useUserSubscription } from "@/lib/use-user-subscription";
import { toast } from "sonner";

export default function PricingSection({ className }: { className?: string }) {
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  const {
    isLoggedIn,
    hasActivePlan,
    plan,
    isLoading: isSubLoading,
  } = useUserSubscription();

  const handleCheckout = async (slug: string) => {
    try {
      setLoadingPlan(slug);
      await (authClient as any).checkout({
        slug,
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error?.message?.includes("UNAUTHORIZED") || error?.status === 401) {
        toast.error("Please sign in first to upgrade your plan.");
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
      setLoadingPlan(null);
    }
  };

  // When user has taken any plan:
  // Highlight that current running plan and blur the remaining two plans
  const isProActive = plan === "pro";
  const isEnterpriseActive = plan === "max";
  const isStarterActive = !hasActivePlan;

  // Blur logic: If user is on Pro -> blur Starter & Enterprise
  // If user is on Enterprise -> blur Starter & Pro
  const isStarterBlurred = hasActivePlan;
  const isProBlurred = hasActivePlan && !isProActive;
  const isEnterpriseBlurred = hasActivePlan && !isEnterpriseActive;

  return (
    <section
      className={cn(
        "w-full pt-8 pb-20 sm:pt-16 sm:pb-38 bg-zinc-950 text-zinc-100 transition-colors duration-200 relative overflow-hidden",
        className,
      )}
    >
      {/* Subtle ambient light glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-primary/10 blur-[140px] rounded-full pointer-events-none z-0" />

      <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <Badge
            variant="outline"
            className="px-3 py-1 rounded-full border-border bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider"
          >
            Predictable Billing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            Predictable pricing for workflow automation
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Scale your visual canvas seamlessly. Start building custom execution
            flows today with transparent, compulsory fixed plans.
          </p>

          {/* Active plan status banner if logged in with an active plan */}
          {hasActivePlan && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                Current Running Plan:{" "}
                <strong className="text-white capitalize font-bold">
                  {isProActive ? "Pro Developer ($29/mo)" : "Enterprise ($99/mo)"}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Free Starter */}
          <Card
            className={cn(
              "relative flex flex-col border-border bg-card shadow-sm overflow-hidden transition-all duration-300",
              isStarterBlurred && "filter blur-[3.5px] opacity-40 pointer-events-none select-none",
            )}
          >
            {/* Blur overlay when another plan is active */}
            {isStarterBlurred ? (
              <div className="absolute inset-0 z-30 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Included in your active running plan
                </p>
              </div>
            ) : (
              /* Coming Soon overlay for starter if no plan taken */
              <div className="absolute inset-0 z-20 backdrop-blur-[6px] bg-card/60 flex flex-col items-center justify-center gap-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center border border-border">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Free Tier</p>
                <p className="text-xs text-muted-foreground/70 max-w-[180px] text-center">
                  Upgrade to Pro ($29) or Enterprise ($99) for full features.
                </p>
              </div>
            )}

            <CardHeader className="pb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4 border border-border">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">Starter</CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                Ideal for exploring the visual canvas and testing basic nodes.
              </CardDescription>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight">
                  $0
                </span>
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  / forever
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-sm">
              <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Plan Limits
              </div>
              <ul className="space-y-3">
                <FeatureItem bold text="Standard visual canvas" />
                <FeatureItem
                  text="Max 15 ReactFlow nodes / workflow"
                  tooltip="Canvas node cap applies to standard, trigger, and response nodes."
                />
                <FeatureItem text="Standard node library access" />
                <FeatureItem text="Community support" />
                <FeatureItem text="1 execution thread" />
              </ul>
            </CardContent>
            <CardFooter className="pt-6 border-t border-border">
              <Button
                variant="outline"
                className="w-full font-medium cursor-not-allowed opacity-50"
                disabled
              >
                Included by Default
              </Button>
            </CardFooter>
          </Card>

          {/* Plan 2: Professional ($29/month) */}
          <Card
            className={cn(
              "relative flex flex-col bg-card shadow-lg transition-all duration-300",
              isProActive
                ? "border-2 border-emerald-500 shadow-emerald-500/20 ring-1 ring-emerald-500/30"
                : "border-2 border-primary",
              isProBlurred && "filter blur-[3.5px] opacity-40 pointer-events-none select-none",
            )}
          >
            {/* Active Plan Tag OR Most Popular Tag */}
            {isProActive ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-sm flex items-center gap-1.5">
                <Check className="size-3.5 stroke-[3]" />
                Current Running Plan
              </div>
            ) : (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-sm">
                Most Popular
              </div>
            )}

            {/* Overlay if blurred */}
            {isProBlurred && (
              <div className="absolute inset-0 z-30 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Unavailable while on Enterprise plan
                </p>
              </div>
            )}

            <CardHeader className="pb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Pro Developer</CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                Full power for developers and small teams building complex
                production flows.
              </CardDescription>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight">
                  $29
                </span>
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  / month
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-sm">
              <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Everything in Starter, plus
              </div>
              <ul className="space-y-3">
                <FeatureItem bold text="Unlimited Workflows & Projects" />
                <FeatureItem bold text="Vision OCR Table Extractor Unlocked" />
                <FeatureItem text="Unlimited ReactFlow canvas nodes" />
                <FeatureItem text="Custom node component integration" />
                <FeatureItem text="Full execution logs & history (30 days)" />
                <FeatureItem text="5 concurrent parallel executions" />
              </ul>
            </CardContent>
            <CardFooter className="pt-6 border-t border-border">
              {/* If user is logged out: DO NOT show upgrade button */}
              {!isLoggedIn ? (
                <div className="w-full text-center py-2 text-xs text-muted-foreground font-medium">
                  <Link
                    href="/auth/sign-in"
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in
                  </Link>{" "}
                  to view available upgrades
                </div>
              ) : isProActive ? (
                /* If user already on Pro plan: HIDE upgrade button, show Current Plan badge */
                <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-sm font-semibold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Current Running Plan
                </div>
              ) : (
                /* Logged in with no plan or different plan: show upgrade button */
                <Button
                  className="w-full font-medium shadow-sm cursor-pointer"
                  disabled={loadingPlan === "unixl-pro" || isProBlurred}
                  onClick={() => handleCheckout("unixl-pro")}
                >
                  {loadingPlan === "unixl-pro" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    "Upgrade to Pro"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Plan 3: Enterprise ($99/month) */}
          <Card
            className={cn(
              "relative flex flex-col bg-card shadow-sm hover:shadow-md transition-all duration-300",
              isEnterpriseActive
                ? "border-2 border-emerald-500 shadow-emerald-500/20 ring-1 ring-emerald-500/30"
                : "border-border",
              isEnterpriseBlurred && "filter blur-[3.5px] opacity-40 pointer-events-none select-none",
            )}
          >
            {/* Active Plan Tag */}
            {isEnterpriseActive && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-sm flex items-center gap-1.5">
                <Check className="size-3.5 stroke-[3]" />
                Current Running Plan
              </div>
            )}

            {/* Overlay if blurred */}
            {isEnterpriseBlurred && (
              <div className="absolute inset-0 z-30 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Unavailable while on Pro plan
                </p>
              </div>
            )}

            <CardHeader className="pb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4 border border-border">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">Enterprise</CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                Custom scaling, dedicated infrastructure, SLA, and strict
                compliance security.
              </CardDescription>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight">
                  $99
                </span>
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  / month
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-sm">
              <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Everything in Pro, plus
              </div>
              <ul className="space-y-3">
                <FeatureItem bold text="Unlimited Workflows & Projects" />
                <FeatureItem bold text="Full Vision OCR Table Extractor Suite" />
                <FeatureItem text="Dedicated execution engine & self-hosting" />
                <FeatureItem text="SSO / SAML & RBAC permission controls" />
                <FeatureItem text="Audit logging & compliance exports" />
                <FeatureItem text="99.99% Uptime SLA agreement" />
              </ul>
            </CardContent>
            <CardFooter className="pt-6 border-t border-border">
              {/* If user is logged out: DO NOT show upgrade button */}
              {!isLoggedIn ? (
                <div className="w-full text-center py-2 text-xs text-muted-foreground font-medium">
                  <Link
                    href="/auth/sign-in"
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in
                  </Link>{" "}
                  to view available upgrades
                </div>
              ) : isEnterpriseActive ? (
                /* If user already on Enterprise plan: HIDE upgrade button, show Current Plan badge */
                <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-sm font-semibold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Current Running Plan
                </div>
              ) : (
                /* Logged in with no plan: show upgrade button */
                <Button
                  variant="outline"
                  className="w-full font-medium cursor-pointer"
                  disabled={loadingPlan === "unixl-max" || isEnterpriseBlurred}
                  onClick={() => handleCheckout("unixl-max")}
                >
                  {loadingPlan === "unixl-max" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    "Upgrade to Enterprise"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FeatureItem({
  text,
  bold = false,
  tooltip,
}: {
  text: string;
  bold?: boolean;
  tooltip?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <span
        className={`leading-tight ${bold ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {text}
      </span>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 cursor-pointer hover:text-foreground mt-0.5" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </li>
  );
}
