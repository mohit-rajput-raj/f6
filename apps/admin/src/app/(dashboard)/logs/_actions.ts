"use server";

import { supabase } from "@repo/db";

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  level: "INFO" | "WARN" | "ERROR" | "FATAL";
  details: any;
  createdAt: string;
  source: "dashboard" | "org" | "admin" | "server" | "system";
}

export interface AuditLogStats {
  totalLogs: number;
  dashboardCount: number;
  orgCount: number;
  adminCount: number;
  errorCount: number;
  warnCount: number;
}

export interface FetchAuditLogsParams {
  source?: string;
  level?: string;
  search?: string;
  dateRange?: "all" | "24h" | "7d" | "30d";
  page?: number;
  limit?: number;
}

export async function fetchAuditLogsAction(params: FetchAuditLogsParams = {}) {
  try {
    const {
      source = "all",
      level = "all",
      search = "",
      dateRange = "all",
      page = 1,
      limit = 25,
    } = params;

    let query = supabase
      .from("audit_log")
      .select("id, userId, action, entity, entityId, level, details, createdAt", {
        count: "exact",
      })
      .order("createdAt", { ascending: false });

    // Level filter
    if (level && level !== "all") {
      query = query.eq("level", level.toUpperCase());
    }

    // Source filter (stored inside details->>source)
    if (source && source !== "all") {
      query = query.filter("details->>source", "eq", source.toLowerCase());
    }

    // Date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let fromDate: Date;
      if (dateRange === "24h") {
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateRange === "7d") {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      query = query.gte("createdAt", fromDate.toISOString());
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim();
      query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    // Fetch user details for logs that have userId
    const userIds = Array.from(new Set((logs || []).map((l: any) => l.userId).filter(Boolean)));
    const userMap: Record<string, { email: string; name: string }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("user")
        .select("id, email, name")
        .in("id", userIds);

      (users || []).forEach((u: any) => {
        userMap[u.id] = { email: u.email, name: u.name };
      });
    }

    const formattedLogs: AuditLogItem[] = (logs || []).map((log: any) => {
      const details = log.details || {};
      const source = (details.source || "system").toLowerCase();
      const user = log.userId ? userMap[log.userId] : null;

      return {
        id: log.id,
        userId: log.userId,
        userEmail: user?.email || details.userEmail || details.email || null,
        userName: user?.name || details.userName || details.name || null,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        level: log.level,
        details,
        createdAt: log.createdAt,
        source: source as any,
      };
    });

    // Compute stats
    const [
      { count: totalLogs },
      { count: dashboardCount },
      { count: orgCount },
      { count: adminCount },
      { count: errorCount },
      { count: warnCount },
    ] = await Promise.all([
      supabase.from("audit_log").select("id", { count: "exact", head: true }),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).filter("details->>source", "eq", "dashboard"),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).filter("details->>source", "eq", "org"),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).filter("details->>source", "eq", "admin"),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).in("level", ["ERROR", "FATAL"]),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).eq("level", "WARN"),
    ]);

    const stats: AuditLogStats = {
      totalLogs: totalLogs || 0,
      dashboardCount: dashboardCount || 0,
      orgCount: orgCount || 0,
      adminCount: adminCount || 0,
      errorCount: errorCount || 0,
      warnCount: warnCount || 0,
    };

    return {
      success: true,
      data: formattedLogs,
      stats,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    };
  } catch (err: any) {
    console.error("[fetchAuditLogsAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to load audit logs");
  }
}
