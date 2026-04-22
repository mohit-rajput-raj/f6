'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Hash } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="w-[200px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white">
          <Hash className="size-4" />
          <BaseNodeHeaderTitle>Number</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3">
          <input
            type="number"
            value={data.text ?? ''}
            onChange={e => updateValue(e.target.value)}
            placeholder="0"
            className="w-full h-8 px-2 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-orange-500 nodrag font-mono"
          />
          {data.text != null && data.text !== '' && (
            <p className="text-[10px] text-muted-foreground mt-1">
              → {numVal}
            </p>
          )}
        </BaseNodeContent>

        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-orange-600" />
      </BaseNode>
    </>
  );
});

NumberValueNode.displayName = 'NumberValueNode';
