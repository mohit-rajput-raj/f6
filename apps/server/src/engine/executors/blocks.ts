// ═══════════════════════════════════════════════════════════
// Block Node Executors
// Handles: SubjectBlock, BlockConcat, DynamicBlockConcat,
//          BlockExtractor
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset, DeskInputResolver } from "@repo/workflow-engine/types";
import {
  applySubjectBlock,
  applyBlockConcat,
  applyDynamicBlockConcat,
} from "@repo/workflow-engine/functions";

const EMPTY: Dataset = { columns: [], data: [] };

// Helper to resolve text from input handle (could be string, or { text: string })
const resolveText = (raw: any): string => {
  if (typeof raw === "string") return raw;
  if (raw?.text) return String(raw.text);
  if (raw?.value) return String(raw.value);
  return "";
};

// ── SubjectBlockNode ────────────────────────────────────────
export class SubjectBlockExecutor implements INodeExecutor {
  type = "SubjectBlockNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const subjectCode = resolveText(ctx.inputs.get("subject-code")) || ctx.nodeData?.config?.subjectCode || "";
    const sectionType = resolveText(ctx.inputs.get("section-type")) || ctx.nodeData?.config?.sectionType || "";
    const keyColName = resolveText(ctx.inputs.get("key-col-name")) || ctx.nodeData?.config?.keyColumnName || "";
    const blockData: Dataset = ctx.inputs.get("data") ?? EMPTY;

    ctx.emitNodeMeta({
      resolvedSubjectCode: subjectCode,
      resolvedSectionType: sectionType,
      resolvedKeyColumn: keyColName,
      inputColumns: blockData.columns,
    });

    return applySubjectBlock(blockData, subjectCode, sectionType, keyColName);
  }
}

// ── BlockConcatNode ─────────────────────────────────────────
export class BlockConcatExecutor implements INodeExecutor {
  type = "BlockConcatNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const sheetNameRaw = resolveText(ctx.inputs.get("sheet-name"));
    const masterSheetName = sheetNameRaw || ctx.nodeData?.config?.sheetName || "Master Sheet";

    const baseData: Dataset = ctx.inputs.get("base") ?? EMPTY;

    // Collect block inputs (block-0 through block-7)
    const blocks: Dataset[] = [];
    for (let i = 0; i < 8; i++) {
      const blockData = ctx.inputs.get(`block-${i}`);
      if (blockData && blockData.columns) blocks.push(blockData);
    }

    const keyCol = ctx.nodeData?.config?.keyColumn ?? baseData.columns[0] ?? "";
    const outputValue = applyBlockConcat(baseData, blocks, keyCol);

    // Extract block codenames from output columns
    const blockCodenames: string[] = [];
    if (outputValue?.columns) {
      const baseCols = baseData.columns || [];
      for (const col of outputValue.columns) {
        if (baseCols.includes(col)) continue;
        const parts = col.split(":");
        if (parts.length >= 2) {
          const code = `${parts[0]}:${parts[1]}`;
          if (!blockCodenames.includes(code)) blockCodenames.push(code);
        }
      }
    }

    // Push to master sheet store via resolver
    if (outputValue?.columns?.length > 0) {
      await this.deskResolver.pushMasterSheetData(masterSheetName, outputValue, {
        blockCodenames,
        pushedBy: "workflow",
        pushedByName: "Workflow Execution",
        pushedAt: Date.now(),
        sourceNodeId: ctx.nodeId,
      });
    }

    ctx.emitNodeMeta({
      baseColumns: baseData.columns,
      connectedBlocks: blocks.length,
      resolvedSheetName: sheetNameRaw || undefined,
    });

    return outputValue;
  }
}

// ── DynamicBlockConcatNode ──────────────────────────────────
export class DynamicBlockConcatExecutor implements INodeExecutor {
  type = "DynamicBlockConcatNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const sheetNameRaw = resolveText(ctx.inputs.get("sheet-name"));
    const masterSheetName = sheetNameRaw || ctx.nodeData?.config?.sheetName || "Master Sheet";

    const existingMsData: Dataset = ctx.inputs.get("mastersheet") ?? EMPTY;
    const resolvedCode = resolveText(ctx.inputs.get("code")) || ctx.nodeData?.config?.blockCode || "";
    const resolvedType = resolveText(ctx.inputs.get("type")) || ctx.nodeData?.config?.sectionType || "";
    const incomingBlockData: Dataset | null = ctx.inputs.get("block") ?? null;

    // Determine key column
    const resolvedKeyFromPort = resolveText(ctx.inputs.get("key"));
    const keyCol = resolvedKeyFromPort
      || ctx.nodeData?.config?.keyColumn
      || (existingMsData.columns?.length > 0 ? existingMsData.columns.find((c: string) => !c.includes(":")) : "")
      || (incomingBlockData?.columns?.length ? incomingBlockData.columns.find((c: string) => !c.includes(":")) : "")
      || "";

