"use server";

import { supabase } from "@repo/db";

export async function getMasterSheets(dashid?: string, userId?: string, userEmail?: string) {
  const sheetMap = new Map<string, any>();

  // 1. Fetch master sheets explicitly linked to this desk (projectWorkflowId) via DeskShare
  if (dashid && dashid.trim() !== "") {
    const { data: sharesForDesk } = await supabase
      .from("desk_share")
      .select("*, masterSheet:master_sheet(*)")
      .eq("projectWorkflowId", dashid.trim());

    (sharesForDesk || []).forEach((s: any) => {
      if (s.masterSheet) {
        const isOwner = userId ? s.masterSheet.userId === userId : false;
        sheetMap.set(s.masterSheet.id, {
          ...s.masterSheet,
          isOwner,
          sharedBy: isOwner ? "Personal Desk" : (s.invitedEmail || "Shared Collaborator"),
        });
      }
    });
  }

  // 2. Fetch master sheets owned by userId
  if (userId && userId.trim() !== "") {
    const { data: ownSheets } = await supabase
      .from("master_sheet")
      .select("*")
      .eq("userId", userId.trim())
      .order("updatedAt", { ascending: false });

    (ownSheets || []).forEach((s: any) => {
      sheetMap.set(s.id, {
        ...s,
        isOwner: true,
        sharedBy: "Personal Desk",
      });
    });
  }

  // 3. Fetch master sheets shared with userEmail
  if (userEmail && userEmail.trim() !== "") {
    const { data: sharedEntries } = await supabase
      .from("desk_share")
      .select("*, masterSheet:master_sheet(*)")
      .ilike("invitedEmail", userEmail.trim());

    (sharedEntries || []).forEach((s: any) => {
      if (s.masterSheet) {
        const isOwner = userId ? s.masterSheet.userId === userId : false;
        if (!sheetMap.has(s.masterSheet.id)) {
          sheetMap.set(s.masterSheet.id, {
            ...s.masterSheet,
            isOwner,
            sharedBy: isOwner ? "Personal Desk" : "Shared Non-Personal Desk",
          });
        }
      }
    });
  }

  return Array.from(sheetMap.values());
}

export async function getMasterSheet(id: string, userId?: string) {
  const { data, error } = await supabase
    .from("master_sheet")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching master sheet:", error);
    return null;
  }
  return data;
}

export async function getMasterSheetByName(name: string, userId?: string, dashid?: string) {
  if (dashid) {
    const { data: shares } = await supabase
      .from("desk_share")
      .select("*, masterSheet:master_sheet(*)")
      .eq("projectWorkflowId", dashid);

    const match = (shares || []).find((s: any) => s.masterSheet?.name === name);
    if (match?.masterSheet) {
      return match.masterSheet;
    }
  }

  let query = supabase.from("master_sheet").select("*").eq("name", name);
  if (userId) {
    query = query.eq("userId", userId);
  }
  const { data } = await query.maybeSingle();
  return data;
}

export async function createMasterSheet({
  userId,
  name,
  data,
  metadata,
  dashid,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
  dashid?: string;
}) {
  const { data: sheet, error } = await supabase
    .from("master_sheet")
    .insert({ userId, name, data, metadata })
    .select()
    .single();

  if (error) {
    console.error("Failed to create master sheet:", error);
    throw error;
  }

  if (dashid && sheet) {
    try {
      const { data: user } = await supabase.from("user").select("email").eq("id", userId).maybeSingle();
      await supabase.from("desk_share").insert({
        masterSheetId: sheet.id,
        projectWorkflowId: dashid,
        invitedEmail: user?.email || "owner@desk.com",
        invitedUserId: userId,
        permission: "editor",
        status: "accepted",
      });
    } catch (e) {
      console.warn("Could not create desk share link for master sheet:", e);
    }
  }

  return sheet;
}

export async function updateMasterSheet(
  id: string,
  userId: string,
  updates: { name?: string; data?: any; metadata?: any }
) {
  const { data: sheet } = await supabase.from("master_sheet").select("*").eq("id", id).maybeSingle();
  if (!sheet) throw new Error("Master sheet not found");

  const { data: updated, error } = await supabase
    .from("master_sheet")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

/** Upsert by name: if a master sheet with this name exists for the user or desk, update it; otherwise create it. */
export async function upsertMasterSheetByName({
  userId,
  name,
  data,
  metadata,
  dashid,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
  dashid?: string;
}) {
  let existing = await getMasterSheetByName(name, userId, dashid);

  let sheet;
  if (existing) {
    const { data: updated, error } = await supabase
      .from("master_sheet")
      .update({ data, metadata, updatedAt: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    sheet = updated;
  } else {
    sheet = await createMasterSheet({ userId, name, data, metadata, dashid });
  }

  if (dashid && sheet) {
    try {
      const { data: existingShare } = await supabase
        .from("desk_share")
        .select("*")
        .eq("masterSheetId", sheet.id)
        .eq("projectWorkflowId", dashid)
        .maybeSingle();

      if (!existingShare) {
        const { data: user } = await supabase.from("user").select("email").eq("id", userId).maybeSingle();
        await supabase.from("desk_share").insert({
          masterSheetId: sheet.id,
          projectWorkflowId: dashid,
          invitedEmail: user?.email || "owner@desk.com",
          invitedUserId: userId,
          permission: "editor",
          status: "accepted",
        });
      }
    } catch (e) {
      console.warn("Could not ensure desk share link for master sheet:", e);
    }
  }

  return sheet;
}

export async function deleteMasterSheet(id: string, userId?: string) {
  const { data: sheet } = await supabase.from("master_sheet").select("*").eq("id", id).maybeSingle();
  if (!sheet) throw new Error("Master sheet not found");

  const { data, error } = await supabase.from("master_sheet").delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function addMasterSheetHistory({
  masterSheetId,
  userId,
  userName,
  action,
  dataBefore,
  dataAfter,
  changeSummary,
}: {
  masterSheetId: string;
  userId: string;
  userName: string;
  action: string;
  dataBefore?: any;
  dataAfter?: any;
  changeSummary?: string;
}) {
  const { data, error } = await supabase
    .from("master_sheet_history")
    .insert({
      masterSheetId,
      userId,
      userName,
      action,
      dataBefore,
      dataAfter,
      changeSummary,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMasterSheetHistory(masterSheetId: string) {
  const { data } = await supabase
    .from("master_sheet_history")
    .select("*")
    .eq("masterSheetId", masterSheetId)
    .order("createdAt", { ascending: false })
    .limit(50);

  return data || [];
}

export async function checkIsDeskOwner(dashid?: string, userId?: string): Promise<boolean> {
  if (!dashid || !userId) return false;
  try {
    const { data: workflow } = await supabase
      .from("workflow")
      .select("userId")
      .eq("id", dashid.trim())
      .maybeSingle();

    if (workflow && workflow.userId === userId) return true;

    // Fallback check masterSheet owner linked to desk
    const { data: shares } = await supabase
      .from("desk_share")
      .select("*, masterSheet:master_sheet(userId)")
      .eq("projectWorkflowId", dashid.trim());

    const isOwner = (shares || []).some((s: any) => s.masterSheet?.userId === userId);
    return isOwner;
  } catch (e) {
    console.warn("Owner check warning:", e);
    return false;
  }
}

