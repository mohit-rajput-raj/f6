import axios from "axios";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:3000";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  workflowsCount: number;
  publicWorkflowsCount: number;
  activeSessionsCount: number;
  lastActiveAt: string | null;
  providers: string[];
  apiKeysConfigured: {
    gemini: boolean;
    openai: boolean;
    claude: boolean;
  };
}

export interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  adminUsers: number;
  totalWorkflows: number;
  activeThisWeek: number;
}

export interface UsersListResponse {
  success: boolean;
  data: UserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: UserStats;
}

export interface UserDetailResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
    geminiApiKey: string | null;
    openaiApiKey: string | null;
    claudeApiKey: string | null;
    apiKeysConfigured: {
      gemini: boolean;
      openai: boolean;
      claude: boolean;
    };
    workflows: {
      total: number;
      publicCount: number;
      templateCount: number;
      latestCreated: string | null;
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
      activeSessions: number;
      totalSessionsEver: number;
      lastActiveAt: string | null;
      connectedProviders: string[];
      sessions: Array<{
        id: string;
        token: string;
        ipAddress: string | null;
        userAgent: string | null;
        expiresAt: string;
        createdAt: string;
      }>;
      verifications: Array<{
        id: string;
        identifier: string;
        value: string;
        expiresAt: string;
        createdAt: string;
      }>;
    };
  };
}

export interface FetchUsersParams {
  search?: string;
  role?: string;
  emailVerified?: boolean | string;
  joinedFrom?: string;
  joinedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name" | "workflowsCount";
  sortOrder?: "asc" | "desc";
}

export const usersApi = {
  async getUsers(params: FetchUsersParams = {}): Promise<UsersListResponse> {
    const res = await axios.get<UsersListResponse>(
      `${SERVER_URL}/api/v1/admin/users`,
      { params }
    );
    return res.data;
  },

  async getUserById(id: string): Promise<UserDetailResponse> {
    const res = await axios.get<UserDetailResponse>(
      `${SERVER_URL}/api/v1/admin/user/${encodeURIComponent(id)}`
    );
    return res.data;
  },
};
