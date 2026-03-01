import type { Node, Edge } from "@xyflow/react";

export function buildWorkflowJson(nodes: Node[], edges: Edge[]) {
  const connections: Record<string, string[]> = {};

  edges.forEach((edge) => {
    connections[edge.source] = connections[edge.source] ?? [];
    connections[edge.source].push(edge.target);
  });

  return {
    meta: {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    connections,
  };
}