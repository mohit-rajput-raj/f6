// ═══════════════════════════════════════════════════════════
// Logic Node Executors
// Handles: IfElse, SwitchCase, TrueFalse
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset, DeskInputResolver } from "@repo/workflow-engine/types";
import { applyIfElse, applySwitchCase } from "@repo/workflow-engine/functions";

// ── IfElseNode ──────────────────────────────────────────────
export class IfElseExecutor implements INodeExecutor {
  type = "IfElseNode";
  async execute(ctx: ExecutionContext): Promise<Record<string, Dataset>> {
    const input = ctx.inputs.get("default") ?? ctx.inputs.values().next().value ?? { columns: [], data: [] };
    return applyIfElse(input, ctx.nodeData?.config ?? {});
  }
}

// ── SwitchCaseNode ──────────────────────────────────────────
export class SwitchCaseExecutor implements INodeExecutor {
  type = "SwitchCaseNode";
  async execute(ctx: ExecutionContext): Promise<Record<string, Dataset>> {
    const input = ctx.inputs.get("default") ?? ctx.inputs.values().next().value ?? { columns: [], data: [] };
    return applySwitchCase(input, ctx.nodeData?.config ?? {});
  }
}

// ── TrueFalseNode (reads checkbox state from desk block) ────
export class TrueFalseExecutor implements INodeExecutor {
  type = "TrueFalseNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<boolean> {
    const deskBlockId = ctx.nodeData?.deskBlockId;
    const checkboxId = ctx.nodeData?.checkboxId || ctx.nodeId;

    if (deskBlockId) {
      return this.deskResolver.getCheckboxValue(deskBlockId, checkboxId);
    }
    return false;
  }
}

export function createLogicExecutors(deskResolver: DeskInputResolver): INodeExecutor[] {
  return [
    new IfElseExecutor(),
    new SwitchCaseExecutor(),
    new TrueFalseExecutor(deskResolver),
  ];
}
