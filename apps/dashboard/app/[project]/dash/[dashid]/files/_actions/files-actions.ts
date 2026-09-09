"use server";

import { supabase } from "@repo/db";
import Papa from "papaparse";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string | null): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export interface WorkspaceFolderItem {
  id: string;
  workflowId: string;
  userId: string;
  parentId: string | null;
  name: string;
  path: string; // e.g. "A", "A/B", "A/B/C"
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  subfolderCount?: number;
}

export interface WorkspaceFileItem {
  id: string;
  workflowId: string;
  userId: string;
  folderId: string | null;
  folderPath: string; // e.g. "A/B/C" or "" for root
  name: string;
  fileType: string;
  data?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalizes folder path by trimming slashes and whitespace
 */
function normalizePath(path?: string | null): string {
  if (!path) return "";
  return path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

/**
 * Get folder metadata by path (e.g. "A/B/C")
 */
export async function getFolderByPath(dashid: string, path: string): Promise<WorkspaceFolderItem | null> {
  if (!isValidUuid(dashid)) return null;
  const cleanPath = normalizePath(path);
  if (!cleanPath) return null;

  const { data, error } = await supabase
    .from("workspace_folder")
    .select("*")
    .eq("workflowId", dashid)
    .eq("path", cleanPath)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Fetch direct child subfolders for a given parent path ("" for root)
 */
export async function getSubfolders(dashid: string, parentPath: string = ""): Promise<WorkspaceFolderItem[]> {
  if (!isValidUuid(dashid)) return [];
  const cleanParentPath = normalizePath(parentPath);

  let query = supabase
    .from("workspace_folder")
    .select("*")
    .eq("workflowId", dashid)
    .order("name", { ascending: true });

  if (!cleanParentPath) {
    // Root level folders: parentId IS NULL
    query = query.is("parentId", null);
  } else {
    // Find parent folder ID
    const parentFolder = await getFolderByPath(dashid, cleanParentPath);
    if (!parentFolder) return [];
    query = query.eq("parentId", parentFolder.id);
  }

  const { data: subfolders, error } = await query;
  if (error) {
    console.error("Error fetching subfolders:", error);
    return [];
  }

  const folderList: WorkspaceFolderItem[] = subfolders || [];

  // Fetch counts of direct files in each subfolder
  const { data: allFiles } = await supabase
    .from("workspace_file")
    .select("folderPath")
    .eq("workflowId", dashid);

  const fileCountMap: Record<string, number> = {};
  if (allFiles) {
    allFiles.forEach((f: any) => {
      const p = f.folderPath || "";
      fileCountMap[p] = (fileCountMap[p] || 0) + 1;
    });
  }

  // Fetch all folders to compute subfolder counts
  const { data: allWorkspaceFolders } = await supabase
    .from("workspace_folder")
    .select("parentId")
    .eq("workflowId", dashid);

  const subfolderCountMap: Record<string, number> = {};
  if (allWorkspaceFolders) {
    allWorkspaceFolders.forEach((f: any) => {
      if (f.parentId) {
        subfolderCountMap[f.parentId] = (subfolderCountMap[f.parentId] || 0) + 1;
      }
    });
  }

  return folderList.map((folder) => ({
    ...folder,
    fileCount: fileCountMap[folder.path] || 0,
    subfolderCount: subfolderCountMap[folder.id] || 0,
  }));
}

/**
 * Fetch all folders in a project (flat list with path for dropdowns)
 */
export async function getAllFoldersFlat(dashid: string): Promise<WorkspaceFolderItem[]> {
  if (!isValidUuid(dashid)) return [];

  const { data, error } = await supabase
    .from("workspace_folder")
    .select("*")
    .eq("workflowId", dashid)
    .order("path", { ascending: true });

  if (error) {
    console.error("Error fetching flat folders:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch files located directly in the folder at folderPath ("" for root)
 */
export async function getFilesInFolder(dashid: string, folderPath: string = ""): Promise<WorkspaceFileItem[]> {
  if (!isValidUuid(dashid)) return [];
  const cleanPath = normalizePath(folderPath);

  const { data, error } = await supabase
    .from("workspace_file")
    .select("*")
    .eq("workflowId", dashid)
    .eq("folderPath", cleanPath)
    .order("updatedAt", { ascending: false });

  if (error) {
    console.error("Error fetching files in folder:", error);
    return [];
  }
  return data || [];
}

/**
 * Create a nested folder inside parentPath
 */
export async function createNestedFolder({
  dashid,
  userId,
  parentPath = "",
  name,
  description,
  color,
}: {
  dashid: string;
  userId: string;
  parentPath?: string;
  name: string;
  description?: string;
  color?: string;
}) {
  if (!isValidUuid(dashid)) throw new Error("Invalid project ID");
  const cleanName = name.trim().replace(/\//g, "-");
  if (!cleanName) throw new Error("Folder name cannot be empty");

  const cleanParentPath = normalizePath(parentPath);
  const fullPath = cleanParentPath ? `${cleanParentPath}/${cleanName}` : cleanName;

  let parentId: string | null = null;
  if (cleanParentPath) {
    const parentFolder = await getFolderByPath(dashid, cleanParentPath);
    if (!parentFolder) throw new Error(`Parent folder "${cleanParentPath}" does not exist`);
    parentId = parentFolder.id;
  }

  // Check if folder already exists at this path
  const { data: existing } = await supabase
    .from("workspace_folder")
    .select("id")
    .eq("workflowId", dashid)
    .eq("path", fullPath)
    .maybeSingle();

  if (existing) {
    throw new Error(`A folder at "${fullPath}" already exists.`);
  }

  const { data: folder, error } = await supabase
    .from("workspace_folder")
    .insert({
      workflowId: dashid,
      userId,
      parentId,
      name: cleanName,
      path: fullPath,
      description: description?.trim() || null,
      color: color || "indigo",
    })
    .select()
    .single();

  if (error) throw error;
  return folder;
}

/**
 * Helper: Ensure all intermediate folders exist for a given path
 */
export async function ensureFolderPathExists(dashid: string, userId: string, folderPath: string): Promise<string | null> {
  const cleanPath = normalizePath(folderPath);
  if (!cleanPath) return null;

  const parts = cleanPath.split("/");
  let currentPath = "";
  let currentParentId: string | null = null;

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    const { data: existing } = await supabase
      .from("workspace_folder")
      .select("id")
      .eq("workflowId", dashid)
      .eq("path", currentPath)
      .maybeSingle();

    if (existing) {
      currentParentId = existing.id;
    } else {
      const { data: created, error }: { data: { id: string } | null; error: any } = await supabase
        .from("workspace_folder")
        .insert({
          workflowId: dashid,
          userId,
          parentId: currentParentId,
          name: part,
          path: currentPath,
          color: "indigo",
        })
        .select("id")
        .single();

      if (error) {
        console.warn(`Could not auto-create folder "${currentPath}":`, error);
        return currentParentId;
      }
      currentParentId = created?.id || null;
    }
  }

  return currentParentId;
}

/**
 * Save or overwrite file inside a folder path
 */
export async function createOrOverwriteWorkspaceFile({
  dashid,
  userId,
  folderPath = "",
  fileName,
  data,
  fileType = "csv",
  metadata,
}: {
  dashid: string;
  userId: string;
  folderPath?: string;
  fileName: string;
  data: any;
  fileType?: string;
  metadata?: any;
}) {
  if (!isValidUuid(dashid)) throw new Error("Invalid project ID");
  const trimmedName = fileName.trim();
  if (!trimmedName) throw new Error("File name is required");

  const cleanPath = normalizePath(folderPath);

  // Auto-ensure destination folder exists if a path is specified
  let targetFolderId: string | null = null;
  if (cleanPath) {
    targetFolderId = await ensureFolderPathExists(dashid, userId, cleanPath);
  }

  // Auto-normalize CSV string into structured columns and data
  let normalizedData = data;
  if (typeof data === "string" && (fileType === "csv" || trimmedName.toLowerCase().endsWith(".csv"))) {
    try {
      const parsed = Papa.parse(data, { header: false, skipEmptyLines: true });
      const rows = (parsed.data as string[][]) || [];
      if (rows.length > 0) {
        const cols = rows[0].map((c, i) => (c?.trim() ? c.trim() : `Column_${i + 1}`));
        normalizedData = {
          columns: cols,
          data: rows.slice(1),
          rawCsv: data,
        };
      }
    } catch (e) {
      console.warn("Auto-parse CSV string error:", e);
    }
  }

  const rowCount = Array.isArray(normalizedData?.data) ? normalizedData.data.length : undefined;
  const colCount = Array.isArray(normalizedData?.columns) ? normalizedData.columns.length : undefined;

  const mergedMetadata = {
    rowCount: rowCount ?? metadata?.rowCount,
    colCount: colCount ?? metadata?.colCount,
    columns: normalizedData?.columns || metadata?.columns,
    ...metadata,
  };

  // Check if file with same name exists at this folderPath
  const { data: existing } = await supabase
    .from("workspace_file")
    .select("id")
    .eq("workflowId", dashid)
    .eq("folderPath", cleanPath)
    .eq("name", trimmedName)
    .maybeSingle();

  if (existing) {
    // Overwrite existing file
    const { data: updated, error } = await supabase
      .from("workspace_file")
      .update({
        data: normalizedData,
        metadata: mergedMetadata,
        fileType,
        folderId: targetFolderId,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return { file: updated, overwritten: true };
  } else {
    // Insert new file
    const { data: created, error } = await supabase
      .from("workspace_file")
      .insert({
        workflowId: dashid,
        userId,
        folderId: targetFolderId,
        folderPath: cleanPath,
        name: trimmedName,
        data: normalizedData,
        fileType,
        metadata: mergedMetadata,
      })
      .select()
      .single();

    if (error) throw error;
    return { file: created, overwritten: false };
  }
}

/**
 * Get file by folder path and file name (Used by GetFileNode)
 */
export async function getWorkspaceFileByPath({
  dashid,
  folderPath = "",
  fileName,
}: {
  dashid: string;
  folderPath?: string;
  fileName: string;
}) {
  if (!isValidUuid(dashid)) return null;
  const trimmedName = fileName.trim();
  if (!trimmedName) return null;

  const cleanPath = normalizePath(folderPath);

  const { data, error } = await supabase
    .from("workspace_file")
    .select("*")
    .eq("workflowId", dashid)
    .eq("folderPath", cleanPath)
    .eq("name", trimmedName)
    .maybeSingle();

  if (error) {
    console.error("Error finding file by path:", error);
    return null;
  }
  return data;
}

/**
 * Delete a folder by path, cascading to its subfolders and files
 */
export async function deleteFolderByPath(dashid: string, folderPath: string) {
  if (!isValidUuid(dashid)) throw new Error("Invalid project ID");
  const cleanPath = normalizePath(folderPath);
  if (!cleanPath) throw new Error("Cannot delete root");

  const folder = await getFolderByPath(dashid, cleanPath);
  if (!folder) throw new Error("Folder not found");

  // Delete all files inside this folder or any nested subfolder path
  await supabase
    .from("workspace_file")
    .delete()
    .eq("workflowId", dashid)
    .or(`folderPath.eq.${cleanPath},folderPath.like.${cleanPath}/%`);

  // Delete all subfolders matching this prefix
  await supabase
    .from("workspace_folder")
    .delete()
    .eq("workflowId", dashid)
    .or(`path.eq.${cleanPath},path.like.${cleanPath}/%`);

  return { success: true };
}

/**
 * Delete a single workspace file
 */
export async function deleteWorkspaceFile(fileId: string) {
  if (!isValidUuid(fileId)) throw new Error("Invalid file ID");

  const { data, error } = await supabase
    .from("workspace_file")
    .delete()
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Move file to another folder path
 */
export async function moveFileToFolderPath(fileId: string, targetFolderPath: string, userId: string) {
  if (!isValidUuid(fileId)) throw new Error("Invalid file ID");
  const cleanTarget = normalizePath(targetFolderPath);

  // Fetch current file
  const { data: file } = await supabase
    .from("workspace_file")
    .select("workflowId")
    .eq("id", fileId)
    .single();

  if (!file) throw new Error("File not found");

  let targetFolderId: string | null = null;
  if (cleanTarget) {
    targetFolderId = await ensureFolderPathExists(file.workflowId, userId, cleanTarget);
  }

  const { data: updated, error } = await supabase
    .from("workspace_file")
    .update({
      folderPath: cleanTarget,
      folderId: targetFolderId,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

/**
 * Import CSV text into folder path
 */
export async function importCsvFileToFolder({
  dashid,
  userId,
  folderPath = "",
  fileName,
  csvText,
}: {
  dashid: string;
  userId: string;
  folderPath?: string;
  fileName: string;
  csvText: string;
}) {
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const allRows = (parsed.data as string[][]) || [];
  if (allRows.length === 0) {
    throw new Error("CSV file is empty");
  }

  const columns = allRows[0].map((c, i) => (c?.trim() ? c.trim() : `Column_${i + 1}`));
  const data = allRows.slice(1);
  const cleanFileName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;

  return await createOrOverwriteWorkspaceFile({
    dashid,
    userId,
    folderPath,
    fileName: cleanFileName,
    data: {
      columns,
      data,
    },
    fileType: "csv",
    metadata: {
      rowCount: data.length,
      colCount: columns.length,
      columns,
      importedAt: new Date().toISOString(),
    },
  });
}
