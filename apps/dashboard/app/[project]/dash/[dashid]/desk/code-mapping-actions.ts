"use server";

import { supabase } from "@repo/db";

// ─── Types ──────────────────────────────────────────────────

export interface ColumnKeyMap {
  [keyName: string]: number; // key name → master sheet column index
}

export interface MergeOperationConfig {
  op: "+" | "-" | "*" | "/" | "replace";
  sourceField: string; // CSV column name to use as source value
}

export interface MergeConfig {
  [keyName: string]: MergeOperationConfig;
}

export interface CodeMappingData {
  id: string;
  projectWorkflowId: string;
  codePath: string;
  columnKeyMap: ColumnKeyMap;
  mergeConfig: MergeConfig | null;
  filePath: string | null;
  fileId: string | null;
  fileName: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Get all code mappings for a project ────────────────────

export async function getCodeMappings(
  projectWorkflowId: string
): Promise<CodeMappingData[]> {
  const { data, error } = await supabase
    .from("code_mapping")
    .select("*")
    .eq("projectWorkflowId", projectWorkflowId)
    .order("codePath", { ascending: true });

  if (error) {
    console.error("[getCodeMappings] Error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    projectWorkflowId: row.projectWorkflowId,
    codePath: row.codePath,
    columnKeyMap: (row.columnKeyMap as ColumnKeyMap) || {},
    mergeConfig: (row.mergeConfig as MergeConfig) || null,
    filePath: row.filePath || null,
    fileId: row.fileId || null,
    fileName: row.fileName || null,
    metadata: row.metadata || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

// ─── Get single code mapping by code path ───────────────────

export async function getCodeMapping(
  projectWorkflowId: string,
  codePath: string
): Promise<CodeMappingData | null> {
  const { data, error } = await supabase
    .from("code_mapping")
    .select("*")
    .eq("projectWorkflowId", projectWorkflowId)
    .eq("codePath", codePath)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    projectWorkflowId: data.projectWorkflowId,
    codePath: data.codePath,
    columnKeyMap: (data.columnKeyMap as ColumnKeyMap) || {},
    mergeConfig: (data.mergeConfig as MergeConfig) || null,
    filePath: data.filePath || null,
    fileId: data.fileId || null,
    fileName: data.fileName || null,
    metadata: data.metadata || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ─── Create or update a code mapping (upsert) ──────────────

export async function upsertCodeMapping(params: {
  projectWorkflowId: string;
  codePath: string;
  columnKeyMap: ColumnKeyMap;
  mergeConfig?: MergeConfig | null;
  filePath?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<CodeMappingData> {
  const {
    projectWorkflowId,
    codePath,
    columnKeyMap,
    mergeConfig,
    filePath,
    fileId,
    fileName,
    metadata,
  } = params;

  // Check if existing mapping exists
  const existing = await getCodeMapping(projectWorkflowId, codePath);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("code_mapping")
      .update({
        columnKeyMap,
        mergeConfig: mergeConfig !== undefined ? mergeConfig : existing.mergeConfig,
        filePath: filePath !== undefined ? filePath : existing.filePath,
        fileId: fileId !== undefined ? fileId : existing.fileId,
        fileName: fileName !== undefined ? fileName : existing.fileName,
        metadata: metadata !== undefined ? metadata : existing.metadata,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update code mapping: ${error.message}`);

    return {
      id: data.id,
      projectWorkflowId: data.projectWorkflowId,
      codePath: data.codePath,
      columnKeyMap: data.columnKeyMap as ColumnKeyMap,
      mergeConfig: data.mergeConfig as MergeConfig | null,
      filePath: data.filePath,
      fileId: data.fileId,
      fileName: data.fileName,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } else {
    // Insert
    const { data, error } = await supabase
      .from("code_mapping")
      .insert({
        projectWorkflowId,
        codePath,
        columnKeyMap,
        mergeConfig: mergeConfig || null,
        filePath: filePath || null,
        fileId: fileId || null,
        fileName: fileName || null,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create code mapping: ${error.message}`);

    return {
      id: data.id,
      projectWorkflowId: data.projectWorkflowId,
      codePath: data.codePath,
      columnKeyMap: data.columnKeyMap as ColumnKeyMap,
      mergeConfig: data.mergeConfig as MergeConfig | null,
      filePath: data.filePath,
      fileId: data.fileId,
      fileName: data.fileName,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

// ─── Update only the merge config for a code mapping ────────

export async function updateMergeConfig(
  projectWorkflowId: string,
  codePath: string,
  mergeConfig: MergeConfig
): Promise<void> {
  const existing = await getCodeMapping(projectWorkflowId, codePath);
  if (!existing) throw new Error(`Code mapping not found for path: ${codePath}`);

  const { error } = await supabase
    .from("code_mapping")
    .update({
      mergeConfig,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) throw new Error(`Failed to update merge config: ${error.message}`);
}

// ─── Update file association for a code mapping ─────────────

export async function updateCodeMappingFile(
  projectWorkflowId: string,
  codePath: string,
  filePath: string,
  fileName: string,
  fileId?: string | null
): Promise<void> {
  const existing = await getCodeMapping(projectWorkflowId, codePath);
  if (!existing) throw new Error(`Code mapping not found for path: ${codePath}`);

  const { error } = await supabase
    .from("code_mapping")
    .update({
      filePath,
      fileName,
      fileId: fileId || null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) throw new Error(`Failed to update file association: ${error.message}`);
}

// ─── Update column key map for a code mapping ───────────────

export async function updateColumnKeyMap(
  projectWorkflowId: string,
  codePath: string,
  columnKeyMap: ColumnKeyMap
): Promise<void> {
  const existing = await getCodeMapping(projectWorkflowId, codePath);
  if (!existing) throw new Error(`Code mapping not found for path: ${codePath}`);

  const { error } = await supabase
    .from("code_mapping")
    .update({
      columnKeyMap,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) throw new Error(`Failed to update column key map: ${error.message}`);
}

// ─── Delete a code mapping ──────────────────────────────────

export async function deleteCodeMapping(
  projectWorkflowId: string,
  codePath: string
): Promise<void> {
  const { error } = await supabase
    .from("code_mapping")
    .delete()
    .eq("projectWorkflowId", projectWorkflowId)
    .eq("codePath", codePath);

  if (error) throw new Error(`Failed to delete code mapping: ${error.message}`);
}

// ─── Batch upsert multiple code mappings ────────────────────

export async function batchUpsertCodeMappings(
  projectWorkflowId: string,
  mappings: Array<{
    codePath: string;
    columnKeyMap: ColumnKeyMap;
    mergeConfig?: MergeConfig | null;
  }>
): Promise<CodeMappingData[]> {
  const results: CodeMappingData[] = [];

  for (const mapping of mappings) {
    const result = await upsertCodeMapping({
      projectWorkflowId,
      codePath: mapping.codePath,
      columnKeyMap: mapping.columnKeyMap,
      mergeConfig: mapping.mergeConfig,
    });
    results.push(result);
  }

  return results;
}
