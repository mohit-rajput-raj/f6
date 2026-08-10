"use server";

import { supabase } from "@repo/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export async function getDataLibraryFiles(dashid?: string, userId?: string) {
  const userIds = new Set<string>();

  if (userId && userId.trim() !== "") {
    userIds.add(userId.trim());
  }

  const validWorkflowId = dashid && isValidUuid(dashid.trim()) ? dashid.trim() : null;

  if (validWorkflowId) {
    try {
      const { data: shares } = await supabase
        .from("desk_share")
        .select("invitedUserId")
        .eq("projectWorkflowId", validWorkflowId);

      (shares || []).forEach((s: any) => {
        if (s.invitedUserId) userIds.add(s.invitedUserId);
      });
    } catch (e) {
      console.warn("Could not fetch desk shares for data library:", e);
    }
  }

  let query = supabase
    .from("data_library_file")
    .select("id, name, description, fileType, metadata, createdAt, updatedAt, workflowId")
    .order("updatedAt", { ascending: false });

  const conditions: string[] = [];
  if (validWorkflowId) {
    conditions.push(`workflowId.eq.${validWorkflowId}`);
  }
  if (userIds.size > 0) {
    conditions.push(`userId.in.(${Array.from(userIds).join(",")})`);
  }

  if (conditions.length === 0) return [];

  query = query.or(conditions.join(","));

  const { data } = await query;
  return data || [];
}

export async function getDataLibraryFile(id: string, userId?: string) {
  if (!isValidUuid(id)) return null;
  const { data } = await supabase
    .from("data_library_file")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function createDataLibraryFile({
  userId,
  name,
  description,
  fileType,
  data,
  metadata,
  workflowId,
}: {
  userId: string;
  name: string;
  description?: string;
  fileType: string;
  data: any;
  metadata?: any;
  workflowId?: string;
}) {
  const { data: newFile, error } = await supabase
    .from("data_library_file")
    .insert({
      userId,
      name,
      description,
      fileType,
      data,
      metadata,
      workflowId: isValidUuid(workflowId) ? workflowId : null,
    })
    .select()
    .single();

  if (error) throw error;
  return newFile;
}

export async function updateDataLibraryFile(
  id: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    data?: any;
    metadata?: any;
  }
) {
  if (!isValidUuid(id)) throw new Error("File not found");
  const { data: file } = await supabase.from("data_library_file").select("*").eq("id", id).maybeSingle();
  if (!file) throw new Error("File not found");

  const { data: updated, error } = await supabase
    .from("data_library_file")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteDataLibraryFile(id: string, userId?: string) {
  if (!isValidUuid(id)) throw new Error("File not found");
  const { data: file } = await supabase.from("data_library_file").select("*").eq("id", id).maybeSingle();
  if (!file) throw new Error("File not found");

  const { data: deleted, error } = await supabase
    .from("data_library_file")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return deleted;
}


