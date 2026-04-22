'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="w-[220px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white">
          <Type className="size-4" />
          <BaseNodeHeaderTitle>Text</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3">
          <input
            value={data.text || ''}
            onChange={e => updateText(e.target.value)}
            placeholder="Enter text..."
            className="w-full h-8 px-2 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 nodrag"
          />
          {data.text && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              → "{data.text}"
            </p>
          )}
        </BaseNodeContent>

        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-blue-600" />
      </BaseNode>
    </>
  );
});

TextValueNode.displayName = 'TextValueNode';
