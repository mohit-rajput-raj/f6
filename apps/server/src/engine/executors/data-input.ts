// ═══════════════════════════════════════════════════════════
// Data Input Node Executors
// Handles: TextInput, InputFile, Spreadsheet, DataLibrary,
//          TabInput, WorkflowInput, WorkflowOutput
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset, DeskInputResolver } from "@repo/workflow-engine/types";

// ── TextInputNode ───────────────────────────────────────────
export class TextInputExecutor implements INodeExecutor {
  type = "TextInputNode";
  async execute(ctx: ExecutionContext): Promise<any> {
    return ctx.nodeData?.text ?? "";
  }
}

// ── InputFileNode / SpreadsheetInputNode / DataLibraryInputNode ──
class FileInputBase implements INodeExecutor {
  type = "InputFileNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const fileData = ctx.nodeData?.text;
    if (fileData && typeof fileData === "object" && fileData.columns) {
      return fileData as Dataset;
    }
    return { columns: [], data: [] };
  }
}

export class InputFileExecutor extends FileInputBase {
  type = "InputFileNode";
}

export class SpreadsheetInputExecutor extends FileInputBase {
  type = "SpreadsheetInputNode";
}

export class DataLibraryInputExecutor extends FileInputBase {
  type = "DataLibraryInputNode";
}

// ── TabInputNode ────────────────────────────────────────────
export class TabInputExecutor implements INodeExecutor {
  type = "TabInputNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    let fileData = ctx.nodeData?.text;

    // If no data embedded, try loading from desk (incoming tab data)
    if (!fileData || !fileData.columns || fileData.columns.length === 0) {
      const deskBlockId = ctx.nodeData?.deskBlockId;
      if (deskBlockId) {
        const incoming = await this.deskResolver.getIncomingDataForTab(deskBlockId);
        const selectedId = ctx.nodeData?.selectedDatasetId;
        const matched = selectedId
          ? incoming.find((i) => i.id === selectedId)
          : incoming[0];
        if (matched?.data) {
          fileData = matched.data;
        }
      }
    }

    if (fileData && typeof fileData === "object" && fileData.columns) {
      return fileData as Dataset;
    }
    return { columns: [], data: [] };
  }
}

// ── WorkflowInputNode (subflow boundary) ────────────────────
export class WorkflowInputExecutor implements INodeExecutor {
  type = "WorkflowInputNode";
  async execute(ctx: ExecutionContext): Promise<any> {
    // During normal execution: pass through incoming data
    // During subflow execution: data is injected by SubflowNode handler
    const defaultInput = ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    return defaultInput ?? { columns: [], data: [] };
  }
}

// ── WorkflowOutputNode (subflow boundary) ───────────────────
export class WorkflowOutputExecutor implements INodeExecutor {
  type = "WorkflowOutputNode";
  async execute(ctx: ExecutionContext): Promise<any> {
    const defaultInput = ctx.inputs.get("default") ?? ctx.inputs.values().next().value;
    return defaultInput ?? { columns: [], data: [] };
  }
}

// ── MasterSheetLibraryNode ──────────────────────────────────
export class MasterSheetLibraryExecutor implements INodeExecutor {
  type = "MasterSheetLibraryNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    // Check if a sheet name is resolved via port
    const resolvedName = ctx.inputs.get("sheet-name");
    if (resolvedName && typeof resolvedName === "string") {
      // Try loading from DB
      // For now, fallback to node's embedded data
      ctx.emitNodeMeta({ resolvedSheetName: resolvedName });
    }

    const fileData = ctx.nodeData?.text;
    if (fileData && typeof fileData === "object" && fileData.columns) {
      return fileData as Dataset;
    }
    return { columns: [], data: [] };
  }
}

export function createDataInputExecutors(deskResolver: DeskInputResolver): INodeExecutor[] {
  return [
    new TextInputExecutor(),
    new InputFileExecutor(),
    new SpreadsheetInputExecutor(),
    new DataLibraryInputExecutor(),
    new TabInputExecutor(deskResolver),
    new WorkflowInputExecutor(),
    new WorkflowOutputExecutor(),
    new MasterSheetLibraryExecutor(),
  ];
}
