// ═══════════════════════════════════════════════════════════
// Subflow Node Executor
// Handles: SubflowNode (executes a published inner workflow)
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor, ExecutionContext, Dataset } from "@repo/workflow-engine/types";

const EMPTY: Dataset = { columns: [], data: [] };

export class SubflowExecutor implements INodeExecutor {
  type = "SubflowNode";

  /**
   * Executes a published workflow's inner graph.
   * Uses a lightweight inner runner (same topological approach)
   * without WebSocket events or persistence.
   */
  async execute(ctx: ExecutionContext): Promise<any> {
    const innerDef = ctx.nodeData?.publishedDefinition;
    const innerInputSchema = ctx.nodeData?.inputSchema ?? [];
    const innerOutputSchema = ctx.nodeData?.outputSchema ?? [];

    if (!innerDef?.nodes || !innerDef?.edges) {
      return ctx.inputs.get("default") ?? ctx.inputs.values().next().value ?? EMPTY;
    }

    // 1. Build input data map for each boundary input node
    const inputDataMap = new Map<string, any>();
    for (const schema of innerInputSchema) {
      const handleId = `subflow-in-${schema.nodeId}`;
      const data = ctx.inputs.get(handleId) ?? EMPTY;
      inputDataMap.set(schema.nodeId, data);
    }

    // 2. Run inner graph with lightweight topological execution
    const innerResult = await this.executeInnerGraph(
      innerDef.nodes,
      innerDef.edges,
      inputDataMap
    );

    // 3. Extract outputs
    if (innerOutputSchema.length > 0) {
      if (innerOutputSchema.length === 1) {
        return innerResult.get(innerOutputSchema[0].nodeId) ?? EMPTY;
      }
      // Multiple outputs — store each under its handle
      for (const outSchema of innerOutputSchema) {
        const outData = innerResult.get(outSchema.nodeId) ?? EMPTY;
        ctx.runtimeData.set(
          `${ctx.nodeId}__subflow-out-${outSchema.nodeId}`,
          outData
        );
      }
      return innerResult.get(innerOutputSchema[0].nodeId) ?? EMPTY;
    }

    return undefined;
  }

