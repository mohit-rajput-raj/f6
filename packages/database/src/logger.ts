import { supabase } from "./client.js";

export type AuditLogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";
export type AuditLogSource = "dashboard" | "org" | "admin" | "server" | "system";

export interface CreateAuditLogParams {
  source: AuditLogSource;
  action: string;
  entity: string;
  entityId?: string | null;
  level?: AuditLogLevel;
  userId?: string | null;
  details?: Record<string, any> | null;
}

/**
 * Universal audit log writer to record platform actions across dashboard, org, and admin.
 * Writes to PostgreSQL audit_log table via Supabase client with rich metadata.
 */
export async function recordAuditLog(params: CreateAuditLogParams) {
  try {
    const { source, action, entity, entityId, level = "INFO", userId, details } = params;
    const detailsPayload = {
      source,
      ...(details || {}),
      recordedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("audit_log").insert({
      userId: userId || null,
      action: action.toUpperCase(),
      entity,
      entityId: entityId || null,
      level,
      details: detailsPayload,
    }).select().single();

    if (error) {
      console.warn(`[AuditLog] Failed to persist log "${action}":`, error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn("[AuditLog] Error recording audit log:", err?.message || err);
    return null;
  }
}
