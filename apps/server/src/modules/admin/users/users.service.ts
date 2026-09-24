import { supabase } from "@repo/db";

export interface UserFilters {
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

export class UserService {
  async getAllusers(filters: UserFilters = {}) {
    const {
      search = "",
      role = "all",
      emailVerified = "all",
      joinedFrom,
      joinedTo,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

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
        geminiApiKey,
        openaiApiKey,
        claudeApiKey,
        workflows:workflow (
          id,
          name,
          isPublic,
          isTemplate,
          createdAt
        ),
        sessions:session (
          id,
          expiresAt,
          createdAt
        ),
        accounts:account (
          id,
          providerId
        )
      `);

    if (error) {
      console.error("Error fetching users:", error.message);
      throw error;
    }

    const allUsers = (users || []).map((u: any) => {
      const workflows = u.workflows || [];
      const sessions = u.sessions || [];
      const accounts = u.accounts || [];

      const activeSessions = sessions.filter(
        (s: any) => new Date(s.expiresAt) > new Date()
      );

      const sortedSessions = [...sessions].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        id: u.id,
        name: u.name || "Anonymous",
        email: u.email,
        emailVerified: Boolean(u.emailVerified),
        image: u.image || null,
        role: u.role || "USER",
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        workflowsCount: workflows.length,
        publicWorkflowsCount: workflows.filter((w: any) => w.isPublic).length,
        activeSessionsCount: activeSessions.length,
        lastActiveAt: sortedSessions[0]?.createdAt || null,
        providers: accounts.map((a: any) => a.providerId),
        apiKeysConfigured: {
          gemini: !!u.geminiApiKey,
          openai: !!u.openaiApiKey,
          claude: !!u.claudeApiKey,
        },
      };
    });

    // Filtering
    let filtered = allUsers.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesId = u.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }

      if (role && role !== "all") {
        if (u.role.toLowerCase() !== role.toLowerCase()) return false;
      }

      if (emailVerified !== undefined && emailVerified !== "all") {
        const boolVal = emailVerified === true || emailVerified === "true";
        if (u.emailVerified !== boolVal) return false;
      }

      if (joinedFrom) {
        if (new Date(u.createdAt).getTime() < new Date(joinedFrom).getTime()) return false;
      }

      if (joinedTo) {
        const endOfDay = new Date(joinedTo).setHours(23, 59, 59, 999);
        if (new Date(u.createdAt).getTime() > endOfDay) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "createdAt") {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "workflowsCount") {
        comparison = b.workflowsCount - a.workflowsCount;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    // KPI Stats calculation
    const totalUsers = allUsers.length;
    const verifiedUsers = allUsers.filter((u) => u.emailVerified).length;
    const adminUsers = allUsers.filter((u) => u.role === "ADMIN").length;
    const totalWorkflows = allUsers.reduce((sum, u) => sum + u.workflowsCount, 0);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const activeThisWeek = allUsers.filter(
      (u) => u.lastActiveAt && new Date(u.lastActiveAt).getTime() >= oneWeekAgo
    ).length;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.max(1, Number(limit));
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return {
      users: paginated,
      pagination: {
        total: filtered.length,
        page: pageNum,
        limit: pageSize,
        totalPages,
      },
      stats: {
        totalUsers,
        verifiedUsers,
        adminUsers,
        totalWorkflows,
        activeThisWeek,
      },
    };
  }

  async getUserById(id: string) {
    const { data: user, error } = await supabase
      .from("user")
      .select(
        `
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
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user by ID:", error.message);
      throw error;
    }

    if (!user) return null;

    // Fetch unlinked verifications by email
    const { data: verifications } = await supabase
      .from("verification")
      .select("*")
      .eq("identifier", user.email);

    const workflows = user.workflows || [];
    const sessions = user.sessions || [];
    const accounts = user.accounts || [];

    // Workflow statistics
    const sortedWorkflows = [...workflows].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Session statistics
    const sortedSessions = [...sessions].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      ...user,
      apiKeysConfigured: {
        gemini: !!user.geminiApiKey,
        openai: !!user.openaiApiKey,
        claude: !!user.claudeApiKey,
      },
      workflows: {
        total: workflows.length,
        publicCount: workflows.filter((w: any) => w.isPublic).length,
        templateCount: workflows.filter((w: any) => w.isTemplate).length,
        latestCreated: sortedWorkflows[0]?.createdAt || null,
        list: sortedWorkflows,
      },
      security: {
        activeSessions: sessions.filter(
          (s: any) => new Date(s.expiresAt) > new Date(),
        ).length,
        totalSessionsEver: sessions.length,
        lastActiveAt: sortedSessions[0]?.createdAt || null,
        connectedProviders: accounts.map((acc: any) => acc.providerId),
        sessions: sortedSessions,
        verifications: verifications || [],
      },
    };
  }
}

export const userService = new UserService();
