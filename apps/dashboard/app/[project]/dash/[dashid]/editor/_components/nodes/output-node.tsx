import { memo } from "react";
import { Position, useNodeId } from "@xyflow/react";
import { Rocket } from "lucide-react";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHeaderActions,
  NodeHandle,
} from "@/components/dashboard/flow/Node/baseNode";

import { NodeMenu } from "./node-menu";
import { DrawerDemo } from "@/components/dashboard/flow/Node/drawer";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "./settings/triggers";
import { NodeData } from "./input-nodes/test-nodes";

export const OutputNode = memo(({ data, selected }: { data: NodeData; selected?: boolean }) => {
  const nodeId = useNodeId();
  const handleDelete = useDeleteNode();

  return (
    <BaseNode variant="output" selected={selected} className="min-w-[280px]">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <Rocket className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Output</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          {data?.result && <DrawerDemo data={data.result} />}
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 text-xs">
        {data?.result ? (
          <div className="font-mono bg-muted/40 p-2 rounded-md border border-border/50 max-h-[140px] overflow-auto">
            {typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result)}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-3 italic">
            Run workflow to see output...
          </p>
        )}
      </BaseNodeContent>

      <NodeHandle variant="output" type="target" position={Position.Left} />
    </BaseNode>
  );
});

OutputNode.displayName = "OutputNode";

