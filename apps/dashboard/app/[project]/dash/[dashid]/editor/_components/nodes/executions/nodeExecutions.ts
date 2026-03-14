import type React from "react";
import type { Edge } from "@xyflow/react";
import type { EditorNodeType } from "@/lib/types";
import { applyFilter, toCamelCase, toLowercase } from "./functions";

// ────────────────────────────────────────────────
// Filter logic – complete implementation
// ────────────────────────────────────────────────
type FilterCondition =
  | "text-exact"
  | "text-contains"
  | "text-starts"
  | "text-ends"
  | "number-eq"
  | "number-gt"
  | "number-gte"
  | "number-lt"
  | "number-lte";

export interface FilterConfig {
  column?: string;
  condition?: FilterCondition;
  value?: string;
}

interface Dataset {
  columns: string[];
  data: string[][];     // all values kept as string (common in CSV parsing)
}



// ────────────────────────────────────────────────
// Main execution function (updated)
// ────────────────────────────────────────────────
export const executeWorkflow = async (
  nodes: EditorNodeType[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>
) => {
  // 1. Clear previous results
  setNodes((nds) =>
    nds.map((n) => ({ ...n, data: { ...n.data, result: undefined, rowCount: undefined } }))
  );

  // 2. Build graph for topological sort
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

  // 3. Nodes with no incoming edges (sources)
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const runtimeData = new Map<string, any>();

  // 4. Process in order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId)!;

    let inputValue: any = null;

    // Find incoming connection (most nodes have exactly one)
    const incomingEdge = edges.find((e) => e.target === currentId);

    if (incomingEdge) {
      inputValue = runtimeData.get(incomingEdge.source) ?? null;
    } else {
      // Source nodes take their own data
      inputValue = (currentNode.data as any)?.text ?? "";
    }

    let outputValue: any = inputValue;

    // Node-type specific processing
    switch (currentNode.type) {
      case "TextInputNode":
        outputValue = (currentNode.data as any)?.text ?? "";
        break;

      case "CamelCaseNode":
        outputValue = toCamelCase(String(JSON.stringify(inputValue) ?? ""));
        break;

      case "LowercaseNode":
        outputValue = toLowercase(String(JSON.stringify(inputValue) ?? ""));
        break;

      case "OutputNode2":
        outputValue = inputValue; // pass-through + display
        break;

      case "FilterNode":
        // Expect dataset shape from previous node (usually InputFileNode)
        const inputDataset: Dataset = inputValue ?? { columns: [], data: [] };

        const filteredDataset = applyFilter(inputDataset, (currentNode.data as any)?.config ?? {});

        outputValue = filteredDataset;

        // Optional: store row count for UI feedback on the node
        
        break;

      default:
        outputValue = inputValue;
        break;
    }

    runtimeData.set(currentId, outputValue);

    // Update the node's result (mainly for Output nodes)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === currentId
          ? { ...node, data: { ...node.data, result: outputValue } }
          : node
      )
    );

    // Decrease in-degree of children → add to queue if ready
    graph.get(currentId)!.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }
}


