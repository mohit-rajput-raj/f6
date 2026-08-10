"use server";

import { supabase } from "@repo/db";

// ─── Types ──────────────────────────────────────────────────
export interface DeskTextInput {
  id: string;
  placeholder: string;
  value: string;
}

export interface Dataset {
  columns: string[];
  data: any[][];
}

export interface DeskSheet {
  id: string;
  name: string;
  data: Dataset | null;
}

export interface CheckboxField {
  id: string;
  label: string;
  checked: boolean;
  nodeId: string; // the TrueFalseNode id in editor
}

export interface DeskBlockData {
  id: string;
  name: string;
  blockOrder: number;
  editorWorkflowId: string;
  projectWorkflowId: string;
  parentId: string | null;
  treeDepth: number;
  reservedColumns: string[];
  textInputs: DeskTextInput[];
  sheets: DeskSheet[];
  outputPreview: Dataset | null;
  checkboxFields: CheckboxField[];
}

// ─── Get all blocks for a project ───────────────────────────
export async function getDeskBlocks(projectWorkflowId: string): Promise<DeskBlockData[]> {
  const { data: blocks } = await supabase
    .from("desk_block")
    .select("*")
    .eq("projectWorkflowId", projectWorkflowId)
    .order("blockOrder", { ascending: true });

  return (blocks || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    blockOrder: b.blockOrder,
    editorWorkflowId: b.editorWorkflowId,
    projectWorkflowId: b.projectWorkflowId,
    parentId: b.parentId,
    treeDepth: b.treeDepth,
    reservedColumns: b.reservedColumns || [],
    textInputs: (b.textInputs as unknown as DeskTextInput[]) ?? [],
    sheets: (b.sheets as unknown as DeskSheet[]) ?? [],
    outputPreview: (b.outputPreview as unknown as Dataset) ?? null,
    checkboxFields: (b.checkboxFields as unknown as CheckboxField[]) ?? [],
  }));
}

