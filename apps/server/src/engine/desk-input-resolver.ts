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
    // Check preloaded first
    const preloaded = this.preloaded?.textInputs?.find(
      (t) => t.id === inputId
    );
    if (preloaded) return preloaded.value;

    // Fallback to DB
    const { data: block } = await supabase
      .from("desk_block")
      .select("textInputs")
      .eq("id", blockId)
      .maybeSingle();

    if (!block?.textInputs) return "";
    const input = (block.textInputs as any[]).find(
      (t: any) => t.id === inputId
    );
    return input?.value ?? "";
  }

  async getSheetData(blockId: string, sheetId: string): Promise<Dataset> {
    // Check preloaded first
    const preloaded = this.preloaded?.sheets?.find((s) => s.id === sheetId);
    if (preloaded) return preloaded.data;

    // Fallback to DB
    const { data: block } = await supabase
      .from("desk_block")
      .select("sheets")
      .eq("id", blockId)
      .maybeSingle();

    if (!block?.sheets) return { columns: [], data: [] };
    const sheet = (block.sheets as any[]).find((s: any) => s.id === sheetId);
    return sheet?.data ?? { columns: [], data: [] };
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
