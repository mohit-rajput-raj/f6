import { Polar } from "@polar-sh/sdk";
import { supabase } from "@repo/db";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "polar_oat_DZgjDQiO9mToOvhnirS1c0UsUW5aoPvUY0G8E2xBlh9",
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
});

export interface SubscriberFilters {
  search?: string;
  status?: string;
  plan?: string;
  joinedFrom?: string;
  joinedTo?: string;
  subscribedFrom?: string;
  subscribedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: "startedAt" | "userJoinedAt" | "amount" | "userName";
  sortOrder?: "asc" | "desc";
}

export class SubscribersService {
  /**
   * Fetch all subscribers with combined Polar subscriptions + Supabase user data
   */
  async getSubscribers(filters: SubscriberFilters = {}) {
    const {
      search = "",
      status = "all",
      plan = "all",
      joinedFrom,
      joinedTo,
      subscribedFrom,
      subscribedTo,
      page = 1,
      limit = 10,
      sortBy = "startedAt",
      sortOrder = "desc",
    } = filters;

    // 1. Fetch live subscriptions from Polar
    let polarSubs: any[] = [];
    try {
      const res = await polarClient.subscriptions.list({ limit: 100 });
      polarSubs = res.result?.items || [];
    } catch (e: any) {
      console.error("[SubscribersService] Polar subs list error:", e.message || e);
    }

    // 2. Fetch users and workflows from Supabase DB
    let dbUsers: any[] = [];
    try {
      const { data: users, error } = await supabase
        .from("user")
        .select(`
          id,
          name,
          email,
          emailVerified,
          image,
          role,
          createdAt,
          updatedAt,
          workflows:workflow (id, name, isPublic, createdAt),
          sessions:session (id, expiresAt)
        `);
      if (!error && users) {
        dbUsers = users;
      }
    } catch (e: any) {
      console.error("[SubscribersService] Supabase fetch error:", e.message || e);
    }

    // Map DB users by ID and email for instant O(1) lookup
    const userById = new Map<string, any>();
    const userByEmail = new Map<string, any>();
    for (const u of dbUsers) {
      if (u.id) userById.set(u.id, u);
      if (u.email) userByEmail.set(u.email.toLowerCase(), u);
    }

    // 3. Transform & stitch data together
    const unifiedSubscribers = polarSubs.map((sub: any) => {
      const customer = sub.customer || {};
      const product = sub.product || {};

      // Match linked DB user
      const linkedUser =
        (customer.externalId ? userById.get(customer.externalId) : null) ||
        (customer.email ? userByEmail.get(customer.email.toLowerCase()) : null) ||
        null;

      const userName = linkedUser?.name || customer.name || customer.billingName || "Anonymous User";
      const userEmail = linkedUser?.email || customer.email || "No email";
      const userAvatar = linkedUser?.image || customer.avatarUrl || null;
      const userJoinedAt = linkedUser?.createdAt || customer.createdAt || sub.createdAt;
      const emailVerified = linkedUser?.emailVerified ?? customer.emailVerified ?? false;
      const userRole = linkedUser?.role || "USER";

      // Price calculation
      const amountVal = typeof sub.amount === "number" ? sub.amount / 100 : 0;
      const planName = product.name || (amountVal >= 90 ? "unixl-max" : "unixl-pro");
      const planSlug = planName.toLowerCase().replace(/\s+/g, "-");

      const workflows = linkedUser?.workflows || [];
      const sessions = linkedUser?.sessions || [];
      const activeSessionsCount = sessions.filter(
        (s: any) => new Date(s.expiresAt) > new Date()
      ).length;

      return {
        id: sub.id,
        subscriptionId: sub.id,
        userId: linkedUser?.id || customer.externalId || null,
        customerId: customer.id || sub.customerId,
        userName,
        userEmail,
        userAvatar,
        emailVerified,
        userRole,
        userJoinedAt,
        status: (sub.status || "active").toLowerCase(),
        planId: sub.productId || product.id,
        planName,
        planSlug,
        amount: amountVal,
        currency: (sub.currency || "USD").toUpperCase(),
        recurringInterval: sub.recurringInterval || "month",
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialStart: sub.trialStart || null,
        trialEnd: sub.trialEnd || null,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        canceledAt: sub.canceledAt || null,
        startedAt: sub.startedAt || sub.createdAt,
        checkoutId: sub.checkoutId || null,
        workflowsCount: workflows.length,
        activeSessionsCount,
        customerAddress: customer.billingAddress || null,
      };
    });

    // 4. Apply filters
    let filtered = unifiedSubscribers.filter((item) => {
      // Universal search: ID, email, name, subscriptionId, customerId
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = item.userName.toLowerCase().includes(q);
        const matchesEmail = item.userEmail.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesUserId = item.userId ? item.userId.toLowerCase().includes(q) : false;
        const matchesCustomerId = item.customerId ? item.customerId.toLowerCase().includes(q) : false;
        const matchesPlan = item.planName.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesUserId && !matchesCustomerId && !matchesPlan) {
          return false;
        }
      }

      // Status filter
      if (status && status !== "all") {
        if (item.status !== status.toLowerCase()) {
          return false;
        }
      }

      // Plan filter
      if (plan && plan !== "all") {
        if (!item.planSlug.includes(plan.toLowerCase()) && !item.planName.toLowerCase().includes(plan.toLowerCase())) {
          return false;
        }
      }

      // Joined date range
      if (joinedFrom) {
        const itemJoin = new Date(item.userJoinedAt).getTime();
        const fromDate = new Date(joinedFrom).getTime();
        if (itemJoin < fromDate) return false;
      }
      if (joinedTo) {
        const itemJoin = new Date(item.userJoinedAt).getTime();
        // End of day for joinedTo
        const toDate = new Date(joinedTo).setHours(23, 59, 59, 999);
        if (itemJoin > toDate) return false;
      }

      // Subscribed date range
      if (subscribedFrom) {
        const itemSub = new Date(item.startedAt).getTime();
        const fromDate = new Date(subscribedFrom).getTime();
        if (itemSub < fromDate) return false;
      }
      if (subscribedTo) {
        const itemSub = new Date(item.startedAt).getTime();
        const toDate = new Date(subscribedTo).setHours(23, 59, 59, 999);
        if (itemSub > toDate) return false;
      }

      return true;
    });

    // 5. Calculate KPI Metrics over the filtered dataset
    const totalSubscribers = filtered.length;
    const activeSubscribers = filtered.filter((s) => s.status === "active").length;
    const trialingSubscribers = filtered.filter((s) => s.status === "trialing").length;
    const canceledSubscribers = filtered.filter((s) => s.status === "canceled").length;
    const totalMrr = filtered
      .filter((s) => s.status === "active" || s.status === "trialing")
      .reduce((acc, curr) => acc + curr.amount, 0);

    // New this month
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = filtered.filter((s) => new Date(s.startedAt).getTime() >= startOfCurrentMonth).length;

    const churnRate = totalSubscribers > 0 ? ((canceledSubscribers / totalSubscribers) * 100).toFixed(1) : "0.0";

    // 6. Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "startedAt") {
        comparison = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      } else if (sortBy === "userJoinedAt") {
        comparison = new Date(b.userJoinedAt).getTime() - new Date(a.userJoinedAt).getTime();
      } else if (sortBy === "amount") {
        comparison = b.amount - a.amount;
      } else if (sortBy === "userName") {
        comparison = a.userName.localeCompare(b.userName);
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    // 7. Pagination
    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.max(1, Number(limit));
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginatedSubscribers = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return {
      subscribers: paginatedSubscribers,
      pagination: {
        total: filtered.length,
        page: pageNum,
        limit: pageSize,
        totalPages,
      },
      stats: {
        totalSubscribers,
        activeSubscribers,
        trialingSubscribers,
        canceledSubscribers,
        totalMrr,
        newThisMonth,
        churnRate: `${churnRate}%`,
      },
    };
  }

  /**
   * Fetch full 360-degree details for a subscriber by subscription ID, customer ID, or user ID
   */
  async getSubscriberById(id: string) {
    if (!id) return null;

    // 1. Fetch all Polar subscriptions to find matching one
    let targetSub: any = null;
    let customerOrders: any[] = [];
    try {
      const res = await polarClient.subscriptions.list({ limit: 100 });
      const items = res.result?.items || [];
      targetSub = items.find(
        (s: any) =>
          s.id === id ||
          s.customerId === id ||
          s.customer?.id === id ||
          s.customer?.externalId === id
      );
    } catch (e: any) {
      console.error("[SubscribersService] Failed to find Polar subscription:", e.message || e);
    }

    const customer = targetSub?.customer || {};
    const externalUserId = customer.externalId || (targetSub ? null : id);
    const customerEmail = customer.email;

    // 2. Fetch customer orders / invoices from Polar if customer ID available
    if (customer.id || targetSub?.customerId) {
      try {
        const orderRes = await polarClient.orders.list({
          customerId: customer.id || targetSub.customerId,
          limit: 20,
        });
        customerOrders = orderRes.result?.items || [];
      } catch (e: any) {
        console.warn("[SubscribersService] Failed to fetch customer orders from Polar:", e.message || e);
      }
    }

    // 3. Fetch comprehensive user info from Supabase
    let dbUser: any = null;
    try {
      let query = supabase
        .from("user")
        .select(`
          id,
          name,
          email,
          emailVerified,
          image,
          role,
          createdAt,
          updatedAt,
          geminiApiKey,
          openaiApiKey,
          claudeApiKey,
          workflows:workflow (
            id,
            name,
            slug,
            description,
            isPublic,
            isTemplate,
            tags,
            createdAt,
            updatedAt
          ),
          sessions:session (
            id,
            token,
            ipAddress,
            userAgent,
            expiresAt,
            createdAt
          ),
          accounts:account (
            id,
            providerId,
            createdAt
          )
        `);

      if (externalUserId) {
        const { data, error } = await query.eq("id", externalUserId).maybeSingle();
        if (!error && data) dbUser = data;
      }

      if (!dbUser && customerEmail) {
        const { data, error } = await query.eq("email", customerEmail).maybeSingle();
        if (!error && data) dbUser = data;
      }
    } catch (e: any) {
      console.error("[SubscribersService] Supabase user detail error:", e.message || e);
    }

    if (!targetSub && !dbUser) {
      return null;
    }

    // 4. Construct unified detailed response
    const product = targetSub?.product || {};
    const amountVal = typeof targetSub?.amount === "number" ? targetSub.amount / 100 : 0;
    const planName = product.name || (amountVal >= 90 ? "unixl-max" : "unixl-pro");
    const workflows = dbUser?.workflows || [];
    const sessions = dbUser?.sessions || [];
    const accounts = dbUser?.accounts || [];

    const activeSessions = sessions.filter(
      (s: any) => new Date(s.expiresAt) > new Date()
    );

    const sortedWorkflows = [...workflows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      id: targetSub?.id || id,
      subscription: targetSub
        ? {
            id: targetSub.id,
            status: targetSub.status,
            amount: amountVal,
            currency: (targetSub.currency || "USD").toUpperCase(),
            recurringInterval: targetSub.recurringInterval || "month",
            currentPeriodStart: targetSub.currentPeriodStart,
            currentPeriodEnd: targetSub.currentPeriodEnd,
            trialStart: targetSub.trialStart || null,
            trialEnd: targetSub.trialEnd || null,
            cancelAtPeriodEnd: Boolean(targetSub.cancelAtPeriodEnd),
            canceledAt: targetSub.canceledAt || null,
            startedAt: targetSub.startedAt || targetSub.createdAt,
            checkoutId: targetSub.checkoutId || null,
            product: {
              id: product.id || targetSub.productId,
              name: planName,
              description: product.description || null,
              isRecurring: product.isRecurring ?? true,
            },
          }
        : null,
      customer: {
        id: customer.id || null,
        externalId: customer.externalId || dbUser?.id || null,
        name: dbUser?.name || customer.name || customer.billingName || "Anonymous User",
        email: dbUser?.email || customer.email || null,
        avatarUrl: dbUser?.image || customer.avatarUrl || null,
        emailVerified: dbUser?.emailVerified ?? customer.emailVerified ?? false,
        role: dbUser?.role || "USER",
        joinedAt: dbUser?.createdAt || customer.createdAt || targetSub?.createdAt,
        updatedAt: dbUser?.updatedAt || customer.modifiedAt || null,
        billingAddress: customer.billingAddress || null,
        taxId: customer.taxId || null,
        country: customer.billingAddress?.country || "IN",
      },
      workflows: {
        total: workflows.length,
        publicCount: workflows.filter((w: any) => w.isPublic).length,
        templateCount: workflows.filter((w: any) => w.isTemplate).length,
        list: sortedWorkflows,
      },
      security: {
        activeSessionsCount: activeSessions.length,
        totalSessionsCount: sessions.length,
        sessions: sessions.slice(0, 10),
        connectedProviders: accounts.map((acc: any) => acc.providerId),
        apiKeysConfigured: {
          gemini: !!dbUser?.geminiApiKey,
          openai: !!dbUser?.openaiApiKey,
          claude: !!dbUser?.claudeApiKey,
        },
      },
      orders: customerOrders.map((o: any) => ({
        id: o.id,
        createdAt: o.createdAt,
        status: o.status || "paid",
        amount: typeof o.amount === "number" ? o.amount / 100 : 0,
        currency: (o.currency || "USD").toUpperCase(),
        billingReason: o.billingReason || "subscription_cycle",
        invoiceUrl: o.invoiceUrl || null,
      })),
    };
  }
}

export const subscribersService = new SubscribersService();
