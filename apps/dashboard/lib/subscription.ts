import { supabase } from "@repo/db";

export const POLAR_PLANS = {
  PRO: {
    productId: "a86682d6-d92a-40cd-a609-7553674ef59f",
    slug: "unixl-pro",
    name: "Pro",
    maxProjects: 20,
    hasOcr: true,
  },
  MAX: {
    productId: "9ca97042-81a0-47ac-8f32-541edf03dabb",
    slug: "unixl-max",
    name: "Enterprise",
    maxProjects: Infinity,
    hasOcr: true,
  },
} as const;

export type PlanType = "pro" | "max" | "free";

export interface UserSubscriptionDetails {
  hasActivePlan: boolean;
  plan: PlanType;
  planSlug: string | null;
  planName: string;
  isPro: boolean;
  isMax: boolean;
  maxProjects: number;
  hasOcrAccess: boolean;
}

/**
 * Determine plan slug / type from product ID or slug or name.
 */
export function identifyPlan(identifier?: string | null): PlanType {
  if (!identifier) return "free";
  const lower = identifier.toLowerCase();
  if (
    lower === POLAR_PLANS.PRO.productId.toLowerCase() ||
    lower === POLAR_PLANS.PRO.slug.toLowerCase() ||
    lower.includes("pro")
  ) {
    return "pro";
  }
  if (
    lower === POLAR_PLANS.MAX.productId.toLowerCase() ||
    lower === POLAR_PLANS.MAX.slug.toLowerCase() ||
    lower.includes("max") ||
    lower.includes("enterprise")
  ) {
    return "max";
  }
  return "free";
}

/**
 * Server-side helper to check a user's subscription status and permissions.
 */
export async function getUserSubscriptionDetails(
  userId?: string
): Promise<UserSubscriptionDetails> {
  const freeDetails: UserSubscriptionDetails = {
    hasActivePlan: false,
    plan: "free",
    planSlug: null,
    planName: "Free Starter",
    isPro: false,
    isMax: false,
    maxProjects: 3,
    hasOcrAccess: false,
  };

  if (!userId) return freeDetails;

  try {
    // 1. Check database subscription table
    const { data: dbSub } = await supabase
      .from("subscription")
      .select("*, plan(*)")
      .eq("userId", userId)
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbSub) {
      const planName = dbSub.plan?.name || "";
      const planType = identifyPlan(planName);
      if (planType === "max") {
        return {
          hasActivePlan: true,
          plan: "max",
          planSlug: POLAR_PLANS.MAX.slug,
          planName: POLAR_PLANS.MAX.name,
          isPro: false,
          isMax: true,
          maxProjects: POLAR_PLANS.MAX.maxProjects,
          hasOcrAccess: true,
        };
      }
      return {
        hasActivePlan: true,
        plan: "pro",
        planSlug: POLAR_PLANS.PRO.slug,
        planName: POLAR_PLANS.PRO.name,
        isPro: true,
        isMax: false,
        maxProjects: POLAR_PLANS.PRO.maxProjects,
        hasOcrAccess: true,
      };
    }

    // 2. Check if user is an ADMIN (Admins get enterprise capabilities)
    const { data: userRow } = await supabase
      .from("user")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (userRow?.role === "ADMIN" || userRow?.role === "SUPERADMIN") {
      return {
        hasActivePlan: true,
        plan: "max",
        planSlug: POLAR_PLANS.MAX.slug,
        planName: "Admin (Enterprise)",
        isPro: false,
        isMax: true,
        maxProjects: Infinity,
        hasOcrAccess: true,
      };
    }
  } catch (err) {
    console.warn("Could not check DB subscription for user:", err);
  }

  return freeDetails;
}
