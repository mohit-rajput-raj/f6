"use server";

import { supabase, recordAuditLog } from "@repo/db";

export interface DirectoryOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  tagline: string;
  description: string;
  website?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  rules?: string[] | null;
  settings?: Record<string, any> | null;
  membersCount: number;
  desksCount: number;
  createdAt: string;
}

export interface UserOrgStatus {
  isMember: boolean;
  memberRole?: string;
  requestStatus?: "PENDING" | "APPROVED" | "REJECTED";
  requestId?: string;
}

/**
 * Fetch all verified organizations with real counts and current user's membership / request status
 */
export async function getOrganizationsDirectoryAction(userId?: string, userEmail?: string) {
  try {
    // 1. Fetch all registered organizations from database
    const { data: orgs, error: orgsErr } = await supabase
      .from("organization")
      .select("id, name, slug, logoUrl, tagline, description, website, contactEmail, phone, location, rules, settings, createdAt")
      .order("createdAt", { ascending: false });

    if (orgsErr) throw orgsErr;

    // 2. Fetch member & desk counts in parallel for all orgs
    const enhancedOrgs: DirectoryOrg[] = await Promise.all(
      (orgs || []).map(async (org: any) => {
        const [{ count: membersCount }, { count: desksCount }] = await Promise.all([
          supabase
            .from("organization_member")
            .select("id", { count: "exact", head: true })
            .eq("organizationId", org.id),
          supabase
            .from("organization_group")
            .select("id", { count: "exact", head: true })
            .eq("organizationId", org.id),
        ]);

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl || null,
          tagline: org.tagline || "Institutional Data & Transformation Workspace",
          description: org.description || "Assigned operational desks, distributed datasets, and team workflows.",
          website: org.website || null,
          location: org.location || "Global Enterprise",
          contactEmail: org.contactEmail || null,
          phone: org.phone || null,
          rules: Array.isArray(org.rules) ? org.rules : [],
          settings: org.settings || {},
          membersCount: membersCount || 1,
          desksCount: desksCount || 1,
          createdAt: org.createdAt,
        };
      })
    );

    // 3. If user context is provided, fetch their status for each organization
    const statusMap: Record<string, UserOrgStatus> = {};

    if (userId || userEmail) {
      const emailLower = userEmail?.toLowerCase().trim();

      // Check memberships
      let memberQuery = supabase
        .from("organization_member")
        .select("organizationId, role, status");
      
      if (userId && emailLower) {
        memberQuery = memberQuery.or(`userId.eq.${userId},email.ilike.${emailLower}`);
      } else if (userId) {
        memberQuery = memberQuery.eq("userId", userId);
      } else if (emailLower) {
        memberQuery = memberQuery.ilike("email", emailLower);
      }

      const { data: memberRecords } = await memberQuery;
      (memberRecords || []).forEach((m: any) => {
        statusMap[m.organizationId] = {
          isMember: true,
          memberRole: m.role,
        };
      });

      // Check join requests
      let reqQuery = supabase
        .from("organization_join_request")
        .select("id, organizationId, status, createdAt");

      if (userId && emailLower) {
        reqQuery = reqQuery.or(`userId.eq.${userId},userEmail.ilike.${emailLower}`);
      } else if (userId) {
        reqQuery = reqQuery.eq("userId", userId);
      } else if (emailLower) {
        reqQuery = reqQuery.ilike("userEmail", emailLower);
      }

      const { data: requestRecords } = await reqQuery;
      (requestRecords || []).forEach((r: any) => {
        if (!statusMap[r.organizationId]) {
          statusMap[r.organizationId] = {
            isMember: r.status === "APPROVED",
            requestStatus: r.status as any,
            requestId: r.id,
          };
        } else if (r.status) {
          statusMap[r.organizationId].requestStatus = r.status as any;
          statusMap[r.organizationId].requestId = r.id;
        }
      });
    }

    return {
      success: true,
      data: enhancedOrgs,
      userStatuses: statusMap,
    };
  } catch (error: any) {
    console.error("[getOrganizationsDirectoryAction] Error:", error.message || error);
    return {
      success: false,
      error: error.message || "Failed to load organizations from database",
      data: [],
      userStatuses: {},
    };
  }
}

/**
 * Apply to join an organization or auto-join if permitted
 */
