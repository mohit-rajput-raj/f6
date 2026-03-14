import { memo, useCallback } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import { EllipsisVertical, Rocket, Trash } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";

import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { NodeMenu } from "./node-menu";
import { DrawerDemo } from "@/components/dashboard/flow/Node/drawer";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "./settings/triggers";
import { NodeData } from "./input-nodes/test-nodes";

export const OutputNode = memo(({ data }: { data: NodeData }) => {
  const nodeId = useNodeId();
  const handleDelete = useDeleteNode();
  // const { setNodes , setEdges } = useEditorWorkFlow();

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="w-6 h-6 bg-muted-foreground border-2 border-background"
      />

      <div>
        <div className="flex justify-between items-center ">
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer p-0 text-red-300"
            onClick={handleDelete}
          />
        </div>

        <BaseNode>
          <BaseNodeHeader className="border-b flex items-center gap-2">
            <Rocket className="size-4" />
            <BaseNodeHeaderTitle>click to see output</BaseNodeHeaderTitle>
            {
              data?.result && (
                <DrawerDemo data={data.result} />
              )
            }
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="nodrag">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Node Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>Text</DropdownMenuItem>
                <DropdownMenuItem>File</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </BaseNodeHeader>

          <BaseNodeContent>
            <p>{data?.result}</p>
          </BaseNodeContent>
        </BaseNode>
      </div>
    </>
  );
});

OutputNode.displayName = "OutputNode";
