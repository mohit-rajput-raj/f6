// ═══════════════════════════════════════════════════════════
// Logic Node Executors
// Handles: IfElse, SwitchCase
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

export function createLogicExecutors(deskResolver?: DeskInputResolver): INodeExecutor[] {
  return [
    new IfElseExecutor(),
    new SwitchCaseExecutor(),
  ];
}
