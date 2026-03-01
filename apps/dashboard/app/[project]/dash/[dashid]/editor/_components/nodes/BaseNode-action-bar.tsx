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
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "./settings/triggers";

export const ActionBarNodeDemo = memo(({ data }: any) => {
  const nodeId = useNodeId();

  const { setNodes , setEdges } = useEditorWorkFlow();
    const handleDelete = useDeleteNode();
 
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
        <IconTrash className="size-4 cursor-pointer p-0 text-red-300" onClick={handleDelete} />
      </div>
        {/* <Button
            variant="ghost"
            size="icon"
            className="nodrag"
            onClick={handleDelete}
          >
            <Trash className="size-4" />
          </Button> */}
      <BaseNode>
        <BaseNodeHeader className="border-b flex items-center gap-2">
          <Rocket className="size-4" />
          <BaseNodeHeaderTitle>Node With Actions</BaseNodeHeaderTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="nodrag"
              >
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Node Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={handleDelete}>
                Delete Node
              </DropdownMenuItem> */}
              <DropdownMenuItem>Action 1</DropdownMenuItem>
              <DropdownMenuItem>Action 2</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          
        </BaseNodeHeader>

        <BaseNodeContent>
          <p>Add your content here.</p>
        </BaseNodeContent>
      </BaseNode>

      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-6 h-6 bg-primary border-2 border-background"
      />
    </>
  );
});

ActionBarNodeDemo.displayName = "ActionBarNodeDemo";