// ─── Create a new block ─────────────────────────────────────
export async function createDeskBlock(
  projectWorkflowId: string,
  userId: string,
  blockOrder?: number,
  parentId?: string,
  tabName?: string
): Promise<DeskBlockData> {
  // Get current max order
  const { data: maxBlocks } = await supabase
    .from("desk_block")
    .select("blockOrder")
    .eq("projectWorkflowId", projectWorkflowId)
    .order("blockOrder", { ascending: false })
    .limit(1);

  const maxBlock = maxBlocks && maxBlocks.length > 0 ? maxBlocks[0] : null;
  const order = blockOrder ?? (maxBlock ? maxBlock.blockOrder + 1 : 0);

  // Determine tree depth from parent
  let treeDepth = 0;
  if (parentId) {
    const { data: parent } = await supabase
      .from("desk_block")
      .select("treeDepth")
      .eq("id", parentId)
      .maybeSingle();

    treeDepth = (parent?.treeDepth ?? 0) + 1;
  }

  const blockId = crypto.randomUUID();
  const blockName = tabName || `Block ${order + 1}`;
  const initialSheets = [
    {
      id: crypto.randomUUID(),
      name: "Sheet 1",
      data: null,
    },
  ];

  // Create a workflow for this block's editor with empty nodes
  const { data: editorWorkflow, error: wfErr } = await supabase
    .from("workflow")
    .insert({
      userId,
      name: `${blockName} Editor`,
      definition: {
        meta: { version: "1.0", createdAt: new Date().toISOString() },
        reactFlow: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
      tags: ["desk-block-editor"],
    })
    .select()
    .single();

  if (wfErr) throw wfErr;

  const { data: block, error: blockErr } = await supabase
    .from("desk_block")
    .insert({
      id: blockId,
      projectWorkflowId,
      editorWorkflowId: editorWorkflow.id,
      name: blockName,
      blockOrder: order,
      parentId: parentId ?? null,
      treeDepth,
      textInputs: [],
      sheets: initialSheets,
      checkboxFields: [],
    })
    .select()
    .single();

  if (blockErr) throw blockErr;

  return {
    id: block.id,
    name: block.name,
    blockOrder: block.blockOrder,
    editorWorkflowId: block.editorWorkflowId,
    projectWorkflowId: block.projectWorkflowId,
    parentId: block.parentId,
    treeDepth: block.treeDepth,
    reservedColumns: block.reservedColumns || [],
    textInputs: [],
    sheets: initialSheets,
    outputPreview: null,
    checkboxFields: [],
  };
}

// ─── Sync block fields from workflow nodes ──────────────────
export async function syncBlockFieldsFromWorkflow(
  editorWorkflowId: string
) {
  // Find the block that owns this editor
  const { data: block } = await supabase
    .from("desk_block")
    .select("*")
    .eq("editorWorkflowId", editorWorkflowId)
    .maybeSingle();

  if (!block) return;

  // Load the workflow to scan nodes
  const { data: workflow } = await supabase
    .from("workflow")
    .select("definition")
    .eq("id", editorWorkflowId)
    .maybeSingle();

  if (!workflow?.definition) return;

  const def = workflow.definition as any;
  const nodes: any[] = def?.reactFlow?.nodes ?? [];

  // Existing fields (preserve user values)
  const existingInputs = (block.textInputs as unknown as DeskTextInput[]) ?? [];
  const existingSheets = (block.sheets as unknown as DeskSheet[]) ?? [];
  const existingCheckboxes = (block.checkboxFields as unknown as CheckboxField[]) ?? [];

  // Derive text inputs from DeskTextInputNode nodes
  const textInputs: DeskTextInput[] = nodes
    .filter((n: any) => n.type === "DeskTextInputNode" || n.data?.type === "DeskTextInputNode")
    .map((n: any) => {
      const inputId = n.data?.deskInputId || n.id;
      const existing = existingInputs.find((e) => e.id === inputId);
      return {
        id: inputId,
        placeholder: n.data?.placeholder ?? "Text Input",
        value: existing?.value ?? "",
      };
    });

  // Derive sheets from DeskSheetNode nodes
  const sheets: DeskSheet[] = nodes
    .filter((n: any) => n.type === "DeskSheetNode" || n.data?.type === "DeskSheetNode")
    .map((n: any) => {
      const sheetId = n.data?.deskSheetId || n.id;
      const existing = existingSheets.find((e) => e.id === sheetId);
      return {
        id: sheetId,
        name: n.data?.sheetName ?? "Sheet",
        data: existing?.data ?? null,
      };
    });

  // Derive checkboxes from TrueFalseNode nodes
  const checkboxFields: CheckboxField[] = nodes
    .filter((n: any) => n.type === "TrueFalseNode" || n.data?.type === "TrueFalseNode")
    .map((n: any) => {
      const fieldId = n.data?.checkboxId || n.id;
      const existing = existingCheckboxes.find((e) => e.id === fieldId);
      return {
        id: fieldId,
        label: n.data?.label ?? "Toggle",
        checked: existing?.checked ?? false,
        nodeId: n.id,
      };
    });

  // Update the block
  await supabase
    .from("desk_block")
    .update({
      textInputs: textInputs as any,
      sheets: sheets as any,
      checkboxFields: checkboxFields as any,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", block.id);

  return { textInputs, sheets, checkboxFields };
}

// ─── Initialize default desk (called on first load) ─────────
export async function initializeDefaultDesk(
  projectWorkflowId: string,
  userId: string
): Promise<DeskBlockData[]> {
  const { count } = await supabase
    .from("desk_block")
    .select("id", { count: "exact", head: true })
    .eq("projectWorkflowId", projectWorkflowId);

  if (count && count > 0) {
    return getDeskBlocks(projectWorkflowId);
  }

  // Create first root BigBlock
  const rootBlock = await createDeskBlock(projectWorkflowId, userId, 0, undefined, "BigBlock 1");
  // Create first child tab
  const childTab = await createDeskBlock(projectWorkflowId, userId, 0, rootBlock.id, "Tab 1");

  return [rootBlock, childTab];
}

// ─── Update block inputs ────────────────────────────────────
export async function updateDeskBlockInputs(
  blockId: string,
  data: {
    textInputs?: DeskTextInput[];
    sheets?: DeskSheet[];
    checkboxFields?: CheckboxField[];
  }
) {
  const updateData: any = { updatedAt: new Date().toISOString() };
  if (data.textInputs !== undefined) updateData.textInputs = data.textInputs;
  if (data.sheets !== undefined) updateData.sheets = data.sheets;
  if (data.checkboxFields !== undefined) updateData.checkboxFields = data.checkboxFields;

  const { data: updated, error } = await supabase
    .from("desk_block")
    .update(updateData)
    .eq("id", blockId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

// ─── Update block output preview ────────────────────────────
export async function updateDeskBlockOutput(
  blockId: string,
  outputPreview: Dataset | null
) {
  const { data, error } = await supabase
    .from("desk_block")
    .update({ outputPreview: outputPreview as any, updatedAt: new Date().toISOString() })
    .eq("id", blockId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Delete a block ─────────────────────────────────────────
export async function deleteDeskBlock(blockId: string) {
  const { data: block } = await supabase
    .from("desk_block")
    .select("editorWorkflowId")
    .eq("id", blockId)
    .maybeSingle();

  if (!block) throw new Error("Block not found");

  await supabase.from("desk_block").delete().eq("id", blockId);

  try {
    await supabase.from("workflow").delete().eq("id", block.editorWorkflowId);
  } catch {
    // May already be deleted by cascade
  }
}

// ─── Rename a block ─────────────────────────────────────────
export async function renameDeskBlock(blockId: string, name: string) {
  const { data, error } = await supabase
    .from("desk_block")
    .update({ name, updatedAt: new Date().toISOString() })
    .eq("id", blockId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Reorder blocks ─────────────────────────────────────────
export async function reorderDeskBlocks(
  projectWorkflowId: string,
  orderedIds: string[]
) {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("desk_block")
        .update({ blockOrder: index, updatedAt: new Date().toISOString() })
        .eq("id", id)
    )
  );
}

// ─── Get single block ───────────────────────────────────────
export async function getDeskBlock(blockId: string): Promise<DeskBlockData | null> {
  const { data: b } = await supabase.from("desk_block").select("*").eq("id", blockId).maybeSingle();
  if (!b) return null;

  return {
    id: b.id,
    name: b.name,
    blockOrder: b.blockOrder,
    editorWorkflowId: b.editorWorkflowId,
    projectWorkflowId: b.projectWorkflowId,
    parentId: b.parentId,
    treeDepth: b.treeDepth,
    reservedColumns: b.reservedColumns || [],
    textInputs: (b.textInputs as unknown as DeskTextInput[]) ?? [],
    sheets: (b.sheets as unknown as DeskSheet[]) ?? [],
    outputPreview: (b.outputPreview as unknown as Dataset) ?? null,
    checkboxFields: (b.checkboxFields as unknown as CheckboxField[]) ?? [],
  };
}

