'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';
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

type AggOp = 'sum' | 'count' | 'average' | 'min' | 'max';

interface AggregateConfig {
  groupByColumn?: string;
  aggregateColumn?: string;
  operation?: AggOp;
}

export const AggregateNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: AggregateConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<AggregateConfig>) => {
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

      <BaseNode className="min-w-[300px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-indigo-700 text-white">
          <BarChart3 className="size-4" />
          <BaseNodeHeaderTitle>Aggregate</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Group by</Label>
            <Select value={config.groupByColumn} onValueChange={v => updateConfig({ groupByColumn: v })} disabled={columns.length === 0}>
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
            <Label className="text-xs">Aggregate column</Label>
            <Select value={config.aggregateColumn} onValueChange={v => updateConfig({ aggregateColumn: v })} disabled={columns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Operation</Label>
            <Select value={config.operation} onValueChange={v => updateConfig({ operation: v as AggOp })}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="min">Min</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-indigo-600 font-medium text-center pt-2 border-t">
              {data.rowCount} groups
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-indigo-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-indigo-600" />
      </BaseNode>
    </>
  );
});

AggregateNode.displayName = "AggregateNode";
