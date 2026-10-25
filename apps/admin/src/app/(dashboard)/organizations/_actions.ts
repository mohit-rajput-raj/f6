"use server";

import { supabase, recordAuditLog } from "@repo/db";

export interface AdminOrgItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  location?: string | null;
  ownerId: string;
  ownerEmail: string;
  rules?: string[] | null;
  settings?: Record<string, any> | null;
  status?: "ACTIVE" | "PENDING_DELETION" | string;
  deletionRequestedAt?: string | null;
  deletionReason?: string | null;
  deletionRequestedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  groupsCount: number;
  pendingRequestsCount: number;
}

export interface AdminOrgStats {
  totalOrganizations: number;
  totalMembers: number;
  totalDesks: number;
  totalPendingRequests: number;
}

export interface FetchOrgsParams {
  search?: string;
  sortBy?: "createdAt" | "name" | "membersCount";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/**
 * Fetch all organizations with real metrics and counts
 */
export async function fetchOrganizationsAction(params: FetchOrgsParams = {}) {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = params;

    let query = supabase
      .from("organization")
      .select("*", { count: "exact" });

    if (search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,ownerEmail.ilike.%${q}%,location.ilike.%${q}%`);
    }

    if (sortBy === "name" || sortBy === "createdAt") {
      query = query.order(sortBy, { ascending: sortOrder === "asc" });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    const { data: orgs, count, error } = await query;
    if (error) throw error;

    // Enhance each org with member, group, and request counts in parallel
    const enhanced: AdminOrgItem[] = await Promise.all(
      (orgs || []).map(async (org: any) => {
        const [
          { count: membersCount },
          { count: groupsCount },
          { count: pendingRequestsCount },
        ] = await Promise.all([
          supabase
            .from("organization_member")
            .select("id", { count: "exact", head: true })
            .eq("organizationId", org.id),
          supabase
            .from("organization_group")
            .select("id", { count: "exact", head: true })
            .eq("organizationId", org.id),
          supabase
            .from("organization_join_request")
            .select("id", { count: "exact", head: true })
            .eq("organizationId", org.id)
            .eq("status", "PENDING"),
        ]);

        return {
          ...org,
          membersCount: membersCount || 0,
          groupsCount: groupsCount || 0,
          pendingRequestsCount: pendingRequestsCount || 0,
        };
      })
    );

    // Sort in memory if sorting by computed counts
    if (sortBy === "membersCount") {
      enhanced.sort((a, b) =>
        sortOrder === "asc"
          ? a.membersCount - b.membersCount
          : b.membersCount - a.membersCount
      );
    }

    // Aggregate platform stats
    const [
      { count: totalOrgs },
      { count: totalMembers },
      { count: totalDesks },
      { count: totalPendingRequests },
    ] = await Promise.all([
      supabase.from("organization").select("id", { count: "exact", head: true }),
      supabase.from("organization_member").select("id", { count: "exact", head: true }),
      supabase.from("organization_group").select("id", { count: "exact", head: true }),
      supabase.from("organization_join_request").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    ]);

    const stats: AdminOrgStats = {
      totalOrganizations: totalOrgs || 0,
      totalMembers: totalMembers || 0,
      totalDesks: totalDesks || 0,
      totalPendingRequests: totalPendingRequests || 0,
    };

    return {
      success: true,
      data: enhanced,
      stats,
      pagination: {
        total: count || enhanced.length,
        page,
        limit,
        totalPages: Math.ceil((count || enhanced.length) / limit),
      },
    };
  } catch (err: any) {
    console.error("[fetchOrganizationsAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to load organizations");
  }
}

/**
 * Fetch full organization details dossier by ID
 */
export async function fetchOrganizationDetailAction(organizationId: string) {
  try {
    // 1. Fetch organization record
    const { data: org, error: orgErr } = await supabase
      .from("organization")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgErr || !org) throw new Error("Organization not found.");

    // 2. Fetch owner organizer
    const { data: owner } = await supabase
      .from("organizer")
      .select("id, name, email, avatar, phone, status, createdAt")
      .eq("id", org.ownerId)
      .maybeSingle();

    // 3. Fetch related records in parallel
    const [
      { data: members },
      { data: groups },
      { data: joinRequests },
      { data: announcements },
      { data: assets },
      { data: auditLogs },
    ] = await Promise.all([
      supabase
        .from("organization_member")
        .select("*")
        .eq("organizationId", organizationId)
        .order("joinedAt", { ascending: false }),
      supabase
        .from("organization_group")
        .select("*")
        .eq("organizationId", organizationId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("organization_join_request")
        .select("*")
        .eq("organizationId", organizationId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("organization_announcement")
        .select("*")
        .eq("organizationId", organizationId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("organization_asset")
        .select("*")
        .eq("organizationId", organizationId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("audit_log")
        .select("*")
        .or(`entityId.eq.${organizationId},details->>orgId.eq.${organizationId}`)
        .order("createdAt", { ascending: false })
        .limit(20),
    ]);

    return {
      success: true,
      data: {
        ...org,
        owner: owner || {
          id: org.ownerId,
          name: org.ownerEmail?.split("@")[0] || "Organizer",
          email: org.ownerEmail,
          avatar: null,
        },
        members: members || [],
        groups: groups || [],
        joinRequests: joinRequests || [],
        announcements: announcements || [],
        assets: assets || [],
        auditLogs: auditLogs || [],
      },
    };
  } catch (err: any) {
    console.error("[fetchOrganizationDetailAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to load organization detail.");
  }
}

/**
 * Review a join request directly from Admin portal
 */
export async function reviewJoinRequestByAdminAction(
  requestId: string,
  action: "approve" | "reject",
  adminEmail: string = "admin@campus.io"
) {
  try {
    const { data: request, error: reqErr } = await supabase
      .from("organization_join_request")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) throw new Error("Join request not found.");

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 1. Update request status
    const { error: updateErr } = await supabase
      .from("organization_join_request")
      .update({
        status: newStatus,
        reviewedBy: `Admin (${adminEmail})`,
        reviewedAt: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    // 2. If approved, add as organization member
    if (action === "approve") {
      const { data: existingMember } = await supabase
        .from("organization_member")
        .select("id")
        .eq("organizationId", request.organizationId)
        .eq("email", request.userEmail.toLowerCase().trim())
        .maybeSingle();

      if (!existingMember) {
        await supabase.from("organization_member").insert({
          organizationId: request.organizationId,
          userId: request.userId,
          name: request.userName,
          email: request.userEmail.toLowerCase().trim(),
          avatar: request.userAvatar || null,
          role: "member",
          department: request.department || "Operations",
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
        });
      }
    }

    // 3. Log audit event
    await recordAuditLog({
      source: "admin",
      action: action === "approve" ? "ORG_JOIN_REQUEST_APPROVED" : "ORG_JOIN_REQUEST_REJECTED",
      entity: "OrganizationJoinRequest",
      entityId: request.organizationId,
      level: "INFO",
      details: {
        requestId,
        applicantEmail: request.userEmail,
        organizationId: request.organizationId,
        action,
        reviewedByAdmin: adminEmail,
      },
    });

    return { success: true, message: `Request successfully ${newStatus.toLowerCase()}.` };
  } catch (err: any) {
    console.error("[reviewJoinRequestByAdminAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to process join request");
  }
}

/**
 * Super Admin permanently approves and executes deletion of an organization
 */
export async function approveOrganizationDeletionAction(
  organizationId: string,
  adminEmail: string = "admin@campus.io"
) {
  try {
    const { data: org, error: orgErr } = await supabase
      .from("organization")
      .select("id, name, slug, ownerEmail")
      .eq("id", organizationId)
      .single();

    if (orgErr || !org) throw new Error("Organization not found.");

    // 1. Delete all workflows belonging to this organization (and related blocks/sheets)
    const { data: workflows } = await supabase
      .from("workflow")
      .select("id")
      .eq("organizationId", organizationId);

    const wfIds = (workflows || []).map((w: any) => w.id);
    if (wfIds.length > 0) {
      await supabase.from("desk_block").delete().in("projectWorkflowId", wfIds);
      await supabase.from("master_sheet").delete().in("metadata->>dashid", wfIds);
      await supabase.from("workflow").delete().eq("organizationId", organizationId);
    }

    // 2. Delete the organization (PostgreSQL CASCADE removes all child records:
    // organization_asset, organization_message, organization_member, 
    // organization_desk_assignment, organization_announcement, organizer_organization, 
    // organization_group, organization_join_request, organization_project, 
    // organization_audit_log, and organization_group_member)
    const { error: deleteErr } = await supabase
      .from("organization")
      .delete()
      .eq("id", organizationId);

    if (deleteErr) throw deleteErr;

    // 3. Record audit log
    await recordAuditLog({
      source: "admin",
      action: "ORGANIZATION_DELETION_APPROVED_BY_ADMIN",
      entity: "Organization",
      entityId: organizationId,
      level: "WARN",
      details: {
        organizationId,
        orgName: org.name,
        ownerEmail: org.ownerEmail,
        deletedByAdmin: adminEmail,
        deletedAt: new Date().toISOString(),
      },
    });

    return { success: true, message: `Organization "${org.name}" has been permanently decommissioned and deleted.` };
  } catch (err: any) {
    console.error("[approveOrganizationDeletionAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to approve organization deletion.");
  }
}

/**
 * Super Admin rejects an organization deletion request
 */
export async function rejectOrganizationDeletionAction(
  organizationId: string,
  adminEmail: string = "admin@campus.io",
  rejectReason?: string
) {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("organization")
      .update({
        status: "ACTIVE",
        deletionRequestedAt: null,
        deletionReason: null,
        deletionRequestedBy: null,
        updatedAt: now,
      })
      .eq("id", organizationId);

    if (error) throw error;

    await recordAuditLog({
      source: "admin",
      action: "ORGANIZATION_DELETION_REJECTED_BY_ADMIN",
      entity: "Organization",
      entityId: organizationId,
      level: "INFO",
      details: {
        organizationId,
        rejectedByAdmin: adminEmail,
        rejectReason: rejectReason || "Request declined by administration.",
      },
    });

    return { success: true, message: "Organization deletion request was declined." };
  } catch (err: any) {
    console.error("[rejectOrganizationDeletionAction] Error:", err.message || err);
    throw new Error(err.message || "Failed to reject deletion request.");
  }
}
