import axios from "axios";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:3000";

export interface SubscriberItem {
  id: string;
  subscriptionId: string;
  userId: string | null;
  customerId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  emailVerified: boolean;
  userRole: string;
  userJoinedAt: string;
  status: "active" | "trialing" | "canceled" | "past_due" | "incomplete" | string;
  planId: string;
  planName: string;
  planSlug: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  startedAt: string;
  checkoutId: string | null;
  workflowsCount: number;
  activeSessionsCount: number;
  customerAddress?: any;
}

export interface SubscriberStats {
  totalSubscribers: number;
  activeSubscribers: number;
  trialingSubscribers: number;
  canceledSubscribers: number;
  totalMrr: number;
  newThisMonth: number;
  churnRate: string;
}

export interface SubscribersListResponse {
  success: boolean;
  data: SubscriberItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: SubscriberStats;
}

export interface SubscriberDetailResponse {
  success: boolean;
  data: {
    id: string;
    subscription: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      recurringInterval: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      trialStart: string | null;
      trialEnd: string | null;
      cancelAtPeriodEnd: boolean;
      canceledAt: string | null;
      startedAt: string;
      checkoutId: string | null;
      product: {
        id: string;
        name: string;
        description: string | null;
        isRecurring: boolean;
      };
    } | null;
    customer: {
      id: string | null;
      externalId: string | null;
      name: string;
      email: string | null;
      avatarUrl: string | null;
      emailVerified: boolean;
      role: string;
      joinedAt: string;
      updatedAt: string | null;
      billingAddress: any;
      taxId: string | null;
      country: string;
    };
    workflows: {
      total: number;
      publicCount: number;
      templateCount: number;
      list: Array<{
        id: string;
        name: string;
        slug: string | null;
        description: string | null;
        isPublic: boolean;
        isTemplate: boolean;
        tags: string[];
        createdAt: string;
        updatedAt: string;
      }>;
    };
    security: {
      activeSessionsCount: number;
      totalSessionsCount: number;
      sessions: Array<{
        id: string;
        token: string;
        ipAddress: string | null;
        userAgent: string | null;
        expiresAt: string;
        createdAt: string;
      }>;
      connectedProviders: string[];
      apiKeysConfigured: {
        gemini: boolean;
        openai: boolean;
        claude: boolean;
      };
    };
    orders: Array<{
      id: string;
      createdAt: string;
      status: string;
      amount: number;
      currency: string;
      billingReason: string;
      invoiceUrl: string | null;
    }>;
  };
}

export interface FetchSubscribersParams {
  search?: string;
  status?: string;
  plan?: string;
  joinedFrom?: string;
  joinedTo?: string;
  subscribedFrom?: string;
  subscribedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const subscribersApi = {
  async getSubscribers(params: FetchSubscribersParams = {}): Promise<SubscribersListResponse> {
    const res = await axios.get<SubscribersListResponse>(
      `${SERVER_URL}/api/v1/admin/subscribers`,
      { params }
    );
    return res.data;
  },

  async getSubscriberById(id: string): Promise<SubscriberDetailResponse> {
    const res = await axios.get<SubscriberDetailResponse>(
      `${SERVER_URL}/api/v1/admin/subscribers/${encodeURIComponent(id)}`
    );
    return res.data;
  },
};
