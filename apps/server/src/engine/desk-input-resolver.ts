// ═══════════════════════════════════════════════════════════
// Desk Input Resolver — Server-side implementation
// Replaces Zustand store reads with direct DB queries
// ═══════════════════════════════════════════════════════════

import { supabase } from "@repo/db";
import type { Dataset, DeskInputResolver } from "@repo/workflow-engine/types";

export class ServerDeskInputResolver implements DeskInputResolver {
  constructor(
    private dashid: string,
    private userId: string,
    /** Pre-loaded desk inputs from the run request (avoids extra DB calls) */
    private preloaded?: {
      textInputs?: Array<{ id: string; value: string }>;
      sheets?: Array<{ id: string; data: Dataset }>;
      checkboxFields?: Array<{ id: string; checked: boolean }>;
      actionButtons?: Array<{ id: string; triggered: boolean }>;
    }
  ) {}

  async getTextInput(blockId: string, inputId: string): Promise<string> {
    // Check preloaded first by exact ID
    let preloaded = this.preloaded?.textInputs?.find(
      (t) => t.id === inputId
    );
    if (preloaded?.value && preloaded.value.trim()) return preloaded.value;

    // Fallback if only 1 text input in preloaded
    if (!preloaded && this.preloaded?.textInputs && this.preloaded.textInputs.length === 1) {
      const single = this.preloaded.textInputs[0];
      if (single?.value && single.value.trim()) return single.value;
    }

    // Fallback to DB
    const { data: block } = await supabase
      .from("desk_block")
      .select("textInputs")
      .eq("id", blockId)
      .maybeSingle();

    if (block?.textInputs && Array.isArray(block.textInputs)) {
      const input = (block.textInputs as any[]).find(
        (t: any) => t.id === inputId
      ) || (block.textInputs.length === 1 ? (block.textInputs as any[])[0] : null);
      if (input?.value && String(input.value).trim()) return String(input.value).trim();
      if (input?.placeholder && String(input.placeholder).trim()) return String(input.placeholder).trim();
    }
    return "";
  }

  async getSheetData(blockId: string, sheetId: string): Promise<Dataset> {
    // 1. Check preloaded first by exact sheetId
    let preloaded = this.preloaded?.sheets?.find((s) => s.id === sheetId);
    if (preloaded?.data && Array.isArray(preloaded.data.columns) && preloaded.data.columns.length > 0) {
      return preloaded.data;
    }

    // 2. If not found by exact ID, find any preloaded sheet that has data
    if (this.preloaded?.sheets && this.preloaded.sheets.length > 0) {
      const withData = this.preloaded.sheets.find(
        (s) => s.data && Array.isArray(s.data.columns) && s.data.columns.length > 0
      );
      if (withData?.data) return withData.data;
    }

    // 3. Fallback to DB query on this block
    const { data: block } = await supabase
      .from("desk_block")
      .select("sheets, parentId")
      .eq("id", blockId)
      .maybeSingle();

    if (block?.sheets && Array.isArray(block.sheets)) {
      let sheet = (block.sheets as any[]).find((s: any) => s.id === sheetId);
      if (!sheet || !sheet.data || !Array.isArray(sheet.data.columns) || sheet.data.columns.length === 0) {
        sheet = (block.sheets as any[]).find(
          (s: any) => s.data && Array.isArray(s.data.columns) && s.data.columns.length > 0
        );
      }
      if (sheet?.data && Array.isArray(sheet.data.columns) && sheet.data.columns.length > 0) {
        return sheet.data;
      }
    }

    // 4. Fallback: check parent block or child tabs in DB
    if (block?.parentId) {
      const { data: parentBlock } = await supabase
        .from("desk_block")
        .select("sheets")
        .eq("id", block.parentId)
        .maybeSingle();
      if (parentBlock?.sheets && Array.isArray(parentBlock.sheets)) {
        const pSheet = (parentBlock.sheets as any[]).find(
          (s: any) => s.data && Array.isArray(s.data.columns) && s.data.columns.length > 0
        );
        if (pSheet?.data && Array.isArray(pSheet.data.columns) && pSheet.data.columns.length > 0) {
          return pSheet.data;
        }
      }
    }

    return { columns: [], data: [] };
  }

  async getCheckboxValue(
    blockId: string,
    checkboxId: string
  ): Promise<boolean> {
    const preloaded = this.preloaded?.checkboxFields?.find(
      (c) => c.id === checkboxId
    );
    if (preloaded !== undefined) return preloaded.checked;

    const { data: block } = await supabase
      .from("desk_block")
      .select("checkboxFields")
      .eq("id", blockId)
      .maybeSingle();

    if (!block?.checkboxFields) return false;
    const field = (block.checkboxFields as any[]).find(
      (f: any) => f.id === checkboxId
    );
    return field?.checked ?? false;
  }

  async getActionButtonTriggered(
    blockId: string,
    actionId: string
  ): Promise<boolean> {
    const preloaded = this.preloaded?.actionButtons?.find(
      (a) => a.id === actionId
    );
    if (preloaded !== undefined) return preloaded.triggered;
    return false;
  }

  async getBlockOutput(blockId: string): Promise<Dataset | null> {
    const { data: block } = await supabase
      .from("desk_block")
      .select("outputPreview")
      .eq("id", blockId)
      .maybeSingle();

    return (block?.outputPreview as Dataset) ?? null;
  }

  async getIncomingDataForTab(
    blockId: string
  ): Promise<Array<{ id: string; data: Dataset }>> {
    // Get the block to find its parent and order
    const { data: block } = await supabase
      .from("desk_block")
      .select("parentId, blockOrder")
      .eq("id", blockId)
      .maybeSingle();

    if (!block?.parentId) return [];

    // Get sibling tabs with lower order (previous tabs)
    const { data: siblings } = await supabase
      .from("desk_block")
      .select("id, outputPreview, name")
      .eq("parentId", block.parentId)
      .lt("blockOrder", block.blockOrder)
      .order("blockOrder", { ascending: false })
      .limit(1);

    if (!siblings || siblings.length === 0) return [];

    return siblings
      .filter((s: any) => s.outputPreview)
      .map((s: any) => ({
        id: s.id,
        data: s.outputPreview as Dataset,
      }));
  }

  async setBlockOutput(blockId: string, output: any): Promise<void> {
    await supabase
      .from("desk_block")
      .update({ outputPreview: output, updatedAt: new Date().toISOString() })
      .eq("id", blockId);
  }

  async setMasterSheetPreview(data: Dataset): Promise<void> {
    // This is handled via WebSocket event to frontend
    // The server emits the event, frontend updates its store
  }

  async setMergedPreview(data: any): Promise<void> {
    // This is handled via WebSocket event to frontend
  }

  async pushMasterSheetData(
    sheetName: string,
    data: Dataset,
    metadata: Record<string, any>
  ): Promise<void> {
    // Upsert master sheet in DB
    const { data: existing } = await supabase
      .from("master_sheet")
      .select("id")
      .eq("name", sheetName)
      .eq("dashid", this.dashid)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("master_sheet")
        .update({
          data,
          metadata: {
            ...metadata,
            rowCount: data.data.length,
            colCount: data.columns.length,
            updatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("master_sheet").insert({
        name: sheetName,
        dashid: this.dashid,
        userId: this.userId,
        data,
        metadata: {
          ...metadata,
          rowCount: data.data.length,
          colCount: data.columns.length,
        },
      });
    }
  }
}
