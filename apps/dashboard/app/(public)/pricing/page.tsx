"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, Building2, Sparkles, HelpCircle } from "lucide-react";
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
import { Switch } from "@repo/ui/components/ui/switch";
import { Label } from "@repo/ui/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { cn } from "@repo/ui/lib/utils";

export default function PricingSection({ className }: { className?: string }) {
  const [isAnnual, setIsAnnual] = React.useState(true);

  return (
    <section
      className={cn(
        "w-full pt-8 pb-20 sm:pt-16 sm:pb-38  bg-zinc-950 text-zinc-100 transition-colors duration-200 relative overflow-hidden",
        className,
      )}
    >
      {/* Subtle ambient light glow */}
      <div className="absolute top-20  left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-primary/10 blur-[140px] rounded-full pointer-events-none z-0" />

      <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <Badge
            variant="outline"
            className="px-3 py-1 rounded-full border-border bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider"
          >
            Flexible Billing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            Predictable pricing for workflow automation
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Scale your visual canvas seamlessly. Start building custom execution
            flows today with transparent limits.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center space-x-3 pt-4">
            <Label
              htmlFor="billing-toggle"
              className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label
              htmlFor="billing-toggle"
              className={`text-sm font-medium flex items-center gap-1.5 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Annual
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                Save 20%
              </span>
            </Label>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Free Starter */}
          <Card className="relative flex flex-col border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4 border border-border">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">Starter</CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                Ideal for exploring the ReactFlow visual editor and testing
                simple automations.
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
                <FeatureItem bold text="First 3 Workflows free" />
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
              <Link href="/auth/sign-in" className="w-full">
                <Button
                  variant="outline"
                  className="w-full font-medium cursor-pointer"
                >
                  Get Started Free
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Plan 2: Professional (Featured) */}
          <Card className="relative flex flex-col border-2 border-primary bg-card shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-sm">
              Most Popular
            </div>
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
                  ${isAnnual ? "29" : "36"}
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
                <FeatureItem bold text="Unlimited Workflows" />
                <FeatureItem bold text="Unlimited ReactFlow nodes" />
                <FeatureItem text="Custom node component integration" />
                <FeatureItem text="Full execution logs & history (30 days)" />
                <FeatureItem text="Priority email support" />
                <FeatureItem text="5 concurrent parallel executions" />
              </ul>
            </CardContent>
            <CardFooter className="pt-6 border-t border-border">
              <Link href="/auth/sign-in" className="w-full">
                <Button className="w-full font-medium shadow-sm cursor-pointer">
                  Upgrade to Pro
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Plan 3: Enterprise */}
          <Card className="relative flex flex-col border-border bg-card shadow-sm hover:shadow-md transition-shadow">
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
                  ${isAnnual ? "99" : "119"}
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
                <FeatureItem bold text="Unlimited Workflows & Nodes" />
                <FeatureItem text="Dedicated execution engine & self-hosting" />
                <FeatureItem text="SSO / SAML & RBAC permission controls" />
                <FeatureItem text="Audit logging & compliance exports" />
                <FeatureItem text="99.99% Uptime SLA agreement" />
                <FeatureItem text="Dedicated Account Manager & 24/7 Slack support" />
              </ul>
            </CardContent>
            <CardFooter className="pt-6 border-t border-border">
              <Link href="/help" className="w-full">
                <Button
                  variant="outline"
                  className="w-full font-medium cursor-pointer"
                >
                  Contact Enterprise Team
                </Button>
              </Link>
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
