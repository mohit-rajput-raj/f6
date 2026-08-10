"use server";

import { supabase } from "@repo/db";
import { createMasterSheet } from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";
import { unwrapSyncfusionJson } from "@/lib/sheet-utils";

export const createWorkFlow = async ({
  id,
  name,
  templateData,
}: {
  id: string;
  name: string;
  templateData?: { columns: string[]; data?: any[][] };
}) => {
  try {
    if (!id) {
      throw new Error("User not authenticated");
    }

    const { data: newWorkflow, error } = await supabase
      .from("workflow")
      .insert({
        userId: id,
        name,
        definition: {
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
        tags: [],
      })
      .select()
      .single();

    if (error) throw error;

    // Handle full Syncfusion workbook JSON vs flat template columns
    let sheetData: any;
    const syncfusionJson = unwrapSyncfusionJson(templateData);

    if (syncfusionJson) {
      sheetData = syncfusionJson;
    } else if (templateData && typeof templateData === "object") {
      sheetData = templateData;
    } else {
      sheetData = {
        columns: ["ID", "Name", "Category", "Status", "Date"],
        data: [],
      };
    }

    // Create MasterSheet linked to this desk/workflow
    await createMasterSheet({
      userId: id,
      name: `${name} MasterSheet`,
      data: sheetData,
      metadata: { createdWithTemplate: true },
      dashid: newWorkflow.id,
    });

    return newWorkflow;
  } catch (error) {
    console.error("Failed to create workflow:", error);
    throw error;
  }
};

export async function getWorkFlow(id: string) {
  const { data } = await supabase
    .from("workflow")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function getAllWorkFlow(id: string) {
  if (!id) return [];

  // Find user's email if available
  const { data: user } = await supabase
    .from("user")
    .select("email")
    .eq("id", id)
    .maybeSingle();

  // Find all accepted shares for this user (by invitedUserId OR by invitedEmail)
  let shareQuery = supabase
    .from("desk_share")
    .select("projectWorkflowId")
    .eq("status", "accepted");

  if (user?.email) {
    shareQuery = shareQuery.or(`invitedUserId.eq.${id},invitedEmail.ilike.${user.email}`);
  } else {
    shareQuery = shareQuery.eq("invitedUserId", id);
  }

  const { data: acceptedShares } = await shareQuery;

  const sharedWorkflowIds = (acceptedShares || [])
    .map((s: any) => s.projectWorkflowId)
    .filter((wId: any): wId is string => !!wId);

  // Fetch workflows owned by user OR shared with user
  let wfQuery = supabase
    .from("workflow")
    .select("name, id, tags, userId, createdAt, updatedAt")
    .order("createdAt", { ascending: false });

  if (sharedWorkflowIds.length > 0) {
    wfQuery = wfQuery.or(`userId.eq.${id},id.in.(${sharedWorkflowIds.join(",")})`);
  } else {
    wfQuery = wfQuery.eq("userId", id);
  }

  const { data: workflows } = await wfQuery;

  // Filter out workflows tagged with 'desk-block-editor'
  const filteredWorkflows = (workflows || []).filter(
    (wf: any) => !wf.tags || !wf.tags.includes("desk-block-editor")
  );

  // For each workflow, fetch collaborators via DeskShare
  const workflowsWithMembers = await Promise.all(
    filteredWorkflows.map(async (wf: any) => {
      const { data: shares } = await supabase
        .from("desk_share")
        .select("invitedEmail, invitedUserId")
        .eq("projectWorkflowId", wf.id)
        .eq("status", "accepted");

      const { data: owner } = await supabase
        .from("user")
        .select("name, image, email")
        .eq("id", wf.userId)
        .maybeSingle();

      const ownerEmail = owner?.email?.toLowerCase();

      const collaboratorShares = (shares || []).filter(
        (s: any) => s.invitedUserId !== wf.userId && s.invitedEmail.toLowerCase() !== ownerEmail
      );

      const userIds = collaboratorShares
        .map((s: any) => s.invitedUserId)
        .filter((uid: any): uid is string => !!uid);

      let users: any[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await supabase
          .from("user")
          .select("name, image")
          .in("id", userIds);
        users = userData || [];
      }

      const memberAvatars = [
        ...(owner
          ? [{ name: owner.name, avatar: owner.image || "" }]
          : []),
        ...users.map((u: any) => ({
          name: u.name,
          avatar: u.image || "",
        })),
      ];

      const totalMembers = 1 + collaboratorShares.length;
      const displayedCount = Math.min(memberAvatars.length, 4);
      const remaining = totalMembers - displayedCount;

      return {
        ...wf,
        users: memberAvatars.slice(0, 4),
        remainingCount: remaining > 0 ? remaining : 0,
      };
    })
  );

  return workflowsWithMembers;
}

export async function GETusers() {
  const { data } = await supabase.from("user").select("*").limit(1).maybeSingle();
  return data;
}

export const deleteWorkFlow = async ({
  flowId,
  id,
}: {
  id: string;
  flowId: string;
}) => {
  try {
    const { data: workflow } = await supabase
      .from("workflow")
      .select("*")
      .eq("id", flowId)
      .eq("userId", id)
      .maybeSingle();

    if (!workflow) {
      throw new Error("Workflow not found or unauthorized");
    }

    const { data: deleted, error } = await supabase
      .from("workflow")
      .delete()
      .eq("id", flowId)
      .select()
      .single();

    if (error) throw error;
    return deleted;
  } catch (error) {
    console.error("Delete workflow error:", error);
    throw error;
  }
};

export const deleteMultipleWorkflows = async ({
  id,
  flowIds,
}: {
  id: string;
  flowIds: string[];
}) => {
  try {
    if (!id || !flowIds || flowIds.length === 0) return { count: 0 };

    const { data, error } = await supabase
      .from("workflow")
      .delete()
      .in("id", flowIds)
      .eq("userId", id)
      .select();

    if (error) throw error;
    return { count: data?.length || 0 };
  } catch (error) {
    console.error("Delete multiple workflows error:", error);
    throw error;
  }
};

export async function saveWorkflow(id: string, nodes: any[], edges: any[]) {
  try {
    const { data: updated, error } = await supabase
      .from("workflow")
      .update({
        definition: {
          reactFlow: { nodes, edges },
          meta: { updatedAt: new Date().toISOString() },
        },
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    console.error("Save workflow error:", error);
    throw error;
  }
}

