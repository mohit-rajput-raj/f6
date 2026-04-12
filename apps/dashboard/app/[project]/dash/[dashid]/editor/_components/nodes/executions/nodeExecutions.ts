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
          // Execute the published workflow's inner graph
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          const innerDef = nodeData?.publishedDefinition;

          if (innerDef && innerDef.nodes && innerDef.edges) {
            // Create virtual input nodes with the incoming data
            const innerNodes = innerDef.nodes.map((n: any) => {
              // If it's an input node type, inject our data
              if (["InputFileNode", "SpreadsheetInputNode", "DataLibraryInputNode"].includes(n.type)) {
                return { ...n, data: { ...n.data, text: ds } };
              }
              return { ...n };
            });

            // Run the inner workflow synchronously by collecting outputs
            const innerEdges = innerDef.edges;
            // For now, simple pass-through — the inner execution would need
            // a non-stateful version of executeWorkflow
            // TODO: Implement recursive inner execution
            outputValue = ds;
          } else {
            outputValue = ds;
          }
          break;
        }

        case "SheetEditorNode": {
          // Terminal node — accepts data but produces no downstream output
          // The actual push-to-sheet is triggered by the node's button or on exec
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = ds; // Still store as result for the push button to use
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
