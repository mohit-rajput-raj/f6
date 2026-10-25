"use server";

import { supabase } from "@repo/db";

export interface DashboardMetrics {
  kpis: {
    totalUsers: number;
    verifiedUsers: number;
    totalOrganizers: number;
    totalOrganizations: number;
    totalMembers: number;
    totalDesks: number;
    totalWorkflows: number;
    totalSubscriptions: number;
    totalAuditLogs: number;
    errorLogsCount: number;
    pendingJoinRequests: number;
  };
  topOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    ownerEmail: string;
    location?: string | null;
    membersCount: number;
    groupsCount: number;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    level: string;
    source: string;
    details?: any;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
    createdAt: string;
  }>;
}

export async function fetchAdminDashboardStatsAction(): Promise<{
  success: boolean;
  data?: DashboardMetrics;
  error?: string;
}> {
  try {
    const [
      { count: usersCount },
      { count: verifiedUsersCount },
      { count: organizersCount },
      { count: orgsCount },
      { count: membersCount },
      { count: groupsCount },
      { count: workflowsCount },
      { count: subsCount },
      { count: auditCount },
      { count: errorLogsCount },
      { count: pendingJoinRequests },
      { data: orgs },
      { data: recentLogs },
      { data: recentUsers },
    ] = await Promise.all([
      supabase.from("user").select("id", { count: "exact", head: true }),
      supabase.from("user").select("id", { count: "exact", head: true }).eq("emailVerified", true),
      supabase.from("organizer").select("id", { count: "exact", head: true }),
      supabase.from("organization").select("id", { count: "exact", head: true }),
      supabase.from("organization_member").select("id", { count: "exact", head: true }),
      supabase.from("organization_group").select("id", { count: "exact", head: true }),
      supabase.from("workflow").select("id", { count: "exact", head: true }),
      supabase.from("subscription").select("id", { count: "exact", head: true }),
      supabase.from("audit_log").select("id", { count: "exact", head: true }),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).in("level", ["ERROR", "FATAL"]),
      supabase.from("organization_join_request").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("organization").select("id, name, slug, logoUrl, ownerEmail, location, createdAt").order("createdAt", { ascending: false }).limit(5),
      supabase.from("audit_log").select("id, action, entity, level, details, createdAt").order("createdAt", { ascending: false }).limit(10),
      supabase.from("user").select("id, name, email, image, role, createdAt").order("createdAt", { ascending: false }).limit(6),
    ]);

    // Enhance top organizations with counts
    const topOrganizations = await Promise.all(
      (orgs || []).map(async (o: any) => {
        const [{ count: mCount }, { count: gCount }] = await Promise.all([
          supabase.from("organization_member").select("id", { count: "exact", head: true }).eq("organizationId", o.id),
          supabase.from("organization_group").select("id", { count: "exact", head: true }).eq("organizationId", o.id),
        ]);
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          logoUrl: o.logoUrl,
          ownerEmail: o.ownerEmail,
          location: o.location,
          membersCount: mCount || 0,
          groupsCount: gCount || 0,
          createdAt: o.createdAt,
        };
      })
    );

    const formattedRecentActivity = (recentLogs || []).map((l: any) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      level: l.level,
      source: l.details?.source || "system",
      details: l.details,
      createdAt: l.createdAt,
    }));

    return {
      success: true,
      data: {
        kpis: {
          totalUsers: usersCount || 0,
          verifiedUsers: verifiedUsersCount || 0,
          totalOrganizers: organizersCount || 0,
          totalOrganizations: orgsCount || 0,
          totalMembers: membersCount || 0,
          totalDesks: groupsCount || 0,
          totalWorkflows: workflowsCount || 0,
          totalSubscriptions: subsCount || 0,
          totalAuditLogs: auditCount || 0,
          errorLogsCount: errorLogsCount || 0,
          pendingJoinRequests: pendingJoinRequests || 0,
        },
        topOrganizations,
        recentActivity: formattedRecentActivity,
        recentUsers: (recentUsers || []) as any,
      },
    };
  } catch (err: any) {
    console.error("[fetchAdminDashboardStatsAction] Error:", err.message || err);
    return {
      success: false,
      error: err.message || "Failed to load admin dashboard telemetry",
    };
  }
}
