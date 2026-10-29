"use server";

import { supabase } from "@repo/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export async function getDataLibraryFiles(dashid?: string, userId?: string) {
  const validWorkflowId =
    dashid && isValidUuid(dashid.trim()) ? dashid.trim() : null;

  // When dashid (project workflow ID) is provided, strictly scope files to this project.
  // Files from other projects will never leak here, and all members of this project can view them.
  if (validWorkflowId) {
    try {
      const { data, error } = await supabase
        .from("data_library_file")
        .select(
          "id, name, description, fileType, data, metadata, createdAt, updatedAt, workflowId, userId"
        )
        .eq("workflowId", validWorkflowId)
        .order("updatedAt", { ascending: false });

      if (error) {
        console.error("Error fetching project data library files:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Failed to query project data library files:", e);
      return [];
    }
  }

  // Fallback for standalone/global files without a project: only personal unattached files
  if (userId && userId.trim() !== "") {
    const { data } = await supabase
      .from("data_library_file")
      .select(
        "id, name, description, fileType, data, metadata, createdAt, updatedAt, workflowId, userId"
      )
      .eq("userId", userId.trim())
      .is("workflowId", null)
      .order("updatedAt", { ascending: false });

    return data || [];
  }

  return [];
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


