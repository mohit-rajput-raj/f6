'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';
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
    <BaseNode variant="math" className="min-w-[300px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <BarChart3 className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Aggregate</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Group by</Label>
          <Select value={config.groupByColumn} onValueChange={v => updateConfig({ groupByColumn: v })} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={columns.length === 0 ? "Connect input first" : "Select column"} />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Aggregate column</Label>
          <Select value={config.aggregateColumn} onValueChange={v => updateConfig({ aggregateColumn: v })} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Operation</Label>
          <Select value={config.operation} onValueChange={v => updateConfig({ operation: v as AggOp })}>
            <SelectTrigger className="h-8 text-xs">
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
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} groups
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="math" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="math" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

AggregateNode.displayName = "AggregateNode";
