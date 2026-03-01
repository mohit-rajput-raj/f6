import type React from "react";
import type { Edge } from "@xyflow/react";
import type { EditorNodeType } from "@/lib/types";
import { toCamelCase, toLowercase } from "./functions";

export const executeWorkflow = async (
  nodes: EditorNodeType[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>
) => {
  // 1. Clear previous results
  setNodes((nds) =>
    nds.map((n) => ({ ...n, data: { ...n.data, result: undefined } }))
  );

  // 2. Build adjacency list + incoming count for topological sort
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

  // 3. Start with nodes that have no incoming edges (TextInput in our demo)
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const runtimeData = new Map<string, any>();

  // 4. Process in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId)!;

    let inputValue: any = '';

    // Find incoming data
    const incomingEdge = edges.find((e) => e.target === currentId);
    if (incomingEdge) {
      inputValue = runtimeData.get(incomingEdge.source) || '';
    } else {
      // Source node → take its own data
      inputValue = (currentNode.data as any)?.text || '';
    }

    let outputValue: any = inputValue;

    // Node-specific logic
    switch (currentNode.type) {
      case "TextInputNode":
        outputValue = (currentNode.data as any)?.text || "";
        break;

      case "CamelCaseNode":
        outputValue = toCamelCase(String(inputValue));
        break;

      case "OutputNode2":
        outputValue = inputValue; // just pass through
        break;
      
      case "LowercaseNode":
        outputValue = toLowercase(String(inputValue));
        break;

      default:
        outputValue = inputValue;
    }

    runtimeData.set(currentId, outputValue);

    // Update node UI with result (for OutputNode and others)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === currentId
          ? { ...node, data: { ...node.data, result: outputValue } }
          : node
      )
    );

    // Decrease inDegree of children
    graph.get(currentId)!.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }
};