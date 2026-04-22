import type React from "react";
import type { Edge } from "@xyflow/react";
import type { EditorNodeType } from "@/lib/types";
import {
  applyFilter,
  applyMathColumn,
  applyMathRow,
  applySort,
  applyAggregate,
  applyFormula,
  applyMerge,
  applyUpdateMerge,
  applySheetMerge,
  applyAppend,
  applyColumnMap,
  applyRenameColumn,
  applySelectColumns,
  applyCountInRow,
  toCamelCase,
  toLowercase,
  applyUnionMerge,
  applyDropColumns,
  applyIfElse,
  applySwitchCase,
  applySubjectBlock,
  applyBlockConcat,
  Dataset,
} from "./functions";
import api from "@/lib/axios";

// ────────────────────────────────────────────────
// Execution engine — topological sort + reactive propagation
// ────────────────────────────────────────────────

export const executeWorkflow = async (
  nodes: EditorNodeType[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>
) => {
  // 1. Clear previous results & propagate input columns
  setNodes((nds) =>
    nds.map((n) => ({
      ...n,
      data: { ...n.data, result: undefined, rowCount: undefined, error: undefined },
    }))
  );

  // 2. Build graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    graph.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // 3. Start with source nodes (no incoming)
  const queue = nodes
    .filter((n) => inDegree.get(n.id) === 0)
    .map((n) => n.id);
  const runtimeData = new Map<string, any>();

  // 4. Process in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId)!;

    // Find all incoming connections
    const incomingEdges = edges.filter((e) => e.target === currentId);
    let inputValue: any = null;

    if (incomingEdges.length === 1) {
      const e = incomingEdges[0];
      inputValue = runtimeData.get(`${e.source}__${e.sourceHandle}`) ?? runtimeData.get(e.source) ?? null;
    } else if (incomingEdges.length === 0) {
      // Source node — use its own data
      inputValue = (currentNode.data as any)?.text ?? "";
    }
    // For MergeNode — handled separately below

    let outputValue: any = inputValue;
    const nodeData = currentNode.data as any;

    try {
      switch (currentNode.type) {
        case "TextInputNode":
          outputValue = nodeData?.text ?? "";
          break;

        case "InputFileNode":
        case "SpreadsheetInputNode":
        case "DataLibraryInputNode": {
          // All store parsed data in data.text as { columns, data }
          const fileData = nodeData?.text;
          if (fileData && typeof fileData === "object" && fileData.columns) {
            outputValue = fileData as Dataset;
          } else {
            outputValue = { columns: [], data: [] };
          }
          break;
        }

        // ── Publish boundary nodes ──
        case "WorkflowInputNode": {
          // During normal editing: pass through incoming data
          // During inner execution: data is injected by SubflowNode handler
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        case "WorkflowOutputNode": {
          // Collect incoming data — this is the output of the publishable workflow
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        case "CamelCaseNode":
          if (typeof inputValue === "string") {
            outputValue = toCamelCase(inputValue);
          } else {
            outputValue = toCamelCase(String(JSON.stringify(inputValue) ?? ""));
          }
          break;

        case "LowercaseNode":
          if (typeof inputValue === "string") {
            outputValue = toLowercase(inputValue);
          } else {
            outputValue = toLowercase(String(JSON.stringify(inputValue) ?? ""));
          }
          break;

        case "FilterNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyFilter(ds, nodeData?.config ?? {});
          break;
        }

        case "MathColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyMathColumn(ds, nodeData?.config ?? {});
          break;
        }

        case "MathRowNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyMathRow(ds, nodeData?.config ?? {});
          break;
        }

        case "SortNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySort(ds, nodeData?.config ?? {});
          break;
        }

        case "AggregateNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyAggregate(ds, nodeData?.config ?? {});
          break;
        }

        case "CountNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyCountInRow(ds, nodeData?.config ?? {});
          break;
        }

        case "FormulaNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          const config = nodeData?.config ?? {};

          // Try server-side first, fallback to client
          try {
            const resp = await api.post("/formula", {
              columns: ds.columns,
              data: ds.data,
              formula: config.formula,
              result_column: config.resultColumn,
            });
            outputValue = resp.data as Dataset;
          } catch {
            // Fallback to client-side
            outputValue = applyFormula(ds, config);
          }
          break;
        }

        case "MergeNode": {
          // Find left and right inputs by handle id
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find(
            (e) => e.targetHandle === "right"
          );

          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };

          outputValue = applyMerge(leftData, rightData, nodeData?.config ?? {});

          // Update node with column info from both sides
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      leftColumns: leftData.columns,
                      rightColumns: rightData.columns,
                    },
                  }
                : node
            )
          );
          break;
        }

        case "RenameColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyRenameColumn(ds, nodeData?.config ?? {});
          break;
        }

        case "SelectColumnsNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySelectColumns(ds, nodeData?.config ?? {});
          break;
        }

        case "ColumnMapNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyColumnMap(ds, nodeData?.config ?? {});
          break;
        }

        case "DropColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyDropColumns(ds, nodeData?.config ?? {});
          break;
        }

        case "IfElseNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyIfElse(ds, nodeData?.config ?? {});
          break;
        }

        case "SwitchCaseNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySwitchCase(ds, nodeData?.config ?? {});
          break;
        }

        case "UnionMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? (runtimeData.get(`${leftEdge.source}__${leftEdge.sourceHandle}`) ?? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? (runtimeData.get(`${rightEdge.source}__${rightEdge.sourceHandle}`) ?? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          outputValue = applyUnionMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "UpdateMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applyUpdateMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "SheetMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applySheetMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "AppendNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const topData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const bottomData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applyAppend(topData, bottomData, nodeData?.config ?? {});
          break;
        }

        case "SubflowNode": {
          // Execute the published workflow's full inner graph
          const innerDef = nodeData?.publishedDefinition;
          const innerInputSchema = nodeData?.inputSchema ?? [];
          const innerOutputSchema = nodeData?.outputSchema ?? [];

          if (innerDef && innerDef.nodes && innerDef.edges) {
            // 1. Build a map of input data for each boundary input node
            //    Each SubflowNode handle is named `subflow-in-{boundaryNodeId}`
            const inputDataMap = new Map<string, any>();
            for (const schema of innerInputSchema) {
              // Find the edge connecting to this specific input handle
              const handleId = `subflow-in-${schema.nodeId}`;
              const matchingEdge = incomingEdges.find(e => e.targetHandle === handleId);
              if (matchingEdge) {
                const edgeData = runtimeData.get(`${matchingEdge.source}__${matchingEdge.sourceHandle}`) 
                  ?? runtimeData.get(matchingEdge.source) 
                  ?? { columns: [], data: [] };
                inputDataMap.set(schema.nodeId, edgeData);
              } else {
                inputDataMap.set(schema.nodeId, { columns: [], data: [] });
              }
            }

            // 2. Run inner graph (non-stateful topological execution)
            const innerResult = await executeInnerWorkflow(
              innerDef.nodes,
              innerDef.edges,
              inputDataMap
            );

            // 3. Extract output from WorkflowOutputNode(s)
            if (innerOutputSchema.length > 0) {
              // If multiple outputs, store each under its handle
              if (innerOutputSchema.length === 1) {
                outputValue = innerResult.get(innerOutputSchema[0].nodeId) ?? { columns: [], data: [] };
              } else {
                // Multiple outputs — store per-handle
                for (const outSchema of innerOutputSchema) {
                  const outData = innerResult.get(outSchema.nodeId) ?? { columns: [], data: [] };
                  runtimeData.set(`${currentId}__subflow-out-${outSchema.nodeId}`, outData);
                }
                outputValue = innerResult.get(innerOutputSchema[0].nodeId) ?? { columns: [], data: [] };
              }
            } else {
              // No output boundary — action-only workflow
              outputValue = undefined;
            }
          } else {
            outputValue = inputValue ?? { columns: [], data: [] };
          }
          break;
        }

        case "SheetEditorNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = ds;
          break;
        }

        case "SubjectBlockNode": {
          // Resolve text inputs from connected nodes
          const subjectCodeEdge = incomingEdges.find(e => e.targetHandle === "subject-code");
          const sectionTypeEdge = incomingEdges.find(e => e.targetHandle === "section-type");
          const keyColNameEdge = incomingEdges.find(e => e.targetHandle === "key-col-name");
          const dataEdge = incomingEdges.find(e => e.targetHandle === "data");

          const subjectCode = subjectCodeEdge
            ? String(runtimeData.get(`${subjectCodeEdge.source}__${subjectCodeEdge.sourceHandle}`) ?? runtimeData.get(subjectCodeEdge.source) ?? "")
            : nodeData?.config?.subjectCode ?? "";
          const sectionType = sectionTypeEdge
            ? String(runtimeData.get(`${sectionTypeEdge.source}__${sectionTypeEdge.sourceHandle}`) ?? runtimeData.get(sectionTypeEdge.source) ?? "")
            : nodeData?.config?.sectionType ?? "";
          const keyColName = keyColNameEdge
            ? String(runtimeData.get(`${keyColNameEdge.source}__${keyColNameEdge.sourceHandle}`) ?? runtimeData.get(keyColNameEdge.source) ?? "")
            : nodeData?.config?.keyColumnName ?? "";
          const blockData: Dataset = dataEdge
            ? (runtimeData.get(`${dataEdge.source}__${dataEdge.sourceHandle}`) ?? runtimeData.get(dataEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          // Store resolved values for display
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? { ...node, data: { ...node.data, resolvedSubjectCode: subjectCode, resolvedSectionType: sectionType, resolvedKeyColumn: keyColName, inputColumns: blockData.columns } }
                : node
            )
          );

          outputValue = applySubjectBlock(blockData, subjectCode, sectionType, keyColName);
          break;
        }

        case "BlockConcatNode": {
          // Resolve sheet name from handle or config
          const sheetNameEdge = incomingEdges.find(e => e.targetHandle === "sheet-name");
          const resolvedSheetName = sheetNameEdge
            ? String(runtimeData.get(`${sheetNameEdge.source}__${sheetNameEdge.sourceHandle}`) ?? runtimeData.get(sheetNameEdge.source) ?? "")
            : "";
          const masterSheetName = resolvedSheetName || nodeData?.config?.sheetName || 'Master Sheet';

          // Base input (Enrollment, Name etc)
          const baseEdge = incomingEdges.find(e => e.targetHandle === "base");
          const baseData: Dataset = baseEdge
            ? (runtimeData.get(`${baseEdge.source}__${baseEdge.sourceHandle}`) ?? runtimeData.get(baseEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          // Collect block inputs (block-0 through block-7)
          const blocks: Dataset[] = [];
          for (let i = 0; i < 8; i++) {
            const blockEdge = incomingEdges.find(e => e.targetHandle === `block-${i}`);
            if (blockEdge) {
              const blockData = runtimeData.get(`${blockEdge.source}__${blockEdge.sourceHandle}`) ?? runtimeData.get(blockEdge.source);
              if (blockData && blockData.columns) blocks.push(blockData);
            }
          }

          const keyCol = nodeData?.config?.keyColumn ?? baseData.columns[0] ?? "";
          outputValue = applyBlockConcat(baseData, blocks, keyCol);

          // Extract block codenames from output columns
          const blockCodenames: string[] = [];
          if (outputValue && outputValue.columns) {
            const baseCols = baseData.columns || [];
            for (const col of outputValue.columns) {
              if (baseCols.includes(col)) continue;
              const parts = col.split(':');
              if (parts.length >= 2) {
                const code = `${parts[0]}:${parts[1]}`;
                if (!blockCodenames.includes(code)) blockCodenames.push(code);
              }
            }
          }

          // Push to master sheet store for preview
          if (outputValue && outputValue.columns && outputValue.columns.length > 0) {
            try {
              const { useMasterSheetStore } = await import("@/stores/master-sheet-store");
              useMasterSheetStore.getState().pushData({
                masterSheetName: masterSheetName,
                sheetName: masterSheetName,
                data: outputValue,
                blockCodenames: blockCodenames,
                pushedBy: 'workflow',
                pushedByName: 'Workflow Execution',
                pushedAt: Date.now(),
                sourceNodeId: currentId,
              });
            } catch (e) {
              console.warn("Could not push to master sheet store:", e);
            }
          }

          // Update node with metadata including resolved sheet name
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? { ...node, data: { ...node.data, baseColumns: baseData.columns, connectedBlocks: blocks.length, resolvedSheetName: resolvedSheetName || undefined } }
                : node
            )
          );
          break;
        }

        case "OutputNode2":
        case "baseOutput":
        case "FileOutputNode":
          outputValue = inputValue;
          break;

        default:
          outputValue = inputValue;
          break;
      }
    } catch (err: any) {
      console.error(`Error processing node ${currentNode.type}:`, err);
      setNodes((nds) =>
        nds.map((node) =>
          node.id === currentId
            ? {
                ...node,
                data: {
                  ...node.data,
                  error: err?.message ?? "Processing error",
                },
              }
            : node
        )
      );
      outputValue = inputValue; // pass through on error
    }

    if (currentNode.type === "IfElseNode" || currentNode.type === "SwitchCaseNode") {
      // outputValue is Record<string, Dataset> mapping handle ID to Dataset
      if (outputValue && typeof outputValue === "object") {
        for (const handleId in outputValue) {
          runtimeData.set(`${currentId}__${handleId}`, outputValue[handleId]);
        }
      }
    } else {
      runtimeData.set(currentId, outputValue);
      // Fallback for single-handle output edges checking specific handles
      runtimeData.set(`${currentId}__out`, outputValue);
    }

    // Update node's result + propagate column info to downstream nodes
    const isDataset =
      outputValue &&
      typeof outputValue === "object" &&
      Array.isArray(outputValue.columns);

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === currentId) {
          return {
            ...node,
            data: {
              ...node.data,
              result: outputValue,
              rowCount: isDataset ? outputValue.data.length : undefined,
            },
          };
        }

        // Propagate inputColumns to downstream nodes
        const isChild = edges.some(
          (e) => e.source === currentId && e.target === node.id
        );
        if (isChild && isDataset) {
          return {
            ...node,
            data: {
              ...node.data,
              inputColumns: outputValue.columns,
            },
          };
        }

        return node;
      })
    );

    // Decrease in-degree of children → add to queue
    graph.get(currentId)!.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }
};