  /**
   * Lightweight inner workflow execution — no WebSocket, no persistence.
   * Uses the same shared functions for transforms.
   */
  private async executeInnerGraph(
    nodes: any[],
    edges: any[],
    inputDataMap: Map<string, any>
  ): Promise<Map<string, any>> {
    const {
      applyFilter, applyMathColumn, applyMathRow, applySort,
      applyAggregate, applyFormula, applyMerge, applyUnionMerge,
      applyAppend, applyRenameColumn, applySelectColumns,
      applyColumnMap, applyDropColumns, applyCountInRow,
      applyIfElse, applySwitchCase, applySubjectBlock,
      applyBlockConcat, applyDynamicBlockConcat,
      toCamelCase, toLowercase,
    } = await import("@repo/workflow-engine/functions");

    const runtimeData = new Map<string, any>();
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((n: any) => { graph.set(n.id, []); inDegree.set(n.id, 0); });
    edges.forEach((e: any) => {
      graph.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const queue = nodes.filter((n: any) => inDegree.get(n.id) === 0).map((n: any) => n.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = nodes.find((n: any) => n.id === currentId);
      if (!node) continue;

      const incomingEdges = edges.filter((e: any) => e.target === currentId);
      let inputValue: any = null;
      if (incomingEdges.length === 1) {
        const e = incomingEdges[0];
        inputValue = runtimeData.get(`${e.source}__${e.sourceHandle}`) ?? runtimeData.get(e.source) ?? null;
      }

      let outputValue: any = inputValue;
      const nd = node.data || {};

      try {
        switch (node.type) {
          case "WorkflowInputNode":
            outputValue = inputDataMap.get(currentId) ?? EMPTY;
            break;
          case "WorkflowOutputNode":
            outputValue = inputValue ?? EMPTY;
            break;
          case "TextInputNode":
            outputValue = nd?.text ?? "";
            break;
          case "InputFileNode": case "SpreadsheetInputNode": case "DataLibraryInputNode":
            outputValue = nd?.text?.columns ? nd.text : EMPTY;
            break;
          case "FilterNode":
            outputValue = applyFilter(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "MathColumnNode":
            outputValue = applyMathColumn(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "MathRowNode":
            outputValue = applyMathRow(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "SortNode":
            outputValue = applySort(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "AggregateNode":
            outputValue = applyAggregate(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "CountNode":
            outputValue = applyCountInRow(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "FormulaNode":
            outputValue = applyFormula(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "RenameColumnNode":
            outputValue = applyRenameColumn(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "SelectColumnsNode":
            outputValue = applySelectColumns(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "ColumnMapNode":
            outputValue = applyColumnMap(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "DropColumnNode":
            outputValue = applyDropColumns(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "CamelCaseNode":
            outputValue = typeof inputValue === "string" ? toCamelCase(inputValue) : toCamelCase(String(JSON.stringify(inputValue) ?? ""));
            break;
          case "LowercaseNode":
            outputValue = typeof inputValue === "string" ? toLowercase(inputValue) : toLowercase(String(JSON.stringify(inputValue) ?? ""));
            break;
          case "IfElseNode":
            outputValue = applyIfElse(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "SwitchCaseNode":
            outputValue = applySwitchCase(inputValue ?? EMPTY, nd?.config ?? {});
            break;
          case "MergeNode": {
            const l = incomingEdges.find((e: any) => e.targetHandle === "left");
            const r = incomingEdges.find((e: any) => e.targetHandle === "right");
            const ld = l ? runtimeData.get(l.source) ?? EMPTY : EMPTY;
            const rd = r ? runtimeData.get(r.source) ?? EMPTY : EMPTY;
            outputValue = applyMerge(ld, rd, nd?.config ?? {});
            break;
          }
          case "UnionMergeNode": {
            const l = incomingEdges.find((e: any) => e.targetHandle === "left");
            const r = incomingEdges.find((e: any) => e.targetHandle === "right");
            const ld = l ? (runtimeData.get(`${l.source}__${l.sourceHandle}`) ?? runtimeData.get(l.source) ?? EMPTY) : EMPTY;
            const rd = r ? (runtimeData.get(`${r.source}__${r.sourceHandle}`) ?? runtimeData.get(r.source) ?? EMPTY) : EMPTY;
            outputValue = applyUnionMerge(ld, rd, nd?.config ?? {});
            break;
          }
          case "AppendNode": {
            const l = incomingEdges.find((e: any) => e.targetHandle === "left");
            const r = incomingEdges.find((e: any) => e.targetHandle === "right");
            const td = l ? runtimeData.get(l.source) ?? EMPTY : EMPTY;
            const bd = r ? runtimeData.get(r.source) ?? EMPTY : EMPTY;
            outputValue = applyAppend(td, bd, nd?.config ?? {});
            break;
          }
          case "SubjectBlockNode": {
            const codeE = incomingEdges.find((e: any) => e.targetHandle === "subject-code");
            const typeE = incomingEdges.find((e: any) => e.targetHandle === "section-type");
            const keyE = incomingEdges.find((e: any) => e.targetHandle === "key-col-name");
            const dataE = incomingEdges.find((e: any) => e.targetHandle === "data");
            const sc = codeE ? String(runtimeData.get(codeE.source) ?? "") : nd?.config?.subjectCode ?? "";
            const st = typeE ? String(runtimeData.get(typeE.source) ?? "") : nd?.config?.sectionType ?? "";
            const kc = keyE ? String(runtimeData.get(keyE.source) ?? "") : nd?.config?.keyColumnName ?? "";
            const bd2: Dataset = dataE ? runtimeData.get(dataE.source) ?? EMPTY : EMPTY;
            outputValue = applySubjectBlock(bd2, sc, st, kc);
            break;
          }
          case "BlockConcatNode": {
            const baseE = incomingEdges.find((e: any) => e.targetHandle === "base");
            const baseD = baseE ? runtimeData.get(baseE.source) ?? EMPTY : EMPTY;
            const bks: Dataset[] = [];
            for (let i = 0; i < 8; i++) {
              const be = incomingEdges.find((e: any) => e.targetHandle === `block-${i}`);
              if (be) { const d = runtimeData.get(be.source); if (d?.columns) bks.push(d); }
            }
            outputValue = applyBlockConcat(baseD, bks, nd?.config?.keyColumn ?? baseD.columns[0] ?? "");
            break;
          }
          default:
            outputValue = inputValue;
            break;
        }
      } catch {
        outputValue = inputValue;
      }

      // Store output
      if (node.type === "IfElseNode" || node.type === "SwitchCaseNode") {
        if (outputValue && typeof outputValue === "object") {
          for (const hId in outputValue) {
            runtimeData.set(`${currentId}__${hId}`, outputValue[hId]);
          }
        }
      } else {
        runtimeData.set(currentId, outputValue);
        runtimeData.set(`${currentId}__out`, outputValue);
      }

      graph.get(currentId)?.forEach((childId) => {
        inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
        if (inDegree.get(childId) === 0) queue.push(childId);
      });
    }

    return runtimeData;
  }
}

export function createSubflowExecutors(): INodeExecutor[] {
  return [new SubflowExecutor()];
}
