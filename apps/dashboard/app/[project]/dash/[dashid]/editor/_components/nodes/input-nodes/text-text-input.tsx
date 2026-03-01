import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";
import { NodeData } from "./test-nodes";

export const TextInputNode = memo(({ data, id }: { data: NodeData; id: string }) => {
  const { setNodes } = useReactFlow();

  const updateText = useCallback((newText: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
      )
    );
  }, [id, setNodes]);

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[280px] overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>📝</span>
        Text Input
      </div>

      <div className="p-4">
        <textarea
          value={data.text || ''}
          onChange={(e) => updateText(e.target.value)}
          placeholder="Type anything here..."
          className="w-full h-28 resize-y border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-blue-600" />
    </div>
  );
});
TextInputNode.displayName = 'TextInputNode';