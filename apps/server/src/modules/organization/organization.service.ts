import { supabase, recordAuditLog } from "@repo/db";
import crypto from "crypto";

// ─── Password Hashing Helpers for Organizer ───
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(verifyHash, "hex")
    );
  } catch {
    return false;
  }
}

export class OrganizationService {
  // ==========================================
  // ORGANIZER AUTHENTICATION & MANAGEMENT
  // ==========================================

  /**
   * Register a new Organizer
   */
  async registerOrganizer(data: {
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }) {
    const cleanEmail = data.email.toLowerCase().trim();

    // Check if organizer already exists
    const { data: existing } = await supabase
      .from("organizer")
      .select("id, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      throw new Error("An organizer account with this email already exists.");
    }

    const hashedPassword = data.password ? hashPassword(data.password) : null;
    const initialMetadata = {
      registeredVia: data.password ? "credentials" : "oauth",
      featureFlags: ["desks", "groups", "assets", "discussions", "governance"],
      ...(data.metadata || {}),
    };

    const { data: newOrganizer, error } = await supabase
      .from("organizer")
      .insert({
        name: data.name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        avatar: data.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "ORGANIZER",
        phone: data.phone || null,
        status: "ACTIVE",
        metadata: initialMetadata,
        lastLoginAt: new Date().toISOString(),
      })
      .select("id, name, email, avatar, role, phone, status, activeOrganizationId, metadata, createdAt")
      .single();

    if (error) throw error;
    return newOrganizer;
  }

  /**
   * Login an Organizer with email/password
   */
  async loginOrganizer(data: { email: string; password?: string }) {
    const cleanEmail = data.email.toLowerCase().trim();

    const { data: organizer, error } = await supabase
      .from("organizer")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error) throw error;
    if (!organizer) {
      throw new Error("No organizer account found with this email.");
    }

    if (data.password && organizer.password) {
      const isValid = verifyPassword(data.password, organizer.password);
      if (!isValid) {
        throw new Error("Invalid password.");
      }
    }

    // Update lastLoginAt
    await supabase
      .from("organizer")
      .update({ lastLoginAt: new Date().toISOString() })
      .eq("id", organizer.id);