export async function applyToOrganizationAction(input: {
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  department?: string;
  message?: string;
}) {
  try {
    const { organizationId, userId, userName, userEmail, userAvatar, department, message } = input;
    const cleanEmail = userEmail.toLowerCase().trim();

    // 1. Fetch org to inspect settings & name
    const { data: org, error: orgErr } = await supabase
      .from("organization")
      .select("id, name, settings")
      .eq("id", organizationId)
      .single();

    if (orgErr || !org) {
      return { success: false, error: "Organization not found" };
    }

    // 2. Check if already a member
    const { data: existingMember } = await supabase
      .from("organization_member")
      .select("id, role")
      .eq("organizationId", organizationId)
      .or(`userId.eq.${userId},email.ilike.${cleanEmail}`)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: "You are already an active member of this organization." };
    }

    const autoApprove = Boolean(org.settings?.autoApproveMembers);

    if (autoApprove) {
      // Auto-approve: directly create member record
      const { error: memberErr } = await supabase
        .from("organization_member")
        .insert({
          organizationId,
          userId,
          name: userName,
          email: cleanEmail,
          avatar: userAvatar || null,
          role: "member",
          department: department || "Operations",
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
        });

      if (memberErr) throw memberErr;

      // Capture audit log
      await recordAuditLog({
        source: "dashboard",
        action: "ORGANIZATION_MEMBER_AUTO_JOINED",
        entity: "OrganizationMember",
        entityId: organizationId,
        level: "INFO",
        userId,
        details: {
          orgId: organizationId,
          orgName: org.name,
          userEmail: cleanEmail,
          department: department || "Operations",
        },
      });

      return {
        success: true,
        autoApproved: true,
        message: `Welcome to ${org.name}! You have been added as an active member.`,
      };
    }

    // Standard flow: submit join request
    // Check if an existing request exists
    const { data: existingReq } = await supabase
      .from("organization_join_request")
      .select("id, status")
      .eq("organizationId", organizationId)
      .or(`userId.eq.${userId},userEmail.ilike.${cleanEmail}`)
      .maybeSingle();

    if (existingReq && existingReq.status === "PENDING") {
      return { success: false, error: "Your application is already pending review with the organization administrator." };
    }

    if (existingReq) {
      // Update existing request
      const { error: updateErr } = await supabase
        .from("organization_join_request")
        .update({
          userName,
          userAvatar: userAvatar || null,
          department: department || "Operations",
          message: message?.trim() || "Applied via Organizations Directory.",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        })
        .eq("id", existingReq.id);

      if (updateErr) throw updateErr;
    } else {
      // Insert new request (PostgreSQL auto-generates the UUID id)
      const { error: insertErr } = await supabase
        .from("organization_join_request")
        .insert({
          organizationId,
          userId,
          userName,
          userEmail: cleanEmail,
          userAvatar: userAvatar || null,
          department: department || "Operations",
          message: message?.trim() || "Applied via Organizations Directory.",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });

      if (insertErr) throw insertErr;
    }

    // Capture audit log
    await recordAuditLog({
      source: "dashboard",
      action: "ORGANIZATION_JOIN_REQUEST_SUBMITTED",
      entity: "OrganizationJoinRequest",
      entityId: organizationId,
      level: "INFO",
      userId,
      details: {
        orgId: organizationId,
        orgName: org.name,
        userEmail: cleanEmail,
        department: department || "Operations",
        statement: message?.trim() || null,
      },
    });

    return {
      success: true,
      autoApproved: false,
      message: `Your application to join ${org.name} has been submitted for review!`,
    };
  } catch (error: any) {
    console.error("[applyToOrganizationAction] Error:", error.message || error);
    return {
      success: false,
      error: error.message || "Failed to submit organization join request",
    };
  }
}

/**
 * User / Employee leaves an organization they previously joined
 */
export async function leaveOrganizationAction(
  organizationId: string,
  userId?: string,
  userEmail?: string
) {
  try {
    if (!userId && !userEmail) {
      return { success: false, error: "User authentication required to leave organization." };
    }

    const cleanEmail = userEmail?.toLowerCase().trim();

    // 1. Fetch organization name for notification & audit
    const { data: org } = await supabase
      .from("organization")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    // 2. Remove from organization_member
    let memberDeleteQuery = supabase
      .from("organization_member")
      .delete()
      .eq("organizationId", organizationId);

    if (userId && cleanEmail) {
      memberDeleteQuery = memberDeleteQuery.or(`userId.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      memberDeleteQuery = memberDeleteQuery.eq("userId", userId);
    } else if (cleanEmail) {
      memberDeleteQuery = memberDeleteQuery.ilike("email", cleanEmail);
    }

    const { error: memberErr } = await memberDeleteQuery;
    if (memberErr) throw memberErr;

    // 3. Remove from any organization_group_member under this organization
    const { data: orgGroups } = await supabase
      .from("organization_group")
      .select("id")
      .eq("organizationId", organizationId);

    const groupIds = (orgGroups || []).map((g: any) => g.id);
    if (groupIds.length > 0) {
      // Find member IDs for this user
      await supabase
        .from("organization_group_member")
        .delete()
        .in("groupId", groupIds);
    }

    // 4. Remove any join request
    let reqDeleteQuery = supabase
      .from("organization_join_request")
      .delete()
      .eq("organizationId", organizationId);

    if (userId && cleanEmail) {
      reqDeleteQuery = reqDeleteQuery.or(`userId.eq.${userId},userEmail.ilike.${cleanEmail}`);
    } else if (userId) {
      reqDeleteQuery = reqDeleteQuery.eq("userId", userId);
    } else if (cleanEmail) {
      reqDeleteQuery = reqDeleteQuery.ilike("userEmail", cleanEmail);
    }
    await reqDeleteQuery;

    // 5. Record audit log
    await recordAuditLog({
      source: "dashboard",
      action: "ORGANIZATION_MEMBER_LEFT",
      entity: "OrganizationMember",
      entityId: organizationId,
      level: "INFO",
      userId,
      details: {
        organizationId,
        orgName: org?.name || "Organization",
        userEmail: cleanEmail,
        leftAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `You have successfully left ${org?.name || "the organization"}.`,
    };
  } catch (err: any) {
    console.error("[leaveOrganizationAction] Error:", err.message || err);
    return { success: false, error: err.message || "Failed to leave organization." };
  }
}

