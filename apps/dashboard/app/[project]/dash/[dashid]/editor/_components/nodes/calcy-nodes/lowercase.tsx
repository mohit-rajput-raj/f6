'use client';

import { memo } from "react";
import { Position } from "@xyflow/react";
import { Type } from "lucide-react";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHeaderActions,
  NodeHandle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

export const LowercaseNode = memo(({ id }: { data: any; id: string }) => {
  const handleDelete = useDeleteNode();

  return (
    <BaseNode variant="transform" className="w-[280px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <Type className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>To Lowercase</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 text-center text-xs text-muted-foreground space-y-1">
        <p>Converts incoming text to lowercase</p>
        <p className="text-[10px] font-mono opacity-80">(e.g. &ldquo;Hello World&rdquo; → &ldquo;hello world&rdquo;)</p>
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

LowercaseNode.displayName = 'LowercaseNode';