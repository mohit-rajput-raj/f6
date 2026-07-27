import { prisma } from "@repo/db";

export class DeskService {
  /**
   * Get all blocks for a project workflow, organized as a tree.
   */
  async getBlocks(projectWorkflowId: string) {
    const blocks = await prisma.deskBlock.findMany({
      where: { projectWorkflowId },
      orderBy: { blockOrder: "asc" },
      include: { children: { orderBy: { blockOrder: "asc" } } },
    });
    return blocks;
  }

  /**
   * Get a single desk block by ID.
   */
  async getBlock(blockId: string) {
    const block = await prisma.deskBlock.findUnique({
      where: { id: blockId },
      include: { children: { orderBy: { blockOrder: "asc" } } },
    });
    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });
    return block;
  }

  /**
   * Reorder desk blocks within a project workflow.
   */
  async reorderBlocks(projectWorkflowId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.deskBlock.update({
        where: { id },
        data: { blockOrder: index },
      })
    );
    await prisma.$transaction(updates);
    return { success: true, count: orderedIds.length };
  }

  /**
   * Create a new desk block (optionally with a parent for tree hierarchy).
   */
  async createBlock(
    projectWorkflowId: string,
    userId: string,
    opts?: { parentId?: string; blockOrder?: number }
  ) {
    const maxBlock = await prisma.deskBlock.findFirst({
      where: { projectWorkflowId },
      orderBy: { blockOrder: "desc" },
      select: { blockOrder: true },
    });
    const order = opts?.blockOrder ?? (maxBlock ? maxBlock.blockOrder + 1 : 0);

    // Determine tree depth from parent
    let treeDepth = 0;
    if (opts?.parentId) {
      const parent = await prisma.deskBlock.findUnique({
        where: { id: opts.parentId },
        select: { treeDepth: true },
      });
      treeDepth = (parent?.treeDepth ?? 0) + 1;
    }

    // Create a workflow for this block's editor
    const editorWorkflow = await prisma.workflow.create({
      data: {
        userId,
        name: `Block ${order + 1} Editor`,
        definition: {
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        },
        tags: ["desk-block-editor"],
      },
    });

    const block = await prisma.deskBlock.create({
      data: {
        projectWorkflowId,
        editorWorkflowId: editorWorkflow.id,
        blockOrder: order,
        parentId: opts?.parentId ?? null,
        treeDepth,
        textInputs: [],
        sheets: [],
        checkboxFields: [],
      },
    });

    return block;
  }

  /**
   * Update block inputs (text inputs, sheets, checkboxes).
   */
  async updateBlockInputs(
    blockId: string,
    data: { textInputs?: any; sheets?: any; checkboxFields?: any }
  ) {
    return prisma.deskBlock.update({
      where: { id: blockId },
      data: {
        ...(data.textInputs !== undefined && { textInputs: data.textInputs }),
        ...(data.sheets !== undefined && { sheets: data.sheets }),
        ...(data.checkboxFields !== undefined && { checkboxFields: data.checkboxFields }),
      },
    });
  }

  /**
   * Update block output preview after execution.
   */
  async updateBlockOutput(blockId: string, outputPreview: any) {
    return prisma.deskBlock.update({
      where: { id: blockId },
      data: { outputPreview },
    });
  }

  /**
   * Commit block output into reserved columns of MasterSheet.
   * Only writes to the columns this block or user is authorized for.
   */
  async commitToMasterSheet(
    masterSheetId: string,
    blockId: string,
    outputData: { columns: string[]; data: any[][] },
    userEmail?: string
  ) {
    const block = await prisma.deskBlock.findUnique({
      where: { id: blockId },
      select: { reservedColumns: true },
    });
    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });

    // If userEmail provided, check if user is a collaborator with restricted columns
    let allowedColumns = block.reservedColumns;
    if (userEmail) {
      const share = await prisma.deskShare.findFirst({
        where: { masterSheetId, invitedEmail: userEmail },
      });
      if (share && share.reservedColumns.length > 0) {
        allowedColumns = share.reservedColumns;
      }
    }

    // Validate that the output columns are within the authorized columns
    if (allowedColumns.length > 0) {
      const unauthorized = outputData.columns.filter(
        (col) => !allowedColumns.includes(col)
      );
      if (unauthorized.length > 0) {
        throw Object.assign(
          new Error(`Unauthorized columns for write: ${unauthorized.join(", ")}`),
          { statusCode: 403 }
        );
      }
    }

    // Read existing master sheet data
    const masterSheet = await prisma.masterSheet.findUnique({
      where: { id: masterSheetId },
    });
    if (!masterSheet) throw Object.assign(new Error("MasterSheet not found"), { statusCode: 404 });

    const existing = (masterSheet.data as any) || { columns: [], data: [] };
    const mergedColumns = [...new Set([...existing.columns, ...outputData.columns])];

    // Merge data by adding/updating the reserved columns
    const mergedData = existing.data.map((row: any[], rowIdx: number) => {
      const newRow = [...row];
      // Pad row to match new column count
      while (newRow.length < mergedColumns.length) newRow.push(null);

      outputData.columns.forEach((col) => {
        const targetIdx = mergedColumns.indexOf(col);
        const sourceIdx = outputData.columns.indexOf(col);
        if (targetIdx >= 0 && outputData.data[rowIdx]) {
          newRow[targetIdx] = outputData.data[rowIdx][sourceIdx] ?? null;
        }
      });
      return newRow;
    });

    // If output has more rows than existing, append them
    for (let i = existing.data.length; i < outputData.data.length; i++) {
      const newRow = new Array(mergedColumns.length).fill(null);
      const row = outputData.data[i];
      if (row) {
        outputData.columns.forEach((col, sourceIdx) => {
          const targetIdx = mergedColumns.indexOf(col);
          if (targetIdx >= 0) {
            newRow[targetIdx] = row[sourceIdx] ?? null;
          }
        });
      }
      mergedData.push(newRow);
    }

    // Save merged data back
    await prisma.masterSheet.update({
      where: { id: masterSheetId },
      data: {
        data: { columns: mergedColumns, data: mergedData },
        metadata: {
          rowCount: mergedData.length,
          colCount: mergedColumns.length,
          lastMergedAt: new Date().toISOString(),
        },
      },
    });

    // Record history
    await prisma.masterSheetHistory.create({
      data: {
        masterSheetId,
        userId: "system",
        userName: "Block Commit",
        action: "merge",
        changeSummary: `Committed ${outputData.columns.length} columns from block ${blockId}`,
      },
    });

    return { success: true, columns: mergedColumns.length, rows: mergedData.length };
  }

  /**
   * Delete a desk block and its associated editor workflow.
   */
  async deleteBlock(blockId: string) {
    const block = await prisma.deskBlock.findUnique({
      where: { id: blockId },
      select: { editorWorkflowId: true },
    });
    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });

    await prisma.deskBlock.delete({ where: { id: blockId } });
    await prisma.workflow.delete({ where: { id: block.editorWorkflowId } }).catch(() => {});
    return { deleted: true };
  }
}

export const deskService = new DeskService();
