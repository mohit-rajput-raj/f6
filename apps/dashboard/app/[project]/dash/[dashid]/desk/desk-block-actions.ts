"use server";

import { prisma } from "@repo/db";

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
  blockOrder: number;
  editorWorkflowId: string;
  projectWorkflowId: string;
  textInputs: DeskTextInput[];
  sheets: DeskSheet[];
  outputPreview: Dataset | null;
  checkboxFields: CheckboxField[];
}

// ─── Get all blocks for a project ───────────────────────────
export async function getDeskBlocks(projectWorkflowId: string): Promise<DeskBlockData[]> {
  const blocks = await prisma.deskBlock.findMany({
    where: { projectWorkflowId },
    orderBy: { blockOrder: "asc" },
  });

  return blocks.map((b) => ({
    id: b.id,
    blockOrder: b.blockOrder,
    editorWorkflowId: b.editorWorkflowId,
    projectWorkflowId: b.projectWorkflowId,
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
  blockOrder?: number
): Promise<DeskBlockData> {
  // Get current max order
  const maxBlock = await prisma.deskBlock.findFirst({
    where: { projectWorkflowId },
    orderBy: { blockOrder: "desc" },
    select: { blockOrder: true },
  });

  const order = blockOrder ?? (maxBlock ? maxBlock.blockOrder + 1 : 0);

  // Pre-generate ID
  const blockId = crypto.randomUUID();

  // Create a workflow for this block's editor with empty nodes
  const editorWorkflow = await prisma.workflow.create({
    data: {
      userId,
      name: `Block ${order + 1} Editor`,
      definition: {
        meta: { version: "1.0", createdAt: new Date().toISOString() },
        reactFlow: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
      tags: ["desk-block-editor"],
    },
  });

  const block = await prisma.deskBlock.create({
    data: {
      id: blockId,
      projectWorkflowId,
      editorWorkflowId: editorWorkflow.id,
      blockOrder: order,
      textInputs: [] as any,
      sheets: [] as any,
      checkboxFields: [] as any,
    },
  });

  return {
    id: block.id,
    blockOrder: block.blockOrder,
    editorWorkflowId: block.editorWorkflowId,
    projectWorkflowId: block.projectWorkflowId,
    textInputs: [],
    sheets: [],
    outputPreview: null,
    checkboxFields: [],
  };
}

// ─── Sync block fields from workflow nodes ──────────────────
export async function syncBlockFieldsFromWorkflow(
  editorWorkflowId: string
) {
  // Find the block that owns this editor
  const block = await prisma.deskBlock.findUnique({
    where: { editorWorkflowId },
  });
  if (!block) return;

  // Load the workflow to scan nodes
  const workflow = await prisma.workflow.findUnique({
    where: { id: editorWorkflowId },
    select: { definition: true },
  });
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
  await prisma.deskBlock.update({
    where: { id: block.id },
    data: {
      textInputs: textInputs as any,
      sheets: sheets as any,
      checkboxFields: checkboxFields as any,
    },
  });

  return { textInputs, sheets, checkboxFields };
}

// ─── Initialize default desk (called on first load) ─────────
export async function initializeDefaultDesk(
  projectWorkflowId: string,
  userId: string
): Promise<DeskBlockData[]> {
  // Check if blocks already exist
  const existing = await prisma.deskBlock.count({
    where: { projectWorkflowId },
  });

  if (existing > 0) {
    return getDeskBlocks(projectWorkflowId);
  }

  // Create first block
  const block = await createDeskBlock(projectWorkflowId, userId, 0);
  return [block];
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
  const updateData: any = {};
  if (data.textInputs !== undefined) updateData.textInputs = data.textInputs;
  if (data.sheets !== undefined) updateData.sheets = data.sheets;
  if (data.checkboxFields !== undefined) updateData.checkboxFields = data.checkboxFields;

  return prisma.deskBlock.update({
    where: { id: blockId },
    data: updateData,
  });
}

// ─── Update block output preview ────────────────────────────
export async function updateDeskBlockOutput(
  blockId: string,
  outputPreview: Dataset | null
) {
  return prisma.deskBlock.update({
    where: { id: blockId },
    data: { outputPreview: outputPreview as any },
  });
}

// ─── Delete a block ─────────────────────────────────────────
export async function deleteDeskBlock(blockId: string) {
  const block = await prisma.deskBlock.findUnique({
    where: { id: blockId },
    select: { editorWorkflowId: true },
  });

  if (!block) throw new Error("Block not found");

  // Delete the block (cascade will handle the relation)
  await prisma.deskBlock.delete({ where: { id: blockId } });

  // Delete the editor workflow
  try {
    await prisma.workflow.delete({ where: { id: block.editorWorkflowId } });
  } catch {
    // May already be deleted by cascade
  }
}

// ─── Reorder blocks ─────────────────────────────────────────
export async function reorderDeskBlocks(
  projectWorkflowId: string,
  orderedIds: string[]
) {
  const updates = orderedIds.map((id, index) =>
    prisma.deskBlock.update({
      where: { id },
      data: { blockOrder: index },
    })
  );
  await prisma.$transaction(updates);
}

// ─── Get single block ───────────────────────────────────────
export async function getDeskBlock(blockId: string): Promise<DeskBlockData | null> {
  const b = await prisma.deskBlock.findUnique({ where: { id: blockId } });
  if (!b) return null;

  return {
    id: b.id,
    blockOrder: b.blockOrder,
    editorWorkflowId: b.editorWorkflowId,
    projectWorkflowId: b.projectWorkflowId,
    textInputs: (b.textInputs as unknown as DeskTextInput[]) ?? [],
    sheets: (b.sheets as unknown as DeskSheet[]) ?? [],
    outputPreview: (b.outputPreview as unknown as Dataset) ?? null,
    checkboxFields: (b.checkboxFields as unknown as CheckboxField[]) ?? [],
  };
}
