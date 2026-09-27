"use client";

import { useEffect, useState, useCallback } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  POLAR_PLANS,
  identifyPlan,
  type PlanType,
} from "./subscription";

export interface UserSubscriptionState {
  isLoading: boolean;
  isLoggedIn: boolean;
  hasActivePlan: boolean;
  plan: PlanType;
  planSlug: string | null;
  planName: string;
  isPro: boolean;
  isMax: boolean;
  maxProjects: number;
  hasOcrAccess: boolean;
  activeSubscription: any | null;
  refetch: () => Promise<void>;
}

export function useUserSubscription(): UserSubscriptionState {
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [plan, setPlan] = useState<PlanType>("free");

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setActiveSub(null);
      setPlan("free");
      return;
    }

    try {
      setIsLoading(true);
      // Query Polar customer state via better-auth polar plugin
      const res = await (authClient as any).customer.state();
      const customerData = res?.data;
      const subscriptions: any[] = customerData?.subscriptions || [];

      // Find an active subscription
      const foundActive = subscriptions.find(
        (sub: any) =>
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "ACTIVE"
      );

      if (foundActive) {
        setActiveSub(foundActive);
        const resolvedPlan = identifyPlan(
          foundActive.productId ||
            foundActive.product?.name ||
            foundActive.product?.slug
        );
        setPlan(resolvedPlan);
      } else {
        setActiveSub(null);
        setPlan("free");
      }
    } catch (err) {
      console.warn("Failed to fetch customer subscription state:", err);
      setActiveSub(null);
      setPlan("free");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isSessionPending) {
      fetchSubscription();
    }
  }, [isSessionPending, fetchSubscription]);

  const isLoggedIn = !!userId;
  const hasActivePlan = plan !== "free";
  const isPro = plan === "pro";
  const isMax = plan === "max";
  const planSlug = isPro
    ? POLAR_PLANS.PRO.slug
    : isMax
    ? POLAR_PLANS.MAX.slug
    : null;
  const planName = isPro
    ? POLAR_PLANS.PRO.name
    : isMax
    ? POLAR_PLANS.MAX.name
    : "Free Starter";
  const maxProjects = isPro
    ? POLAR_PLANS.PRO.maxProjects
    : isMax
    ? POLAR_PLANS.MAX.maxProjects
    : 3;
  const hasOcrAccess = true;

  return {
    isLoading: isSessionPending || isLoading,
    isLoggedIn,
    hasActivePlan,
    plan,
    planSlug,
    planName,
    isPro,
    isMax,
    maxProjects,
    hasOcrAccess,
    activeSubscription: activeSub,
    refetch: fetchSubscription,
  };
}
