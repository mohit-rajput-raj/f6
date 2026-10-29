'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Merge } from 'lucide-react';
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

type JoinType = 'inner' | 'left' | 'right' | 'outer';

interface MergeConfig {
  joinType?: JoinType;
  leftColumn?: string;
  rightColumn?: string;
}

export const MergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: MergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];

  const updateConfig = useCallback((updates: Partial<MergeConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="combine" className="min-w-[300px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <Merge className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Merge / Join</BaseNodeHeaderTitle>
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
          <Label className="text-xs text-muted-foreground">Join type</Label>
          <Select value={config.joinType ?? 'inner'} onValueChange={v => updateConfig({ joinType: v as JoinType })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inner">Inner Join</SelectItem>
              <SelectItem value="left">Left Join</SelectItem>
              <SelectItem value="right">Right Join</SelectItem>
              <SelectItem value="outer">Outer Join</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Left key column</Label>
            <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-mono">Port: Left (top)</span>
          </div>
          <Select value={config.leftColumn} onValueChange={v => updateConfig({ leftColumn: v })} disabled={leftColumns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={leftColumns.length === 0 ? "Connect left input" : "Select column"} />
            </SelectTrigger>
            <SelectContent>
              {leftColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Right key column</Label>
            <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-mono">Port: Right (bottom)</span>
          </div>
          <Select value={config.rightColumn} onValueChange={v => updateConfig({ rightColumn: v })} disabled={rightColumns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={rightColumns.length === 0 ? "Connect right input" : "Select column"} />
            </SelectTrigger>
            <SelectContent>
              {rightColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows merged
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="left" style={{ top: '35%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="right" style={{ top: '65%' }} />
      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

MergeNode.displayName = "MergeNode";
