// ═══════════════════════════════════════════════════════════
// Merge Node Executors
// Handles: Merge, UnionMerge, UpdateMerge, SheetMerge, Append
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset } from "@repo/workflow-engine/types";
import {
  applyMerge,
  applyUnionMerge,
  applyUpdateMerge,
  applySheetMerge,
  applyAppend,
} from "@repo/workflow-engine/functions";

const EMPTY: Dataset = { columns: [], data: [] };

// Helper: resolve left/right datasets from named handles
const getLeftRight = (ctx: ExecutionContext): { left: Dataset; right: Dataset } => {
  const left = ctx.inputs.get("left") ?? EMPTY;
  const right = ctx.inputs.get("right") ?? EMPTY;
  return { left, right };
};

// ── MergeNode ───────────────────────────────────────────────
export class MergeExecutor implements INodeExecutor {
  type = "MergeNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const { left, right } = getLeftRight(ctx);
    ctx.emitNodeMeta({ leftColumns: left.columns, rightColumns: right.columns });
    return applyMerge(left, right, ctx.nodeData?.config ?? {});
  }
}

// ── UnionMergeNode ──────────────────────────────────────────
export class UnionMergeExecutor implements INodeExecutor {
  type = "UnionMergeNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const { left, right } = getLeftRight(ctx);
    ctx.emitNodeMeta({ leftColumns: left.columns, rightColumns: right.columns });
    return applyUnionMerge(left, right, ctx.nodeData?.config ?? {});
  }
}

// ── UpdateMergeNode ─────────────────────────────────────────
export class UpdateMergeExecutor implements INodeExecutor {
  type = "UpdateMergeNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const { left, right } = getLeftRight(ctx);
    ctx.emitNodeMeta({ leftColumns: left.columns, rightColumns: right.columns });
    return applyUpdateMerge(left, right, ctx.nodeData?.config ?? {});
  }
}

// ── SheetMergeNode ──────────────────────────────────────────
export class SheetMergeExecutor implements INodeExecutor {
  type = "SheetMergeNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const { left, right } = getLeftRight(ctx);
    ctx.emitNodeMeta({ leftColumns: left.columns, rightColumns: right.columns });
    return applySheetMerge(left, right, ctx.nodeData?.config ?? {});
  }
}

// ── AppendNode ──────────────────────────────────────────────
export class AppendExecutor implements INodeExecutor {
  type = "AppendNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const { left, right } = getLeftRight(ctx);
    return applyAppend(left, right, ctx.nodeData?.config ?? {});
  }
}

export function createMergeExecutors(): INodeExecutor[] {
  return [
    new MergeExecutor(),
    new UnionMergeExecutor(),
    new UpdateMergeExecutor(),
    new SheetMergeExecutor(),
    new AppendExecutor(),
  ];
}
