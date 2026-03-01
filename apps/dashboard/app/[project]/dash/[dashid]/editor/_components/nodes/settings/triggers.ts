import { useCallback } from "react";
import { useNodeId } from "@xyflow/react";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";

export function useDeleteNode() {
  const nodeId = useNodeId();
  const { setNodes, setEdges } = useEditorWorkFlow();

  return useCallback(() => {
    if (!nodeId) return;

    setNodes((nodes) => nodes.filter((n) => n.id !== nodeId));
    setEdges((edges) =>
      edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      )
    );
  }, [nodeId, setNodes, setEdges]);
}