import { supabase } from "@repo/db";

export class UserService {
  async getAllusers() {
    const { data: users, error } = await supabase.from("user").select("*");

    if (error) {
      console.error("Error fetching users:", error.message);
      throw error;
    }

    return users || [];
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
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Session statistics
    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      ...user,
      // Configured API key presence
      apiKeysConfigured: {
        gemini: !!user.geminiApiKey,
        openai: !!user.openaiApiKey,
        claude: !!user.claudeApiKey,
      },
      // Enriched workflow metadata
      workflows: {
        total: workflows.length,
        publicCount: workflows.filter((w) => w.isPublic).length,
        templateCount: workflows.filter((w) => w.isTemplate).length,
        latestCreated: sortedWorkflows[0]?.createdAt || null,
        list: workflows,
      },
      // Session and auth security status
      security: {
        activeSessions: sessions.filter(
          (s) => new Date(s.expiresAt) > new Date(),
        ).length,
        totalSessionsEver: sessions.length,
        lastActiveAt: sortedSessions[0]?.createdAt || null,
        connectedProviders: accounts.map((acc) => acc.providerId),
        verifications: verifications || [],
      },
    };
  }
}

export const userService = new UserService();
