// ═══════════════════════════════════════════════════════════
// Transform Node Executors
// Handles: Filter, MathColumn, MathRow, Sort, Aggregate,
//          Count, Formula, RenameColumn, SelectColumns,
//          ColumnMap, DropColumn, CamelCase, Lowercase,
//          SheetEditor
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset } from "@repo/workflow-engine/types";
import {
  applyFilter,
  applyMathColumn,
  applyMathRow,
  applySort,
  applyAggregate,
  applyFormula,
  applyRenameColumn,
  applySelectColumns,
  applyColumnMap,
  applyCountInRow,
  applyDropColumns,
  toCamelCase,
  toLowercase,
} from "@repo/workflow-engine/functions";

// Helper: get default input from context
const getInput = (ctx: ExecutionContext): any => {
  return ctx.inputs.get("default") ?? ctx.inputs.values().next().value ?? null;
};

const getDataset = (ctx: ExecutionContext): Dataset => {
  const input = getInput(ctx);
  return input ?? { columns: [], data: [] };
};

// ── FilterNode ──────────────────────────────────────────────
export class FilterExecutor implements INodeExecutor {
  type = "FilterNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyFilter(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── MathColumnNode ──────────────────────────────────────────
export class MathColumnExecutor implements INodeExecutor {
  type = "MathColumnNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyMathColumn(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── MathRowNode ─────────────────────────────────────────────
export class MathRowExecutor implements INodeExecutor {
  type = "MathRowNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyMathRow(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── SortNode ────────────────────────────────────────────────
export class SortExecutor implements INodeExecutor {
  type = "SortNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applySort(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── AggregateNode ───────────────────────────────────────────
export class AggregateExecutor implements INodeExecutor {
  type = "AggregateNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyAggregate(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── CountNode ───────────────────────────────────────────────
export class CountExecutor implements INodeExecutor {
  type = "CountNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyCountInRow(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── FormulaNode ─────────────────────────────────────────────
export class FormulaExecutor implements INodeExecutor {
  type = "FormulaNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const ds = getDataset(ctx);
    const config = ctx.nodeData?.config ?? {};
    // Use client-side formula (server-side python endpoint can be added later)
    return applyFormula(ds, config);
  }
}

// ── RenameColumnNode ────────────────────────────────────────
export class RenameColumnExecutor implements INodeExecutor {
  type = "RenameColumnNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyRenameColumn(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── SelectColumnsNode ───────────────────────────────────────
export class SelectColumnsExecutor implements INodeExecutor {
  type = "SelectColumnsNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applySelectColumns(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── ColumnMapNode ───────────────────────────────────────────
export class ColumnMapExecutor implements INodeExecutor {
  type = "ColumnMapNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyColumnMap(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── DropColumnNode ──────────────────────────────────────────
export class DropColumnExecutor implements INodeExecutor {
  type = "DropColumnNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return applyDropColumns(getDataset(ctx), ctx.nodeData?.config ?? {});
  }
}

// ── CamelCaseNode ───────────────────────────────────────────
export class CamelCaseExecutor implements INodeExecutor {
  type = "CamelCaseNode";
  async execute(ctx: ExecutionContext): Promise<string> {
    const input = getInput(ctx);
    if (typeof input === "string") return toCamelCase(input);
    return toCamelCase(String(JSON.stringify(input) ?? ""));
  }
}

// ── LowercaseNode ───────────────────────────────────────────
export class LowercaseExecutor implements INodeExecutor {
  type = "LowercaseNode";
  async execute(ctx: ExecutionContext): Promise<string> {
    const input = getInput(ctx);
    if (typeof input === "string") return toLowercase(input);
    return toLowercase(String(JSON.stringify(input) ?? ""));
  }
}

// ── SheetEditorNode ─────────────────────────────────────────
export class SheetEditorExecutor implements INodeExecutor {
  type = "SheetEditorNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    return getDataset(ctx);
  }
}

export function createTransformExecutors(): INodeExecutor[] {
  return [
    new FilterExecutor(),
    new MathColumnExecutor(),
    new MathRowExecutor(),
    new SortExecutor(),
    new AggregateExecutor(),
    new CountExecutor(),
    new FormulaExecutor(),
    new RenameColumnExecutor(),
    new SelectColumnsExecutor(),
    new ColumnMapExecutor(),
    new DropColumnExecutor(),
    new CamelCaseExecutor(),
    new LowercaseExecutor(),
    new SheetEditorExecutor(),
  ];
}