    const { password, ...safeOrganizer } = organizer;
    return safeOrganizer;
  }

  /**
   * Get Organizer by ID with their organizations
   */
  async getOrganizerById(organizerId: string) {
    const { data: organizer, error } = await supabase
      .from("organizer")
      .select("id, name, email, avatar, role, phone, status, activeOrganizationId, metadata, createdAt")
      .eq("id", organizerId)
      .maybeSingle();

    if (error) throw error;
    if (!organizer) return null;

    // Fetch organizations handled by this organizer
    const { data: handlerRecords } = await supabase
      .from("organizer_organization")
      .select(`
        id,
        role,
        isDefault,
        organization:organizationId (
          id,
          name,
          slug,
          logoUrl,
          tagline,
          description,
          website,
          contactEmail,
          phone,
          location,
          ownerId,
          rules,
          settings,
          createdAt
        )
      `)
      .eq("organizerId", organizerId);

    const organizations = (handlerRecords || [])
      .map((r: any) => ({
        ...r.organization,
        handlerRole: r.role,
        isDefault: r.isDefault,
      }))
      .filter((o: any) => Boolean(o && o.id));

    return {
      ...organizer,
      organizations,
    };
  }

  /**
   * Switch active organization for Organizer
   */
  async switchActiveOrganization(organizerId: string, organizationId: string) {
    // Verify organizer has access to this organization
    const { data: access } = await supabase
      .from("organizer_organization")
      .select("id")
      .eq("organizerId", organizerId)
      .eq("organizationId", organizationId)
      .maybeSingle();

    if (!access) {
      throw new Error("Organizer does not have permissions for this organization.");
    }

    const { data: updated, error } = await supabase
      .from("organizer")
      .update({ activeOrganizationId: organizationId })
      .eq("id", organizerId)
      .select("id, name, email, avatar, role, activeOrganizationId")
      .single();

    if (error) throw error;
    return updated;
  }

  // ==========================================
  // ORGANIZATION WORKSPACE MANAGEMENT
  // ==========================================

  /**
   * Create an Organization under an Organizer
   */
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
  ) {
    // 1. Fetch organizer info
    const { data: organizer } = await supabase
      .from("organizer")
      .select("id, name, email, avatar")
      .eq("id", organizerId)
      .single();

    if (!organizer) throw new Error("Organizer not found.");

    const slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    // 2. Check for slug conflict
    const { data: existingOrg } = await supabase
      .from("organization")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingOrg) {
      throw new Error(`An organization with the slug "${slug}" already exists.`);
    }

    // 3. Insert Organization
    const { data: newOrg, error: orgErr } = await supabase
      .from("organization")
      .insert({
        name: data.name.trim(),
        slug,
        logoUrl: data.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
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

    if (orgErr) throw orgErr;

    // 4. Link Organizer to Organization
    await supabase.from("organizer_organization").insert({
      organizerId,
      organizationId: newOrg.id,
      role: "owner",
      isDefault: true,
    });

    // 5. Update Organizer's activeOrganizationId
    await supabase
      .from("organizer")
      .update({ activeOrganizationId: newOrg.id })
      .eq("id", organizerId);

    // 6. Create initial Owner member record
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

    // 7. Create default Desk Assignment
    await supabase.from("organization_desk_assignment").insert({
      organizationId: newOrg.id,
      deskName: "Primary Operations Desk",
      groupName: "Executive Leadership",
      assignedToUser: organizer.name,
      status: "active",
    });

    // 8. Welcome Announcement
    await supabase.from("organization_announcement").insert({
      organizationId: newOrg.id,
      title: `Welcome to ${newOrg.name}`,
      content: `Organization workspace provisioned successfully. You can invite staff, configure desk groups, and upload assets.`,
      priority: "normal",
      authorName: organizer.name,
      authorRole: "Executive Owner",
    });

    // 9. Initial Asset (Image/Template)
    await supabase.from("organization_asset").insert({
      organizationId: newOrg.id,
      name: "Standard Organization Architecture Diagram",
      type: "image",
      fileUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      description: "Official institutional master sheet format for cross-departmental collaboration.",
      downloadsCount: 1,
    });

    // 10. Initial Message
    await supabase.from("organization_message").insert({
      organizationId: newOrg.id,
      senderId: organizerId,
      senderName: organizer.name,
      senderRole: "Owner",
      senderAvatar: organizer.avatar,
      content: `Organization channel initialized for ${newOrg.name}. Welcome!`,
      channel: "general",
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
      },
    });

    return newOrg;
  }

  /**
   * Get complete Organization workspace details
   */
  async getOrganizationDetails(orgIdOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgIdOrSlug);

    const query = supabase.from("organization").select("*");
    const { data: org, error } = isUuid
      ? await query.eq("id", orgIdOrSlug).maybeSingle()
      : await query.eq("slug", orgIdOrSlug).maybeSingle();

    if (error) throw error;
    if (!org) return null;

    // Fetch related collections in parallel
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
      supabase.from("organization_group").select("*, members:organization_group_member(*)").eq("organizationId", org.id),
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
  }

  /**
   * List all public organizations (for directory explore)
   */
  async listOrganizations(options?: { search?: string; limit?: number }) {
    let query = supabase
      .from("organization")
      .select("id, name, slug, logoUrl, tagline, description, location, website, ownerEmail, createdAt")
      .order("createdAt", { ascending: false });

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,tagline.ilike.%${options.search}%,slug.ilike.%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: orgs, error } = await query;
    if (error) throw error;

    // Enhance with member and group counts
    const enhanced = await Promise.all(
      (orgs || []).map(async (org: any) => {
        const [{ count: membersCount }, { count: desksCount }] = await Promise.all([
          supabase.from("organization_member").select("id", { count: "exact", head: true }).eq("organizationId", org.id),
          supabase.from("organization_desk_assignment").select("id", { count: "exact", head: true }).eq("organizationId", org.id),
        ]);
        return {
          ...org,
          membersCount: membersCount || 1,
          desksCount: desksCount || 1,
        };
      })
    );

    return enhanced;
  }

  // ==========================================
  // EMPLOYEE & MEMBER MANAGEMENT
  // ==========================================

  /**
   * Get all organization employees / members
   */
  async getMembers(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_member")
      .select("*")
      .eq("organizationId", organizationId)
      .order("joinedAt", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add / Invite an employee to the organization
   */
  async addMember(
    organizationId: string,
    data: {
      name: string;
      email: string;
      role?: string;
      title?: string;
      department?: string;
      avatar?: string;
    }
  ) {
    const cleanEmail = data.email.toLowerCase().trim();

    // Check if member already in org
    const { data: existing } = await supabase
      .from("organization_member")
      .select("id")
      .eq("organizationId", organizationId)
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      throw new Error("This user is already a member of this organization.");
    }

    // Check if user has an account in the user table
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
    return newMember;
  }

  /**
   * Remove a member from the organization
   */
  async removeMember(organizationId: string, memberId: string) {
    const { error } = await supabase
      .from("organization_member")
      .delete()
      .eq("id", memberId)
      .eq("organizationId", organizationId);

    if (error) throw error;
    return { success: true };
  }

  // ==========================================
  // DESK GROUPS & LEADERSHIP OWNERSHIP
  // ==========================================

  /**
   * Create a group for a desk with selected employees and assigned leader
   */
  async createGroup(
    organizationId: string,
    data: {
      name: string;
      slug?: string;
      description?: string;
      deskName?: string;
      memberIds: string[]; // Selected employees from member list
      leaderId?: string;   // Member ID who will lead the group
    }
  ) {
    const slug = (data.slug || data.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    // 1. Get leader details if leaderId is specified
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

    // 2. Insert group
    const { data: group, error: groupErr } = await supabase
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

    if (groupErr) throw groupErr;

    // 3. Insert group members
    const allMemberIds = Array.from(new Set([...(data.memberIds || []), ...(data.leaderId ? [data.leaderId] : [])]));

    if (allMemberIds.length > 0) {
      const memberInserts = allMemberIds.map((mId) => ({
        groupId: group.id,
        memberId: mId,
        role: mId === data.leaderId ? "leader" : "member",
      }));

      await supabase.from("organization_group_member").insert(memberInserts);
    }

    // 4. Create matching desk assignment
    await supabase.from("organization_desk_assignment").insert({
      organizationId,
      deskName: group.deskName,
      groupName: group.name,
      assignedToUser: leaderName || "Unassigned Group Leader",
      status: "active",
    });

    return this.getGroupById(group.id);
  }

  /**
   * Get single group details with all member records
   */
  async getGroupById(groupId: string) {
    const { data: group, error } = await supabase
      .from("organization_group")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error) throw error;

    // Fetch members of this group with details
    const { data: groupMembers } = await supabase
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
      members: (groupMembers || []).map((gm: any) => ({
        groupMemberId: gm.id,
        roleInGroup: gm.role,
        joinedAt: gm.joinedAt,
        ...gm.member,
      })),
    };
  }

  /**
   * Give ownership / transfer leadership of the group to any member
   */
  async setGroupLeader(groupId: string, newLeaderMemberId: string) {
    // 1. Fetch new leader member record
    const { data: member, error: memErr } = await supabase
      .from("organization_member")
      .select("id, name, email")
      .eq("id", newLeaderMemberId)
      .single();

    if (memErr || !member) throw new Error("Target member not found in organization.");

    // 2. Update group leader info
    const { data: updatedGroup, error: groupErr } = await supabase
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

    if (groupErr) throw groupErr;

    // 3. Update member roles in group
    // Demote old leaders to member
    await supabase
      .from("organization_group_member")
      .update({ role: "member" })
      .eq("groupId", groupId)
      .eq("role", "leader");

    // Promote new leader
    const { data: existingInGroup } = await supabase
      .from("organization_group_member")
      .select("id")
      .eq("groupId", groupId)
      .eq("memberId", newLeaderMemberId)
      .maybeSingle();

    if (existingInGroup) {
      await supabase
        .from("organization_group_member")
        .update({ role: "leader" })
        .eq("id", existingInGroup.id);
    } else {
      await supabase.from("organization_group_member").insert({
        groupId,
        memberId: newLeaderMemberId,
        role: "leader",
      });
    }

    // 4. Update matching desk assignment
    if (updatedGroup.deskName) {
      await supabase
        .from("organization_desk_assignment")
        .update({ assignedToUser: member.name })
        .eq("organizationId", updatedGroup.organizationId)
        .eq("deskName", updatedGroup.deskName);
    }

    return this.getGroupById(groupId);
  }

  // ==========================================
  // JOIN REQUESTS (APPLY / ACCEPT / REJECT)
  // ==========================================

  /**
   * User applies from dashboard to join an organization
   */
  async submitJoinRequest(data: {
    organizationId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    department?: string;
    message?: string;
  }) {
    // Check if user already is a member
    const { data: existingMember } = await supabase
      .from("organization_member")
      .select("id")
      .eq("organizationId", data.organizationId)
      .eq("email", data.userEmail.toLowerCase().trim())
      .maybeSingle();

    if (existingMember) {
      throw new Error("You are already a member of this organization.");
    }

    // Upsert join request
    const { data: request, error } = await supabase
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
    return request;
  }

  /**
   * List join requests for an organization
   */
  async listJoinRequests(organizationId: string, status?: string) {
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
    return data || [];
  }

  /**
   * Accept / Reject a join request
   */
  async reviewJoinRequest(
    requestId: string,
    action: "approve" | "reject",
    reviewerName: string
  ) {
    const { data: request, error: reqErr } = await supabase
      .from("organization_join_request")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) throw new Error("Join request not found.");

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 1. Update request status
    const { data: updatedReq, error: updateErr } = await supabase
      .from("organization_join_request")
      .update({
        status: newStatus,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. If approved, add user as OrganizationMember
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

    return updatedReq;
  }

  // ==========================================
  // ASSETS (IMAGES & TEMPLATES)
  // ==========================================

  /**
   * List assets for organization
   */
  async listAssets(organizationId: string, type?: string) {
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
    return data || [];
  }

  /**
   * Add image / asset to organization
   */
  async createAsset(
    organizationId: string,
    data: {
      name: string;
      type?: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    }
  ) {
    const { data: asset, error } = await supabase
      .from("organization_asset")
      .insert({
        organizationId,
        name: data.name.trim(),
        type: data.type || "image",
        fileUrl: data.fileUrl,
        fileSize: data.fileSize || 0,
        mimeType: data.mimeType || "image/jpeg",
        description: data.description || "Shared institutional image asset",
        downloadsCount: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return asset;
  }

  // ==========================================
  // ORGANIZATION PROJECTS (IN DASHBOARD & ORG)
  // ==========================================

  /**
   * List organization projects
   */
  async listProjects(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_project")
      .select("*")
      .eq("organizationId", organizationId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create an organization project
   */
  async createProject(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      creatorEmail?: string;
      creatorName?: string;
    }
  ) {
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
    return project;
  }

  // ==========================================
  // USER STAR SYSTEM (GITHUB REPO STYLE STAR)
  // ==========================================

  /**
   * Toggle star for user profile
   */
  async toggleUserStar(userId: string, starredById: string) {
    // Check if star already exists
    const { data: existing } = await supabase
      .from("user_star")
      .select("id")
      .eq("userId", userId)
      .eq("starredById", starredById)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_star").delete().eq("id", existing.id);
      const count = await this.getUserStarCount(userId);
      return { starred: false, starCount: count };
    } else {
      await supabase.from("user_star").insert({
        userId,
        starredById,
      });
      const count = await this.getUserStarCount(userId);
      return { starred: true, starCount: count };
    }
  }

  /**
   * Get user star count & starred status
   */
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
  }
}

export const organizationService = new OrganizationService();
