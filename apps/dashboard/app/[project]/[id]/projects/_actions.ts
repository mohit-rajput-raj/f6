"use server";

import { supabase } from "@repo/db";

export interface OrganizationProjectItem {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  organizationName: string;
  organizationLogo?: string | null;
  organizationSlug?: string;
  groupId?: string | null;
  groupName?: string | null;
  deskName?: string | null;
  formatTemplate?: string | null;
  instructions?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch real projects created by organizations/groups where this user is a member
 */
export async function getOrganizationProjectsForUserAction(
  userId?: string,
  userEmail?: string
) {
  try {
    if (!userId && !userEmail) {
      return { success: true, data: [] };
    }

    const cleanEmail = userEmail?.toLowerCase().trim();

    // 1. Find organizations this user belongs to
    let memberQuery = supabase
      .from("organization_member")
      .select("organizationId, id, email");

    if (userId && cleanEmail) {
      memberQuery = memberQuery.or(`userId.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      memberQuery = memberQuery.eq("userId", userId);
    } else if (cleanEmail) {
      memberQuery = memberQuery.ilike("email", cleanEmail);
    }

    const { data: memberRecords } = await memberQuery;
    const memberOrgIds = Array.from(new Set((memberRecords || []).map((m: any) => m.organizationId)));
    const orgMemberIds = (memberRecords || []).map((m: any) => m.id);

    // 2. Also check if user is an organizer / owner of any organization
    let ownedOrgIds: string[] = [];
    if (cleanEmail) {
      const { data: ownedOrgs } = await supabase
        .from("organization")
        .select("id")
        .ilike("ownerEmail", cleanEmail);
      ownedOrgIds = (ownedOrgs || []).map((o: any) => o.id);
    }

    const allRelevantOrgIds = Array.from(new Set([...memberOrgIds, ...ownedOrgIds]));

    // 3. Find groups this user belongs to (via group_member)
    let userGroupIds: string[] = [];
    if (orgMemberIds.length > 0) {
      const { data: grpMembers } = await supabase
        .from("organization_group_member")
        .select("groupId")
        .in("memberId", orgMemberIds);
      userGroupIds = (grpMembers || []).map((gm: any) => gm.groupId);
    }

    // Also if user is group leader
    if (cleanEmail) {
      const { data: ledGroups } = await supabase
        .from("organization_group")
        .select("id")
        .ilike("leaderEmail", cleanEmail);
      const ledIds = (ledGroups || []).map((g: any) => g.id);
      userGroupIds = Array.from(new Set([...userGroupIds, ...ledIds]));
    }

    // 4. Determine all accessible group IDs:
    // Only groups where user is an active member or designated leader
    let accessibleGroupIds = Array.from(new Set(userGroupIds));

    // If user is the executive owner of an organization, also include groups of their owned organizations
    if (ownedOrgIds.length > 0) {
      const { data: orgGroups } = await supabase
        .from("organization_group")
        .select("id")
        .in("organizationId", ownedOrgIds);
      const ownedGrpIds = (orgGroups || []).map((g: any) => g.id);
      accessibleGroupIds = Array.from(new Set([...accessibleGroupIds, ...ownedGrpIds]));
    }

    // If user does not belong to any desk groups, return empty array immediately
    if (accessibleGroupIds.length === 0) {
      return { success: true, data: [] };
    }

    // 5. Query real workflows strictly assigned to the user's accessible desk groups
    const query = supabase
      .from("workflow")
      .select("id, name, description, definition, organizationId, groupId, tags, createdAt, updatedAt")
      .not("organizationId", "is", null)
      .in("groupId", accessibleGroupIds)
      .order("createdAt", { ascending: false });

    const { data: workflows, error: wfErr } = await query;
    if (wfErr) throw wfErr;

    if (!workflows || workflows.length === 0) {
      return { success: true, data: [] };
    }

    // 5. Enhance workflows with organization and group details
    const orgIdsToFetch = Array.from(new Set(workflows.map((w: any) => w.organizationId).filter(Boolean)));
    const groupIdsToFetch = Array.from(new Set(workflows.map((w: any) => w.groupId).filter(Boolean)));

    const [
      { data: orgs },
      { data: groups },
    ] = await Promise.all([
      orgIdsToFetch.length > 0
        ? supabase.from("organization").select("id, name, slug, logoUrl").in("id", orgIdsToFetch)
        : Promise.resolve({ data: [] }),
      groupIdsToFetch.length > 0
        ? supabase.from("organization_group").select("id, name, deskName").in("id", groupIdsToFetch)
        : Promise.resolve({ data: [] }),
    ]);

    const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));
    const groupMap = new Map((groups || []).map((g: any) => [g.id, g]));

    const projects: OrganizationProjectItem[] = workflows.map((w: any) => {
      const org = orgMap.get(w.organizationId);
      const group = groupMap.get(w.groupId);
      const def = w.definition || {};

      return {
        id: w.id,
        name: w.name,
        description: w.description || "Organization assigned desk workspace",
        organizationId: w.organizationId,
        organizationName: org?.name || "Enterprise Workspace",
        organizationLogo: org?.logoUrl || null,
        organizationSlug: org?.slug || "org",
        groupId: w.groupId,
        groupName: group?.name || "Operations Group",
        deskName: group?.deskName || "Standard Desk Pipeline",
        formatTemplate: def.formatTemplate || "standard",
        instructions: def.instructions || null,
        status: "ACTIVE",
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      };
    });

    return {
      success: true,
      data: projects,
    };
  } catch (err: any) {
    console.error("[getOrganizationProjectsForUserAction] Error:", err.message || err);
    return {
      success: false,
      error: err.message || "Failed to load organization projects",
      data: [],
    };
  }
}
