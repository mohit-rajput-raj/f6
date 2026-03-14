import { Handle, Position } from "@xyflow/react";
import { memo } from "react";
import { NodeData } from "../input-nodes/test-nodes";

export const OutputNode2 = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[320px] overflow-hidden">
      <div className="bg-emerald-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>📤</span>
        Output Display
      </div>

      <div className="p-6 min-h-[140px]  flex items-center justify-center">
        {data.result ? (
          <div className="text-center overflow-y-scroll">
            <div className="text-xs uppercase tracking-widest text-emerald-600 mb-1">RESULT</div>
            <div className="font-mono max-h-[140px] overflow-y-auto text-lg bg-gray-50 p-4 rounded border border-emerald-200 break-all">
              {data.result}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic">Run the workflow to see output here...</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-emerald-600" />
    </div>
  );
});
OutputNode2.displayName = 'OutputNode2';