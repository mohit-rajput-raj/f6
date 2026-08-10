import { supabase } from "@repo/db";

export class DeskService {
  /**
   * Get all blocks for a project workflow, organized as a tree.
   */
  async getBlocks(projectWorkflowId: string) {
    const { data: blocks } = await supabase
      .from("desk_block")
      .select("*")
      .eq("projectWorkflowId", projectWorkflowId)
      .order("blockOrder", { ascending: true });

    return blocks || [];
  }

  /**
   * Get a single desk block by ID.
   */
  async getBlock(blockId: string) {
    const { data: block } = await supabase
      .from("desk_block")
      .select("*")
      .eq("id", blockId)
      .maybeSingle();

    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });
    return block;
  }

  /**
   * Reorder desk blocks within a project workflow.
   */
  async reorderBlocks(projectWorkflowId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("desk_block")
          .update({ blockOrder: index, updatedAt: new Date().toISOString() })
          .eq("id", id)
      )
    );
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
    const { data: maxBlocks } = await supabase
      .from("desk_block")
      .select("blockOrder")
      .eq("projectWorkflowId", projectWorkflowId)
      .order("blockOrder", { ascending: false })
      .limit(1);

    const maxBlock = maxBlocks && maxBlocks.length > 0 ? maxBlocks[0] : null;
    const order = opts?.blockOrder ?? (maxBlock ? maxBlock.blockOrder + 1 : 0);

    // Determine tree depth from parent
    let treeDepth = 0;
    if (opts?.parentId) {
      const { data: parent } = await supabase
        .from("desk_block")
        .select("treeDepth")
        .eq("id", opts.parentId)
        .maybeSingle();

      treeDepth = (parent?.treeDepth ?? 0) + 1;
    }

    // Create a workflow for this block's editor
    const { data: editorWorkflow, error: wfErr } = await supabase
      .from("workflow")
      .insert({
        userId,
        name: `Block ${order + 1} Editor`,
        definition: {
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        },
        tags: ["desk-block-editor"],
      })
      .select()
      .single();

    if (wfErr) throw wfErr;

    const { data: block, error: blockErr } = await supabase
      .from("desk_block")
      .insert({
        projectWorkflowId,
        editorWorkflowId: editorWorkflow.id,
        blockOrder: order,
        parentId: opts?.parentId ?? null,
        treeDepth,
        textInputs: [],
        sheets: [],
        checkboxFields: [],
      })
      .select()
      .single();

    if (blockErr) throw blockErr;
    return block;
  }

  /**
   * Update block inputs (text inputs, sheets, checkboxes).
   */
  async updateBlockInputs(
    blockId: string,
    data: { textInputs?: any; sheets?: any; checkboxFields?: any }
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

  /**
   * Update block output preview after execution.
   */
  async updateBlockOutput(blockId: string, outputPreview: any) {
    const { data, error } = await supabase
      .from("desk_block")
      .update({ outputPreview, updatedAt: new Date().toISOString() })
      .eq("id", blockId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    const { data: block } = await supabase
      .from("desk_block")
      .select("reservedColumns")
      .eq("id", blockId)
      .maybeSingle();

    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });

    let allowedColumns = block.reservedColumns || [];
    if (userEmail) {
      const { data: share } = await supabase
        .from("desk_share")
        .select("reservedColumns")
        .eq("masterSheetId", masterSheetId)
        .ilike("invitedEmail", userEmail)
        .maybeSingle();

      if (share && share.reservedColumns && share.reservedColumns.length > 0) {
        allowedColumns = share.reservedColumns;
      }
    }

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

    const { data: masterSheet } = await supabase
      .from("master_sheet")
      .select("*")
      .eq("id", masterSheetId)
      .maybeSingle();

    if (!masterSheet) throw Object.assign(new Error("MasterSheet not found"), { statusCode: 404 });

    const existing = (masterSheet.data as any) || { columns: [], data: [] };
    const mergedColumns = [...new Set([...existing.columns, ...outputData.columns])];

    const mergedData = existing.data.map((row: any[], rowIdx: number) => {
      const newRow = [...row];
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

    await supabase
      .from("master_sheet")
      .update({
        data: { columns: mergedColumns, data: mergedData },
        metadata: {
          rowCount: mergedData.length,
          colCount: mergedColumns.length,
          lastMergedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      .eq("id", masterSheetId);

    await supabase.from("master_sheet_history").insert({
      masterSheetId,
      userId: "system",
      userName: "Block Commit",
      action: "merge",
      changeSummary: `Committed ${outputData.columns.length} columns from block ${blockId}`,
    });

    return { success: true, columns: mergedColumns.length, rows: mergedData.length };
  }

  /**
   * Delete a desk block and its associated editor workflow.
   */
  async deleteBlock(blockId: string) {
    const { data: block } = await supabase
      .from("desk_block")
      .select("editorWorkflowId")
      .eq("id", blockId)
      .maybeSingle();

    if (!block) throw Object.assign(new Error("Block not found"), { statusCode: 404 });

    await supabase.from("desk_block").delete().eq("id", blockId);
    await supabase.from("workflow").delete().eq("id", block.editorWorkflowId);
    return { deleted: true };
  }
}

export const deskService = new DeskService();

