'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ArrowUpDown } from 'lucide-react';
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
import { Label } from "@repo/ui/components/ui/label";

interface SortConfig {
  column?: string;
  direction?: 'asc' | 'desc';
}

export const SortNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SortConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<SortConfig>) => {
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
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-amber-700 text-white">
          <ArrowUpDown className="size-4" />
          <BaseNodeHeaderTitle>Sort</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Sort by column</Label>
            <Select value={config.column} onValueChange={v => updateConfig({ column: v })} disabled={columns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={columns.length === 0 ? "Connect input first" : "Select column"} />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Direction</Label>
            <Select value={config.direction ?? 'asc'} onValueChange={v => updateConfig({ direction: v as 'asc' | 'desc' })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">↑ Ascending</SelectItem>
                <SelectItem value="desc">↓ Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-amber-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows sorted
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-amber-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-amber-600" />
      </BaseNode>
    </>
  );
});

SortNode.displayName = "SortNode";
