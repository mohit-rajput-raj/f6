'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

interface RenameConfig {
  oldName?: string;
  newName?: string;
}

export const RenameColumnNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: RenameConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<RenameConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white">
          <Type className="size-4" />
          <BaseNodeHeaderTitle>Rename Column</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Column to rename</Label>
            <Select value={config.oldName} onValueChange={v => updateConfig({ oldName: v })} disabled={columns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={columns.length === 0 ? "Connect input first" : "Select"} />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">New name</Label>
            <Input
              value={config.newName ?? ''}
              onChange={e => updateConfig({ newName: e.target.value })}
              placeholder="e.g. student_name"
              className="h-8"
            />
          </div>
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-orange-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-orange-600" />
      </BaseNode>
    </>
  );
});

RenameColumnNode.displayName = "RenameColumnNode";