// ────────────────────────────────────────────────
// Inner workflow execution — non-stateful, used by SubflowNode
// Returns a map of nodeId → outputValue
// ────────────────────────────────────────────────
async function executeInnerWorkflow(
  innerNodes: any[],
  innerEdges: any[],
  inputDataMap: Map<string, any>
): Promise<Map<string, any>> {
  const runtimeData = new Map<string, any>();

  // Build graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  innerNodes.forEach((node: any) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  innerEdges.forEach((edge: any) => {
    graph.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Start with source nodes (no incoming)
  const queue = innerNodes
    .filter((n: any) => inDegree.get(n.id) === 0)
    .map((n: any) => n.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = innerNodes.find((n: any) => n.id === currentId);
    if (!currentNode) continue;

    const incomingEdges = innerEdges.filter((e: any) => e.target === currentId);
    let inputValue: any = null;

    if (incomingEdges.length === 1) {
      const e = incomingEdges[0];
      inputValue = runtimeData.get(`${e.source}__${e.sourceHandle}`) ?? runtimeData.get(e.source) ?? null;
    }

    let outputValue: any = inputValue;
    const nodeData = currentNode.data || {};

    try {
      switch (currentNode.type) {
        // Boundary input: inject data from the parent SubflowNode
        case "WorkflowInputNode": {
          outputValue = inputDataMap.get(currentId) ?? { columns: [], data: [] };
          break;
        }

        // Boundary output: pass-through
        case "WorkflowOutputNode": {
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        // Data input nodes
        case "InputFileNode":
        case "SpreadsheetInputNode":
        case "DataLibraryInputNode": {
          const fileData = nodeData?.text;
          if (fileData && typeof fileData === "object" && fileData.columns) {
            outputValue = fileData as Dataset;
          } else {
            outputValue = { columns: [], data: [] };
          }
          break;
        }

        case "TextInputNode":
          outputValue = nodeData?.text ?? "";
          break;

        // Transform nodes
        case "FilterNode":
          outputValue = applyFilter(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "MathColumnNode":
          outputValue = applyMathColumn(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "MathRowNode":
          outputValue = applyMathRow(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SortNode":
          outputValue = applySort(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "AggregateNode":
          outputValue = applyAggregate(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "CountNode":
          outputValue = applyCountInRow(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "FormulaNode":
          outputValue = applyFormula(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "RenameColumnNode":
          outputValue = applyRenameColumn(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SelectColumnsNode":
          outputValue = applySelectColumns(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "ColumnMapNode":
          outputValue = applyColumnMap(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "DropColumnNode":
          outputValue = applyDropColumns(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "CamelCaseNode":
          outputValue = typeof inputValue === "string" ? toCamelCase(inputValue) : toCamelCase(String(JSON.stringify(inputValue) ?? ""));
          break;

        case "LowercaseNode":
          outputValue = typeof inputValue === "string" ? toLowercase(inputValue) : toLowercase(String(JSON.stringify(inputValue) ?? ""));
          break;

        case "IfElseNode":
          outputValue = applyIfElse(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SwitchCaseNode":
          outputValue = applySwitchCase(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        // Merge nodes
        case "MergeNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const leftData = leftEdge ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          const rightData = rightEdge ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          outputValue = applyMerge(leftData, rightData, nodeData?.config ?? {});
          break;
        }

        case "UnionMergeNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const leftData = leftEdge
            ? (runtimeData.get(`${leftEdge.source}__${leftEdge.sourceHandle}`) ?? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          const rightData = rightEdge
            ? (runtimeData.get(`${rightEdge.source}__${rightEdge.sourceHandle}`) ?? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          outputValue = applyUnionMerge(leftData, rightData, nodeData?.config ?? {});
          break;
        }

        case "AppendNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const topData = leftEdge ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          const bottomData = rightEdge ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          outputValue = applyAppend(topData, bottomData, nodeData?.config ?? {});
          break;
        }

        case "SubjectBlockNode": {
          const subjectCodeEdge = incomingEdges.find((e: any) => e.targetHandle === "subject-code");
          const sectionTypeEdge = incomingEdges.find((e: any) => e.targetHandle === "section-type");
          const keyColNameEdge = incomingEdges.find((e: any) => e.targetHandle === "key-col-name");
          const dataEdge = incomingEdges.find((e: any) => e.targetHandle === "data");
          const subjectCode = subjectCodeEdge ? String(runtimeData.get(subjectCodeEdge.source) ?? "") : nodeData?.config?.subjectCode ?? "";
          const sectionType = sectionTypeEdge ? String(runtimeData.get(sectionTypeEdge.source) ?? "") : nodeData?.config?.sectionType ?? "";
          const keyColName = keyColNameEdge ? String(runtimeData.get(keyColNameEdge.source) ?? "") : nodeData?.config?.keyColumnName ?? "";
          const blockDataIn: Dataset = dataEdge ? (runtimeData.get(dataEdge.source) ?? { columns: [], data: [] }) : { columns: [], data: [] };
          outputValue = applySubjectBlock(blockDataIn, subjectCode, sectionType, keyColName);
          break;
        }

        case "BlockConcatNode": {
          const baseEdge = incomingEdges.find((e: any) => e.targetHandle === "base");
          const baseDataIn: Dataset = baseEdge ? (runtimeData.get(baseEdge.source) ?? { columns: [], data: [] }) : { columns: [], data: [] };
          const blocksIn: Dataset[] = [];
          for (let i = 0; i < 8; i++) {
            const be = incomingEdges.find((e: any) => e.targetHandle === `block-${i}`);
            if (be) { const bd = runtimeData.get(be.source); if (bd?.columns) blocksIn.push(bd); }
          }
          const kcIn = nodeData?.config?.keyColumn ?? baseDataIn.columns[0] ?? "";
          outputValue = applyBlockConcat(baseDataIn, blocksIn, kcIn);
          break;
        }

        default:
          outputValue = inputValue;
          break;
      }
    } catch (err: any) {
      console.error(`Inner workflow error on node ${currentNode.type}:`, err);
      outputValue = inputValue;
    }

    // Store output
    if (currentNode.type === "IfElseNode" || currentNode.type === "SwitchCaseNode") {
      if (outputValue && typeof outputValue === "object") {
        for (const handleId in outputValue) {
          runtimeData.set(`${currentId}__${handleId}`, outputValue[handleId]);
        }
      }
    } else {
      runtimeData.set(currentId, outputValue);
      runtimeData.set(`${currentId}__out`, outputValue);
      // Also set for workflow-input specific handles
      if (currentNode.type === "WorkflowInputNode") {
        runtimeData.set(`${currentId}__wf-input-${currentId}`, outputValue);
      }
    }

    // Decrease in-degree of children → add to queue
    graph.get(currentId)?.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }

  return runtimeData;
}
