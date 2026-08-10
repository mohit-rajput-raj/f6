import { supabase } from "@repo/db";

export class TeamService {
  /**
   * Invite a user by email to collaborate on a desk.
   */
  async inviteMember(data: {
    masterSheetId: string;
    invitedEmail: string;
    permission?: string;
    reservedColumns?: string[];
    projectWorkflowId?: string;
  }) {
    const { data: existing } = await supabase
      .from("desk_share")
      .select("*")
      .eq("masterSheetId", data.masterSheetId)
      .ilike("invitedEmail", data.invitedEmail)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("desk_share")
        .update({
          permission: data.permission ?? existing.permission,
          reservedColumns: data.reservedColumns ?? existing.reservedColumns,
          projectWorkflowId: data.projectWorkflowId ?? existing.projectWorkflowId,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    }

    const { data: user } = await supabase
      .from("user")
      .select("id")
      .ilike("email", data.invitedEmail)
      .maybeSingle();

    const { data: share, error: shareErr } = await supabase
      .from("desk_share")
      .insert({
        masterSheetId: data.masterSheetId,
        invitedEmail: data.invitedEmail,
        invitedUserId: user?.id ?? null,
        permission: data.permission ?? "editor",
        reservedColumns: data.reservedColumns ?? [],
        projectWorkflowId: data.projectWorkflowId ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (shareErr) throw shareErr;

    if (user) {
      await supabase.from("notification").insert({
        userId: user.id,
        type: "desk_invite",
        title: "Desk Invitation",
        message: `You've been invited to collaborate on a shared desk.`,
        data: {
          shareId: share.id,
          masterSheetId: data.masterSheetId,
          projectWorkflowId: data.projectWorkflowId,
        },
      });
    }

    return share;
  }

  /**
   * Get all collaborators for a master sheet.
   */
  async getCollaborators(masterSheetId: string) {
    const { data } = await supabase
      .from("desk_share")
      .select("*")
      .eq("masterSheetId", masterSheetId)
      .order("createdAt", { ascending: false });

    return data || [];
  }

  /**
   * Accept a desk invite.
   */
  async acceptInvite(shareId: string, userId: string) {
    const { data: share } = await supabase
      .from("desk_share")
      .select("*")
      .eq("id", shareId)
      .maybeSingle();

    if (!share) throw Object.assign(new Error("Invite not found"), { statusCode: 404 });

    const { data: updated, error } = await supabase
      .from("desk_share")
      .update({ status: "accepted", invitedUserId: userId })
      .eq("id", shareId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Reject a desk invite.
   */
  async rejectInvite(shareId: string) {
    const { data: updated, error } = await supabase
      .from("desk_share")
      .update({ status: "rejected" })
      .eq("id", shareId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Update reserved columns for a collaborator.
   */
  async updateReservedColumns(shareId: string, columns: string[]) {
    const { data, error } = await supabase
      .from("desk_share")
      .update({ reservedColumns: columns })
      .eq("id", shareId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove a collaborator.
   */
  async removeCollaborator(shareId: string) {
    const { data, error } = await supabase
      .from("desk_share")
      .delete()
      .eq("id", shareId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get pending invites for a user email.
   */
  async getPendingInvites(email: string) {
    const { data } = await supabase
      .from("desk_share")
      .select("*, masterSheet:master_sheet(id, name)")
      .ilike("invitedEmail", email)
      .eq("status", "pending")
      .order("createdAt", { ascending: false });

    return data || [];
  }
}

export const teamService = new TeamService();

