"use client";

import React from "react";
import { SubscriptionBillingPage } from "./billingUi";
import PricingSection from "@/app/(public)/pricing/page";

type Props = {};

const Billing = (props: Props) => {
  return (
    <div className="px-10 pb-30">
      <PricingSection className="sm:pb-28" />
      <SubscriptionBillingPage />
    </div>
  );
};

export default Billing;
