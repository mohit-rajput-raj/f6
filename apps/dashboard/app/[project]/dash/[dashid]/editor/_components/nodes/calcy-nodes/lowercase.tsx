import { NodeData } from "@syncfusion/ej2-navigations";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export const LowercaseNode = memo(({ data, id }: { data: NodeData; id: string }) => {
  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[280px] overflow-hidden">
      <div className="bg-violet-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>🔄</span>
        To Lowercase
      </div>

      <div className="p-4 text-center text-sm text-gray-500">
        Takes input from left → converts to lowercase
        <br />
        <span className="text-xs">(e.g. "Hello World" → "hello world")</span>
      </div>

      <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-violet-600" />
      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-violet-600" />
    </div>
  );
});
LowercaseNode.displayName = 'LowercaseNode';