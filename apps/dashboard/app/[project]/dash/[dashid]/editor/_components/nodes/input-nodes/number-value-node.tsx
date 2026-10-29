'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Hash } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";

export const NumberValueNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const updateValue = useCallback((val: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, text: val } } : node
      )
    );
  }, [id, setNodes]);

  const numVal = data.text != null ? Number(data.text) : '';

  return (
    <BaseNode variant="math" className="w-[220px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <Hash className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Number</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-2">
        <Input
          type="number"
          value={data.text ?? ''}
          onChange={e => updateValue(e.target.value)}
          placeholder="0"
          className="h-8 text-xs nodrag font-mono"
        />
        {data.text != null && data.text !== '' && (
          <p className="text-[10px] text-muted-foreground font-mono">
            &rarr; {numVal}
          </p>
        )}
      </BaseNodeContent>

      <NodeHandle variant="math" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

NumberValueNode.displayName = 'NumberValueNode';