    const baseCols = existingMsData.columns?.length > 0
      ? existingMsData.columns.filter((c: string) => !c.includes(":"))
      : [keyCol, "Name", "Student_Name", "Student Name", "Roll_No"];

    // Format block columns with prefix
    let formattedBlockData: Dataset | null = null;
    const prefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : "";

    if (incomingBlockData?.columns && prefix) {
      const formattedColumns = incomingBlockData.columns.map((col: string) => {
        if (col === keyCol) return col;
        if (baseCols.includes(col)) return col;
        if (col.startsWith(`${prefix}:`)) return col;
        const parts = col.split(":");
        if (parts.length >= 3) return `${prefix}:${parts.slice(2).join(":")}`;
        return `${prefix}:${col}`;
      });
      formattedBlockData = { columns: formattedColumns, data: incomingBlockData.data };
    } else {
      formattedBlockData = incomingBlockData;
    }

    const dbcBlocks = formattedBlockData ? [formattedBlockData] : [];
    const outputValue = applyDynamicBlockConcat(existingMsData, dbcBlocks, keyCol);

    // Check if replacing existing block
    const existingCodes: string[] = [];
    if (existingMsData?.columns) {
      for (const col of existingMsData.columns) {
        const parts = col.split(":");
        if (parts.length >= 2) {
          const code = `${parts[0]}:${parts[1]}`;
          if (!existingCodes.includes(code)) existingCodes.push(code);
        }
      }
    }
    const isReplacing = prefix ? existingCodes.includes(prefix) : false;

    // Push to master sheet
    if (outputValue?.columns?.length > 0) {
      await this.deskResolver.pushMasterSheetData(masterSheetName, outputValue, {
        blockCodenames: prefix ? [prefix] : [],
        pushedBy: "workflow",
        pushedByName: "Workflow Execution",
        pushedAt: Date.now(),
        sourceNodeId: ctx.nodeId,
      });
    }

    ctx.emitNodeMeta({
      mastersheetColumns: existingMsData.columns ?? [],
      blockColumns: incomingBlockData?.columns ?? [],
      resolvedSheetName: sheetNameRaw || undefined,
      resolvedKeyColumn: keyCol || undefined,
      resolvedBlockCode: resolvedCode || undefined,
      resolvedSectionType: resolvedType || undefined,
      isReplacing,
      hasMastersheet: existingMsData.columns?.length > 0,
    });

    return outputValue;
  }
}

// ── BlockExtractorNode ──────────────────────────────────────
export class BlockExtractorExecutor implements INodeExecutor {
  type = "BlockExtractorNode";
  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const inputData: Dataset = ctx.inputs.get("data")
      ?? ctx.inputs.get("default")
      ?? ctx.inputs.values().next().value
      ?? EMPTY;

    const codeRaw = resolveText(ctx.inputs.get("code")) || ctx.nodeData?.config?.blockCode || "";
    const typeRaw = resolveText(ctx.inputs.get("type")) || ctx.nodeData?.config?.sectionType || "";
    const code = codeRaw.trim();
    const type = typeRaw.trim();
    const prefix = code && type ? `${code}:${type}:` : "";
    const prefixLower = prefix.toLowerCase();

    if (!prefix || !inputData?.columns?.length) {
      return { columns: [], data: [] };
    }

    const baseColumns = inputData.columns.filter((c: string) => !c.includes(":"));
    const matchingCols = inputData.columns.filter((c: string) => c.toLowerCase().startsWith(prefixLower));
    const strippedCols = matchingCols.map((c: string) => {
      return c.toLowerCase().startsWith(prefixLower) ? c.slice(prefix.length) : c;
    });

    const extractedColumns = [...baseColumns, ...strippedCols];
    const baseIndices = baseColumns.map((c: string) => inputData.columns.indexOf(c));
    const matchIndices = matchingCols.map((c: string) => inputData.columns.indexOf(c));
    const allIndices = [...baseIndices, ...matchIndices];

    const extractedData = inputData.data.map((row: any[]) =>
      allIndices.map((idx) => row[idx] ?? null)
    );

    ctx.emitNodeMeta({
      resolvedBlockCode: code || undefined,
      resolvedSectionType: type || undefined,
      extractedColumns: strippedCols,
      baseColumns,
      totalInputCols: inputData.columns.length,
    });

    return { columns: extractedColumns, data: extractedData };
  }
}

export function createBlockExecutors(deskResolver: DeskInputResolver): INodeExecutor[] {
  return [
    new SubjectBlockExecutor(),
    new BlockConcatExecutor(deskResolver),
    new DynamicBlockConcatExecutor(deskResolver),
    new BlockExtractorExecutor(),
  ];
}
