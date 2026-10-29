import { Position } from "@xyflow/react";
import { memo } from "react";
import { FileText } from "lucide-react";
import { NodeData } from "../input-nodes/test-nodes";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHandle,
} from "@/components/dashboard/flow/Node/baseNode";

export const OutputNode2 = memo(({ data, selected }: { data: NodeData; selected?: boolean }) => {
  return (
    <BaseNode variant="output" selected={selected} className="w-[320px]">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <FileText className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Output Display</BaseNodeHeaderTitle>
      </BaseNodeHeader>

      <BaseNodeContent className="p-4 min-h-[120px] flex items-center justify-center">
        {data.result ? (
          <div className="w-full text-center">
            <div className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
              RESULT
            </div>
            <div className="font-mono max-h-[140px] overflow-y-auto text-xs bg-muted/50 p-3 rounded-md border border-border/60 break-all text-foreground">
              {typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result)}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic text-center">
            Run the workflow to see output here...
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="output" type="target" position={Position.Left} id="in" />
    </BaseNode>
  );
});
OutputNode2.displayName = 'OutputNode2';