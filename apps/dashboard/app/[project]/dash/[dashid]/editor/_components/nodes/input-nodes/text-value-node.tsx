'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
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

export const TextValueNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const updateText = useCallback((newText: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
      )
    );
  }, [id, setNodes]);

  return (
    <BaseNode variant="input" className="w-[230px]">
      <BaseNodeHeader variant="input">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="input">
            <Type className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Text</BaseNodeHeaderTitle>
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
          value={data.text || ''}
          onChange={e => updateText(e.target.value)}
          placeholder="Enter text..."
          className="h-8 text-xs nodrag"
        />
        {data.text && (
          <p className="text-[10px] text-muted-foreground truncate font-mono">
            &rarr; &ldquo;{data.text}&rdquo;
          </p>
        )}
      </BaseNodeContent>

      <NodeHandle variant="input" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

TextValueNode.displayName = 'TextValueNode';
