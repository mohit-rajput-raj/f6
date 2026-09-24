"use client";

import React, { useEffect, useState } from "react";
import { Check, Minus, Loader2, Crown, ExternalLink } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface Subscription {
  id: string;
  productId: string;
  status: string;
  currentPeriodEnd?: string;
  product?: {
    name?: string;
  };
}

interface CustomerState {
  subscriptions?: Subscription[];
}

interface PricingPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  buttonText: string;
  buttonVariant: "default" | "outline";
  slug: string;
  productId: string;
}

const plans: PricingPlan[] = [
  {
    name: "Pro",
    description:
      "Full power for developers and small teams building complex production flows.",
    price: "$29",
    period: "/mo",
    popular: true,
    features: [
      { text: "Unlimited Workflows", included: true },
      { text: "Unlimited ReactFlow nodes", included: true },
      { text: "Custom node component integration", included: true },
      { text: "Full execution logs & history (30 days)", included: true },
      { text: "Priority email support", included: true },
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default",
    slug: "unixl-pro",
    productId: "a86682d6-d92a-40cd-a609-7553674ef59f",
  },
  {
    name: "Max",
    description:
      "Maximum scalability, security, and dedicated infrastructure.",
    price: "$99",
    period: "/mo",
    popular: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Dedicated execution engine & self-hosting", included: true },
      { text: "SSO / SAML & RBAC permission controls", included: true },
      { text: "Audit logging & compliance exports", included: true },
      { text: "99.99% Uptime SLA agreement", included: true },
    ],
    buttonText: "Upgrade to Max",
    buttonVariant: "outline",
    slug: "unixl-max",
    productId: "9ca97042-81a0-47ac-8f32-541edf03dabb",
  },
];

export function SubscriptionBillingPage() {
  const [customerState, setCustomerState] = useState<CustomerState | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchCustomerState();
  }, []);

  const fetchCustomerState = async () => {
    try {
      setLoading(true);
      const { data } = await (authClient as any).customer.state();
      setCustomerState(data);
    } catch (error) {
      console.error("Failed to fetch customer state:", error);
      // User might not be a Polar customer yet — that's fine
      setCustomerState(null);
    } finally {
      setLoading(false);
    }
  };

  const activeSubscription = customerState?.subscriptions?.find(
    (sub: Subscription) => sub.status === "active"
  );

  const activePlanProductId = activeSubscription?.productId;

  const handleCheckout = async (slug: string) => {
    try {
      setCheckoutLoading(slug);
      await (authClient as any).checkout({ slug });
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      setPortalLoading(true);
      await (authClient as any).customer.portal();
    } catch (error: any) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal.");
      setPortalLoading(false);
    }
  };

  const getButtonContent = (plan: PricingPlan) => {
    const isCurrentPlan = activePlanProductId === plan.productId;
    const isLoading = checkoutLoading === plan.slug;

    if (isCurrentPlan) {
      return {
        text: "Current Plan",
        disabled: true,
        variant: "outline" as const,
      };
    }
    if (isLoading) {
      return {
        text: (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting...
          </span>
        ),
        disabled: true,
        variant: plan.buttonVariant,
      };
    }
    return {
      text: plan.buttonText,
      disabled: false,
      variant: plan.buttonVariant,
    };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-foreground">
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading subscription info...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-foreground bg-background">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your Subscription
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your plan and billing details.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-stretch max-w-3xl mx-auto">
        {plans.map((plan, index) => {
          const isCurrentPlan = activePlanProductId === plan.productId;
          const btn = getButtonContent(plan);

          return (
            <div
              key={index}
              className={`relative flex flex-col rounded-xl bg-card p-6 border shadow-lg transition-all ${
                isCurrentPlan
                  ? "border-primary ring-2 ring-primary/20 shadow-primary/10"
                  : plan.popular
                    ? "border-primary/50 hover:border-primary"
                    : "border-border hover:border-muted-foreground/40"
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Crown className="w-3 h-3" />
                  Active Plan
                </div>
              )}
              {!isCurrentPlan && plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 pb-4 border-b border-border flex items-baseline">
                <span className="text-3xl font-extrabold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1 text-xs">
                {plan.features.map((feature, fIndex) => (
                  <li
                    key={fIndex}
                    className={`flex items-center ${
                      feature.included
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {feature.included ? (
                      <Check className="w-4 h-4 text-primary mr-2 shrink-0" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                    )}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={btn.disabled}
                onClick={() => !btn.disabled && handleCheckout(plan.slug)}
                className={`w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${
                  isCurrentPlan
                    ? "border border-primary/30 bg-primary/10 text-primary cursor-default"
                    : btn.variant === "default"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      : "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {btn.text}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing Profile Footer */}
      <div className="mt-12 rounded-xl bg-card border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-sm font-semibold">Billing Management</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeSubscription
              ? `You're subscribed to ${
                  plans.find((p) => p.productId === activePlanProductId)
                    ?.name || "a plan"
                }. Manage your subscription, invoices, and payment methods.`
              : "You don't have an active subscription yet. Choose a plan above to get started."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubscription && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </div>
          )}
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium border border-border bg-card hover:bg-accent transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {portalLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            Manage Billing
          </button>
        </div>
      </div>
    </div>
  );
}