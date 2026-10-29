// ═══════════════════════════════════════════════════════════
// Desk Node Executors
// Handles: DeskTextInput, DeskSheet, OutputPreview, BlockOutputSender
// These nodes bridge the Desk UI ↔ Workflow Engine
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset, DeskInputResolver, HumanInputRequest } from "@repo/workflow-engine/types";

// Custom error class for human-in-the-loop nodes
export class HumanInputRequired extends Error {
  public request: HumanInputRequest;
  constructor(request: HumanInputRequest) {
    super(`Human input required at node ${request.nodeId}`);
    this.name = "HumanInputRequired";
    this.request = request;
  }
}

// ── DeskTextInputNode ───────────────────────────────────────
export class DeskTextInputExecutor implements INodeExecutor {
  type = "DeskTextInputNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<string> {
    const deskBlockId = ctx.nodeData?.deskBlockId || ctx.blockId;
    const deskInputId = ctx.nodeData?.deskInputId || ctx.nodeId;

    if (deskBlockId && deskInputId) {
      const val = await this.deskResolver.getTextInput(deskBlockId, deskInputId);
      if (val && val.trim()) return val.trim();
    }

    const fallback =
      ctx.nodeData?.value ||
      ctx.nodeData?.text ||
      ctx.nodeData?.placeholder ||
      "";
    return typeof fallback === "string" ? fallback.trim() : "";
  }
}

// ── DeskSheetNode ───────────────────────────────────────────
export class DeskSheetExecutor implements INodeExecutor {
  type = "DeskSheetNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const deskBlockId = ctx.nodeData?.deskBlockId || ctx.blockId;
    const deskSheetId = ctx.nodeData?.deskSheetId || ctx.nodeId;

    if (deskBlockId) {
      const data = await this.deskResolver.getSheetData(deskBlockId, deskSheetId || "");
      if (data && Array.isArray(data.columns) && data.columns.length > 0) return data;
    }

    const fileData = ctx.nodeData?.text;
    if (fileData && typeof fileData === "object" && Array.isArray(fileData.columns) && fileData.columns.length > 0) {
      return fileData as Dataset;
    }
    return { columns: [], data: [] };
  }
}

// ── OutputPreviewNode ───────────────────────────────────────
export class OutputPreviewExecutor implements INodeExecutor {
  type = "OutputPreviewNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const input = ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    const ds: Dataset = input ?? { columns: [], data: [] };
    const previewEnabled = ctx.nodeData?.previewEnabled !== false;
    const deskBlockId = ctx.nodeData?.deskBlockId;

    // Save output to desk block
    if (deskBlockId) {
      if (previewEnabled && ds.columns?.length > 0) {
        await this.deskResolver.setBlockOutput(deskBlockId, ds);
      } else {
        await this.deskResolver.setBlockOutput(deskBlockId, null);
      }
    }

    // Handle passToNextTab
    const passToNextTab = Boolean(ctx.nodeData?.passToNextTab);
    if (passToNextTab && ctx.nodeData?.targetTabName && ds.columns?.length > 0) {
      // This will be handled by emitting a WebSocket event
      ctx.emitNodeMeta({
        passToNextTab: true,
        targetTabName: ctx.nodeData.targetTabName,
        outputData: ds,
      });
    }

    return ds;
  }
}

// ── BlockOutputSenderNode ───────────────────────────────────
export class BlockOutputSenderExecutor implements INodeExecutor {
  type = "BlockOutputSenderNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const input = ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    const ds: Dataset = input ?? { columns: [], data: [] };

    if (ds.columns?.length > 0) {
      const deskBlockId = ctx.nodeData?.deskBlockId;
      if (deskBlockId) {
        await this.deskResolver.setBlockOutput(deskBlockId, ds);
      }
    }

    return ds;
  }
}

export function createDeskExecutors(deskResolver: DeskInputResolver): INodeExecutor[] {
  return [
    new DeskTextInputExecutor(deskResolver),
    new DeskSheetExecutor(deskResolver),
    new OutputPreviewExecutor(deskResolver),
    new BlockOutputSenderExecutor(deskResolver),
  ];
}
