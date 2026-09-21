import React from "react";
import { SubscriptionBillingPage } from "./billingUi";
import PricingSection from "@/app/(public)/pricing/page";

type Props = {};

const Billing = (props: Props) => {
  return (
    <div className="px-10 pb-30">
      <PricingSection className="sm:pb-28" />
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
      </div>{" "}
    </div>
  );
};

export default Billing;
