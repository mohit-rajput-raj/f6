import React from "react";
import { Check, Minus } from "lucide-react";

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    period: string;
    popular?: boolean;
    features: { text: string; included: boolean }[];
    buttonText: string;
    buttonVariant: "default" | "outline";
}

const plans: PricingPlan[] = [
    {
        name: "Starter",
        description: "Essential AI tools for hobbyists and individual creators.",
        price: "$19",
        period: "/mo",
        popular: false,
        features: [
            { text: "50+ Tools access", included: true },
            { text: "Standard inference models", included: true },
            { text: "Community support channel", included: true },
            { text: "Custom API key integration", included: false },
            { text: "Advanced prompt chaining", included: false },
        ],
        buttonText: "Current Plan",
        buttonVariant: "outline",
    },
    {
        name: "Pro Intelligence",
        description: "High-performance intelligence engine for professional developers.",
        price: "$49",
        period: "/mo",
        popular: true, // Moderate tier with fluctuating animation
        features: [
            { text: "500,000 Token credits/mo", included: true },
            { text: "Priority access to flagship models", included: true },
            { text: "Full API & Webhook access", included: true },
            { text: "Custom system prompt storage", included: true },
            { text: "Dedicated tenant support", included: false },
        ],
        buttonText: "Upgrade to Pro",
        buttonVariant: "default",
    },
    {
        name: "Enterprise",
        description: "Maximum scalability, security, and dedicated infrastructure.",
        price: "$199",
        period: "/mo",
        popular: false,
        features: [
            { text: "Unlimited high-speed tokens", included: true },
            { text: "Custom LLM fine-tuning", included: true },
            { text: "Zero-data retention guarantee", included: true },
            { text: "Dedicated account manager", included: true },
            { text: "SLA 99.99% uptime guarantee", included: true },
        ],
        buttonText: "Contact Sales",
        buttonVariant: "outline",
    },
];

export function SubscriptionBillingPage() {
    return (
        <div className="mx-auto max-w-5xl px-4 py-12 text-foreground bg-background">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Choose Your AI Plan
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Scale your intelligence pipeline with transparent, predictable pricing.
                </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
                {plans.map((plan, index) => (
                    <div
                        key={index}
                        className={`relative flex flex-col rounded-xl bg-card p-6 border border-border shadow-lg transition-all ${plan.popular
                            ? "border-primary ring-2 ring-primary/20 shadow-primary/10 animate-pulse"
                            : "hover:border-muted-foreground/40"
                            }`}
                    >
                        {plan.popular && (
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
                                    className={`flex items-center ${feature.included ? "text-foreground" : "text-muted-foreground"
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
                            className={`w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${plan.buttonVariant === "default"
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground"
                                }`}
                        >
                            {plan.buttonText}
                        </button>
                    </div>
                ))}
            </div>

            {/* Billing Profile Footer */}
            <div className="mt-12 rounded-xl bg-card border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                    <h4 className="text-sm font-semibold">Active Billing Profile</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Next automatic renewal on August 15, 2026 via Visa ending in ••42
                    </p>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active Subscription
                </div>
            </div>
        </div>
    );
}