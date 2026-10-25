import { supabase, recordAuditLog } from "@repo/db";

export interface DBOrganizer {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  phone?: string | null;
  status: string;
  activeOrganizationId?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DBOrganization {
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
  membersCount?: number;
  desksCount?: number;
}

export interface DBMember {
  id: string;
  organizationId: string;
  userId?: string | null;
  name: string;
  email: string;
  avatar?: string | null;
  role: "owner" | "admin" | "member";
  title?: string | null;
  department?: string | null;
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
}

export interface DBGroup {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  deskName?: string | null;
  leaderId?: string | null;
  leaderName?: string | null;
  leaderEmail?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    groupMemberId: string;
    roleInGroup: "leader" | "member";
    joinedAt: string;
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    title?: string | null;
    department?: string | null;
  }>;
}

export interface DBJoinRequest {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  department?: string | null;
  message?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface DBAsset {
  id: string;
  organizationId: string;
  name: string;
  type: "image" | "template" | "dataset" | "guideline";
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  description?: string | null;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DBProject {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Methods ───

export const orgApi = {
  // ── Organizations ──
  async getOrganizerOrganizations(
    organizerId: string,
    email?: string
  ): Promise<DBOrganization[]> {
    if (!organizerId) return [];

    try {
      // 1. Organizations owned by this organizer ID
      const { data: ownedById } = await supabase
        .from("organization")
        .select("*")
        .eq("ownerId", organizerId);

      // 2. Organizations where ownerEmail matches organizer's email
      let ownedByEmail: any[] = [];
      if (email) {
        const { data: emailMatches } = await supabase
          .from("organization")
          .select("*")
          .ilike("ownerEmail", email.trim().toLowerCase());
        ownedByEmail = emailMatches || [];
      }

      // 3. Organizations linked in organizer_organization table
      const { data: linkRecords } = await supabase
        .from("organizer_organization")
        .select("organizationId")
        .eq("organizerId", organizerId);

      const linkedIds = (linkRecords || [])
        .map((r: any) => r.organizationId)
        .filter(Boolean);

      let linkedOrgs: any[] = [];
      if (linkedIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organization")
          .select("*")
          .in("id", linkedIds);
        linkedOrgs = orgs || [];
      }

      // Deduplicate by ID
      const orgMap = new Map<string, any>();
      for (const org of [...(ownedById || []), ...ownedByEmail, ...linkedOrgs]) {
        if (org && org.id) {
          orgMap.set(org.id, org);
        }
      }

      const mergedOrgs = Array.from(orgMap.values());

      // Enhance with counts
      const enhanced = await Promise.all(
        mergedOrgs.map(async (org: any) => {
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
            ...org,
            membersCount: membersCount || 1,
            desksCount: desksCount || 1,
          };
        })
      );

      return enhanced;
    } catch (err) {
      console.error("[orgApi] Failed to get organizer organizations:", err);
      return [];
    }
  },

  async getPublicOrganizations(search?: string): Promise<DBOrganization[]> {
    let query = supabase
      .from("organization")
      .select("id, name, slug, logoUrl, tagline, description, location, website, ownerEmail, createdAt")
      .order("createdAt", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,tagline.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: orgs, error } = await query;
    if (error) throw error;

    // Enhance with counts
    const enhanced = await Promise.all(
      (orgs || []).map(async (org: any) => {
        const [{ count: membersCount }, { count: desksCount }] = await Promise.all([
          supabase.from("organization_member").select("id", { count: "exact", head: true }).eq("organizationId", org.id),
          supabase.from("organization_group").select("id", { count: "exact", head: true }).eq("organizationId", org.id),
        ]);
        return {
          ...org,
          membersCount: membersCount || 1,
          desksCount: desksCount || 1,
        };
      })
    );

    return enhanced;
  },

  async getOrganizationDetails(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = supabase.from("organization").select("*");
    const { data: org, error } = isUuid
      ? await query.eq("id", idOrSlug).maybeSingle()
      : await query.eq("slug", idOrSlug).maybeSingle();

    if (error) throw error;
    if (!org) return null;

    const [
      { data: members },
      { data: groups },
      { data: assignments },
      { data: joinRequests },
      { data: announcements },
      { data: assets },
      { data: messages },
      { data: projects },
    ] = await Promise.all([
      supabase.from("organization_member").select("*").eq("organizationId", org.id).order("joinedAt", { ascending: false }),
      supabase.from("organization_group").select("*").eq("organizationId", org.id),
      supabase.from("organization_desk_assignment").select("*").eq("organizationId", org.id),
      supabase.from("organization_join_request").select("*").eq("organizationId", org.id).order("createdAt", { ascending: false }),
      supabase.from("organization_announcement").select("*").eq("organizationId", org.id).order("createdAt", { ascending: false }),
      supabase.from("organization_asset").select("*").eq("organizationId", org.id).order("createdAt", { ascending: false }),
      supabase.from("organization_message").select("*").eq("organizationId", org.id).order("createdAt", { ascending: true }),
      supabase.from("organization_project").select("*").eq("organizationId", org.id).order("createdAt", { ascending: false }),
    ]);

    return {
      ...org,
      members: members || [],
      groups: groups || [],
      assignments: assignments || [],
      joinRequests: joinRequests || [],
      announcements: announcements || [],
      assets: assets || [],
      messages: messages || [],
      projects: projects || [],
    };
  },

  async createOrganization(
    organizerId: string,
    data: {
      name: string;
      slug: string;
      logoUrl?: string;
      tagline?: string;
      description?: string;
      website?: string;
      contactEmail?: string;
      phone?: string;
      location?: string;
      rules?: string[];
      settings?: Record<string, any>;
    }
  ): Promise<DBOrganization> {
    const { data: organizer } = await supabase
      .from("organizer")
      .select("id, name, email, avatar")
      .eq("id", organizerId)
      .single();

    if (!organizer) throw new Error("Organizer not found");

    const slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    const { data: newOrg, error } = await supabase
      .from("organization")
      .insert({
        name: data.name.trim(),
        slug,
        logoUrl: data.logoUrl || null,
        tagline: data.tagline || "Institutional Data & Transformation Hub",
        description: data.description || "Unified organization workspace with assigned data desks, members, and shared pipelines.",
        website: data.website || "https://organization.io",
        contactEmail: data.contactEmail || organizer.email,
        phone: data.phone || "+1 (555) 234-5678",
        location: data.location || "Global Distributed",
        ownerId: organizerId,
        ownerEmail: organizer.email,
        rules: data.rules || [
          "Strict zero-trust authentication across all telemetry transformations",
          "Standard column formats apply across all assigned departmental desks",
        ],
        settings: data.settings || {
          allowJoinRequests: true,
          autoApproveMembers: false,
          workingHours: "Standard Operations",
          defaultDeskTemplate: "Standard Pipeline Matrix",
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Link organizer to organization
    await supabase.from("organizer_organization").insert({
      organizerId,
      organizationId: newOrg.id,
      role: "owner",
      isDefault: true,
    });

    // Update organizer active organization
    await supabase
      .from("organizer")
      .update({ activeOrganizationId: newOrg.id })
      .eq("id", organizerId);

    // Create initial owner member record
    await supabase.from("organization_member").insert({
      organizationId: newOrg.id,
      email: organizer.email,
      name: organizer.name,
      avatar: organizer.avatar,
      role: "owner",
      title: "Executive Owner / Founder",
      department: "Executive Leadership",
      status: "ACTIVE",
    });

    // Default Group for Operations Desk
    const { data: group } = await supabase
      .from("organization_group")
      .insert({
        organizationId: newOrg.id,
        name: "Operations Core",
        slug: "operations-core",
        description: "Primary operational workflow desk handling daily institutional ingestion and sync.",
        deskName: "Primary Operations Desk",
        leaderName: organizer.name,
        leaderEmail: organizer.email,
        status: "active",
      })
      .select()
      .single();

    // Default Desk Assignment
    await supabase.from("organization_desk_assignment").insert({
      organizationId: newOrg.id,
      deskName: "Primary Operations Desk",
      groupName: "Operations Core",
      assignedToUser: organizer.name,
      status: "active",
    });

    // Welcome Announcement
    await supabase.from("organization_announcement").insert({
      organizationId: newOrg.id,
      title: `Welcome to ${newOrg.name}`,
      content: `Organization workspace provisioned successfully. You can invite staff, configure desk groups, and upload assets.`,
      priority: "normal",
      authorName: organizer.name,
      authorRole: "Executive Owner",
    });

    // Initial Image Asset
    await supabase.from("organization_asset").insert({
      organizationId: newOrg.id,
      name: "Standard Organization Architecture Diagram",
      type: "image",
      fileUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      description: "Official institutional master sheet format for cross-departmental collaboration.",
      downloadsCount: 1,
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_CREATED",
      entity: "Organization",
      entityId: newOrg.id,
      level: "INFO",
      details: {
        orgId: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        ownerEmail: organizer.email,
        location: newOrg.location,
      },
    });

    return newOrg;
  },

  // ── Members & Employees ──
  async getMembers(organizationId: string): Promise<DBMember[]> {
    const { data, error } = await supabase
      .from("organization_member")
      .select("*")
      .eq("organizationId", organizationId)
      .order("joinedAt", { ascending: false });

    if (error) throw error;
    return (data || []) as DBMember[];
  },

  async addMember(
    organizationId: string,
    data: {
      name: string;
      email: string;
      role?: "owner" | "admin" | "member";
      title?: string;
      department?: string;
      avatar?: string;
    }
  ): Promise<DBMember> {
    const cleanEmail = data.email.toLowerCase().trim();

    const { data: matchedUser } = await supabase
      .from("user")
      .select("id, name, image")
      .eq("email", cleanEmail)
      .maybeSingle();

    const { data: newMember, error } = await supabase
      .from("organization_member")
      .insert({
        organizationId,
        userId: matchedUser?.id || null,
        name: data.name || matchedUser?.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        avatar: data.avatar || matchedUser?.image || null,
        role: data.role || "member",
        title: data.title || "Specialist",
        department: data.department || "General Operations",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (error) throw error;

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_MEMBER_ADDED",
      entity: "OrganizationMember",
      entityId: organizationId,
      level: "INFO",
      details: {
        orgId: organizationId,
        memberEmail: cleanEmail,
        memberName: newMember.name,
        role: newMember.role,
        department: newMember.department,
      },
    });

    return newMember as DBMember;
  },

  async removeMember(organizationId: string, memberId: string) {
    const { error } = await supabase
      .from("organization_member")
      .delete()
      .eq("id", memberId)
      .eq("organizationId", organizationId);

    if (error) throw error;

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_MEMBER_REMOVED",
      entity: "OrganizationMember",
      entityId: memberId,
      level: "WARN",
      details: {
        orgId: organizationId,
        memberId,
      },
    });

    return { success: true };
  },

  // ── Groups & Desk Leadership ──
  async getGroups(organizationId: string): Promise<DBGroup[]> {
    const { data: groups, error } = await supabase
      .from("organization_group")
      .select("*")
      .eq("organizationId", organizationId)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Fetch members for each group
    const enhanced = await Promise.all(
      (groups || []).map(async (g) => {
        const { data: gm } = await supabase
          .from("organization_group_member")
          .select(`
            id,
            role,
            joinedAt,
            member:memberId (
              id,
              name,
              email,
              avatar,
              role,
              title,
              department
            )
          `)
          .eq("groupId", g.id);

        return {
          ...g,
          members: (gm || []).map((item: any) => ({
            groupMemberId: item.id,
            roleInGroup: item.role,
            joinedAt: item.joinedAt,
            ...item.member,
          })),
        };
      })
    );

    return enhanced as DBGroup[];
  },

  async getGroupById(groupId: string): Promise<DBGroup> {
    const { data: group, error } = await supabase
      .from("organization_group")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error) throw error;

    const { data: gm } = await supabase
      .from("organization_group_member")
      .select(`
        id,
        role,
        joinedAt,
        member:memberId (
          id,
          name,
          email,
          avatar,
          role,
          title,
          department
        )
      `)
      .eq("groupId", groupId);

    return {
      ...group,
      members: (gm || []).map((item: any) => ({
        groupMemberId: item.id,
        roleInGroup: item.role,
        joinedAt: item.joinedAt,
        ...item.member,
      })),
    } as DBGroup;
  },

  async createGroup(
    organizationId: string,
    data: {
      name: string;
      slug?: string;
      description?: string;
      deskName?: string;
      memberIds: string[];
      leaderId?: string;
    }
  ): Promise<DBGroup> {
    const slug = (data.slug || data.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    let leaderName = null;
    let leaderEmail = null;
    if (data.leaderId) {
      const { data: leader } = await supabase
        .from("organization_member")
        .select("name, email")
        .eq("id", data.leaderId)
        .single();
      if (leader) {
        leaderName = leader.name;
        leaderEmail = leader.email;
      }
    }

    const { data: group, error } = await supabase
      .from("organization_group")
      .insert({
        organizationId,
        name: data.name.trim(),
        slug,
        description: data.description || null,
        deskName: data.deskName || `${data.name.trim()} Pipeline Desk`,
        leaderId: data.leaderId || null,
        leaderName,
        leaderEmail,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    // Attach group members
    const allMemberIds = Array.from(new Set([...(data.memberIds || []), ...(data.leaderId ? [data.leaderId] : [])]));

    if (allMemberIds.length > 0) {
      const inserts = allMemberIds.map((mId) => ({
        groupId: group.id,
        memberId: mId,
        role: mId === data.leaderId ? "leader" : "member",
      }));
      await supabase.from("organization_group_member").insert(inserts);
    }

    // Matching desk assignment
    await supabase.from("organization_desk_assignment").insert({
      organizationId,
      deskName: group.deskName,
      groupName: group.name,
      assignedToUser: leaderName || "Lead Specialist",
      status: "active",
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_GROUP_CREATED",
      entity: "OrganizationGroup",
      entityId: group.id,
      level: "INFO",
      details: {
        orgId: organizationId,
        groupId: group.id,
        groupName: group.name,
        deskName: group.deskName,
        leaderName,
      },
    });

    return this.getGroupById(group.id);
  },

  async setGroupLeader(groupId: string, newLeaderMemberId: string): Promise<DBGroup> {
    const { data: member, error: memErr } = await supabase
      .from("organization_member")
      .select("id, name, email")
      .eq("id", newLeaderMemberId)
      .single();

    if (memErr || !member) throw new Error("Target member not found");

    const { data: updatedGroup, error } = await supabase
      .from("organization_group")
      .update({
        leaderId: member.id,
        leaderName: member.name,
        leaderEmail: member.email,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) throw error;

    // Update group members roles
    await supabase
      .from("organization_group_member")
      .update({ role: "member" })
      .eq("groupId", groupId)
      .eq("role", "leader");

    const { data: existsInGroup } = await supabase
      .from("organization_group_member")
      .select("id")
      .eq("groupId", groupId)
      .eq("memberId", newLeaderMemberId)
      .maybeSingle();

    if (existsInGroup) {
      await supabase
        .from("organization_group_member")
        .update({ role: "leader" })
        .eq("id", existsInGroup.id);
    } else {
      await supabase.from("organization_group_member").insert({
        groupId,
        memberId: newLeaderMemberId,
        role: "leader",
      });
    }

    if (updatedGroup.deskName) {
      await supabase
        .from("organization_desk_assignment")
        .update({ assignedToUser: member.name })
        .eq("organizationId", updatedGroup.organizationId)
        .eq("deskName", updatedGroup.deskName);
    }

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_GROUP_LEADER_ASSIGNED",
      entity: "OrganizationGroup",
      entityId: groupId,
      level: "INFO",
      details: {
        orgId: updatedGroup.organizationId,
        groupId,
        groupName: updatedGroup.name,
        newLeaderName: member.name,
        newLeaderEmail: member.email,
      },
    });

    return this.getGroupById(groupId);
  },

  async addMemberToGroup(groupId: string, memberId: string, role = "member") {
    const { data, error } = await supabase
      .from("organization_group_member")
      .upsert(
        {
          groupId,
          memberId,
          role,
        },
        { onConflict: "groupId,memberId" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeMemberFromGroup(groupId: string, memberId: string) {
    // 1. Fetch member details
    const { data: member } = await supabase
      .from("organization_member")
      .select("email, organizationId")
      .eq("id", memberId)
      .maybeSingle();

    // 2. Delete membership from group
    const { error } = await supabase
      .from("organization_group_member")
      .delete()
      .eq("groupId", groupId)
      .eq("memberId", memberId);

    if (error) throw error;

    if (member?.email) {
      const cleanEmail = member.email.toLowerCase().trim();

      // 3. If member was the group leader, clear leaderEmail on the group
      const { data: grp } = await supabase
        .from("organization_group")
        .select("leaderEmail, organizationId")
        .eq("id", groupId)
        .maybeSingle();

      if (grp?.leaderEmail?.toLowerCase().trim() === cleanEmail) {
        await supabase
          .from("organization_group")
          .update({ leaderEmail: null })
          .eq("id", groupId);
      }

      // 4. Revoke any desk_share entries for workflows in this group
      const { data: groupWorkflows } = await supabase
        .from("workflow")
        .select("id")
        .eq("groupId", groupId);

      if (groupWorkflows && groupWorkflows.length > 0) {
        const wfIds = groupWorkflows.map((w: any) => w.id);
        await supabase
          .from("desk_share")
          .delete()
          .in("projectWorkflowId", wfIds)
          .ilike("invitedEmail", cleanEmail);
      }
    }

    return { success: true };
  },

  // ── Join Requests ──
  async submitJoinRequest(data: {
    organizationId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    department?: string;
    message?: string;
  }): Promise<DBJoinRequest> {
    const { data: req, error } = await supabase
      .from("organization_join_request")
      .upsert(
        {
          organizationId: data.organizationId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail.toLowerCase().trim(),
          userAvatar: data.userAvatar || null,
          department: data.department || "Operations",
          message: data.message || "Requesting to join organizational desks and transformation pipelines.",
          status: "PENDING",
        },
        { onConflict: "organizationId,userId" }
      )
      .select()
      .single();

    if (error) throw error;
    return req as DBJoinRequest;
  },

  async getJoinRequests(organizationId: string, status?: string): Promise<DBJoinRequest[]> {
    let query = supabase
      .from("organization_join_request")
      .select("*")
      .eq("organizationId", organizationId)
      .order("createdAt", { ascending: false });

    if (status) {
      query = query.eq("status", status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DBJoinRequest[];
  },

  async reviewJoinRequest(
    requestId: string,
    action: "approve" | "reject",
    reviewerName: string
  ): Promise<DBJoinRequest> {
    const { data: request, error: reqErr } = await supabase
      .from("organization_join_request")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) throw new Error("Join request not found");

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const { data: updated, error } = await supabase
      .from("organization_join_request")
      .update({
        status: newStatus,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) throw error;

    if (action === "approve") {
      await this.addMember(request.organizationId, {
        name: request.userName,
        email: request.userEmail,
        avatar: request.userAvatar,
        role: "member",
        department: request.department || "Operations",
        title: "Team Specialist",
      });
    }

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: action === "approve" ? "ORGANIZATION_JOIN_REQUEST_APPROVED" : "ORGANIZATION_JOIN_REQUEST_REJECTED",
      entity: "OrganizationJoinRequest",
      entityId: request.organizationId,
      level: "INFO",
      details: {
        orgId: request.organizationId,
        requestId,
        applicantEmail: request.userEmail,
        applicantName: request.userName,
        reviewedBy: reviewerName,
        action,
      },
    });

    return updated as DBJoinRequest;
  },

  // ── Assets (Images) ──
  async getAssets(organizationId: string, type?: string): Promise<DBAsset[]> {
    let query = supabase
      .from("organization_asset")
      .select("*")
      .eq("organizationId", organizationId)
      .order("createdAt", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DBAsset[];
  },

  async createAsset(
    organizationId: string,
    data: {
      name: string;
      type?: "image" | "template" | "dataset" | "guideline";
      fileUrl?: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    }
  ): Promise<DBAsset> {
    const { data: asset, error } = await supabase
      .from("organization_asset")
      .insert({
        organizationId,
        name: data.name.trim(),
        type: data.type || "image",
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize || 0,
        mimeType: data.mimeType || "image/jpeg",
        description: data.description || "Institutional visual asset",
        downloadsCount: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return asset as DBAsset;
  },

  // ── Projects ──
  async getProjects(organizationId: string): Promise<DBProject[]> {
    const { data, error } = await supabase
      .from("organization_project")
      .select("*")
      .eq("organizationId", organizationId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data || []) as DBProject[];
  },

  async createProject(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      creatorEmail?: string;
      creatorName?: string;
    }
  ): Promise<DBProject> {
    const { data: project, error } = await supabase
      .from("organization_project")
      .insert({
        organizationId,
        name: data.name.trim(),
        description: data.description || null,
        createdByEmail: data.creatorEmail || null,
        createdByName: data.creatorName || null,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;
    return project as DBProject;
  },

  // ── User Star System ──
  async getUserStarCount(userId: string, currentUserId?: string) {
    const { count, error } = await supabase
      .from("user_star")
      .select("id", { count: "exact", head: true })
      .eq("userId", userId);

    if (error) throw error;

    let isStarred = false;
    if (currentUserId) {
      const { data: match } = await supabase
        .from("user_star")
        .select("id")
        .eq("userId", userId)
        .eq("starredById", currentUserId)
        .maybeSingle();
      isStarred = Boolean(match);
    }

    return {
      starCount: count || 0,
      isStarred,
    };
  },

  async toggleUserStar(userId: string, starredById: string) {
    const { data: existing } = await supabase
      .from("user_star")
      .select("id")
      .eq("userId", userId)
      .eq("starredById", starredById)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_star").delete().eq("id", existing.id);
      return { starred: false };
    } else {
      await supabase.from("user_star").insert({
        userId,
        starredById,
      });
      return { starred: true };
    }
  },

  // ── Group Desk Projects (Real Workflows linked to group and organization) ──
  async getGroupDeskProjects(groupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("workflow")
      .select("id, name, description, definition, tags, organizationId, groupId, createdAt, updatedAt")
      .eq("groupId", groupId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createGroupDeskProject(data: {
    groupId: string;
    organizationId: string;
    name: string;
    description?: string;
    instructions?: string;
    formatTemplate?: string;
    organizerEmail?: string;
    leaderEmail?: string;
  }): Promise<any> {
    const cleanName = data.name.trim();

    // 1. Resolve a valid user ID from the user table
    let resolvedUserId: string | null = null;
    const emailToMatch = (data.leaderEmail || data.organizerEmail || "").toLowerCase().trim();

    if (emailToMatch) {
      const { data: u } = await supabase
        .from("user")
        .select("id")
        .eq("email", emailToMatch)
        .maybeSingle();
      if (u) resolvedUserId = u.id;
    }

    if (!resolvedUserId) {
      const { data: anyUser } = await supabase
        .from("user")
        .select("id")
        .limit(1)
        .single();
      resolvedUserId = anyUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    let initialColumns = ["ID", "Name", "Category", "Status", "Date", "Notes"];
    if (data.formatTemplate === "attendance") {
      initialColumns = ["Student_ID", "Student_Name", "Class", "Total_Present", "Total_Classes", "Percentage"];
    } else if (data.formatTemplate === "finance") {
      initialColumns = ["Transaction_ID", "Account", "Asset_Class", "Amount", "Currency", "Settlement_Status"];
    } else if (data.formatTemplate === "operations") {
      initialColumns = ["Task_ID", "Operational_Desk", "Assignee", "Priority", "Deadline", "Completion_Status"];
    }

    const workflowId = crypto.randomUUID();

    // 2. Insert Workflow record
    const { data: workflow, error: wfErr } = await supabase
      .from("workflow")
      .insert({
        id: workflowId,
        userId: resolvedUserId,
        name: cleanName,
        description: data.description || "Organization team desk project",
        organizationId: data.organizationId,
        groupId: data.groupId,
        definition: {
          instructions: data.instructions || "Follow standard departmental instructions.",
          formatTemplate: data.formatTemplate || "standard",
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
        tags: ["organization-project", "team-desk"],
      })
      .select()
      .single();

    if (wfErr) throw wfErr;

    // 3. Create MasterSheet linked to this desk
    await supabase.from("master_sheet").insert({
      userId: resolvedUserId,
      name: `${cleanName} MasterSheet`,
      data: {
        columns: initialColumns,
        data: [],
      },
      metadata: {
        organizationId: data.organizationId,
        groupId: data.groupId,
        instructions: data.instructions || null,
        dashid: workflowId,
      },
    });

    // 4. Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_GROUP_PROJECT_CREATED",
      entity: "Workflow",
      entityId: workflowId,
      level: "INFO",
      details: {
        organizationId: data.organizationId,
        groupId: data.groupId,
        projectName: cleanName,
        formatTemplate: data.formatTemplate || "standard",
      },
    });

    return workflow;
  },

  async deleteGroupDeskProject(workflowId: string, orgId?: string, groupId?: string): Promise<{ success: boolean }> {
    // 1. Delete associated desk blocks
    await supabase.from("desk_block").delete().eq("projectWorkflowId", workflowId);

    // 2. Delete associated master sheets
    await supabase.from("master_sheet").delete().eq("metadata->>dashid", workflowId);

    // 3. Delete workflow record
    const { error } = await supabase.from("workflow").delete().eq("id", workflowId);
    if (error) throw error;

    // 4. Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_GROUP_PROJECT_DELETED",
      entity: "Workflow",
      entityId: workflowId,
      level: "WARN",
      details: {
        organizationId: orgId,
        groupId,
        workflowId,
      },
    });

    return { success: true };
  },

  async deleteDeskAssignment(assignmentId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from("organization_desk_assignment")
      .delete()
      .eq("id", assignmentId);
    if (error) throw error;
    return { success: true };
  },

  async requestOrganizationDeletion(data: {
    orgId: string;
    reason: string;
    requesterEmail: string;
  }): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("organization")
      .update({
        status: "PENDING_DELETION",
        deletionRequestedAt: now,
        deletionReason: data.reason.trim(),
        deletionRequestedBy: data.requesterEmail.trim(),
        updatedAt: now,
      })
      .eq("id", data.orgId);

    if (error) throw error;

    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_DELETION_REQUESTED",
      entity: "Organization",
      entityId: data.orgId,
      level: "WARN",
      details: {
        orgId: data.orgId,
        reason: data.reason,
        requestedBy: data.requesterEmail,
      },
    });

    return { success: true };
  },

  async cancelOrganizationDeletionRequest(orgId: string, userEmail: string): Promise<{ success: boolean }> {
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
      .eq("id", orgId);

    if (error) throw error;

    await recordAuditLog({
      source: "org",
      action: "ORGANIZATION_DELETION_CANCELLED",
      entity: "Organization",
      entityId: orgId,
      level: "INFO",
      details: {
        orgId,
        cancelledBy: userEmail,
      },
    });

    return { success: true };
  },
};
