'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Merge } from 'lucide-react';
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[300px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-cyan-700 text-white">
          <Merge className="size-4" />
          <BaseNodeHeaderTitle>Merge / Join</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Join type</Label>
            <Select value={config.joinType ?? 'inner'} onValueChange={v => updateConfig({ joinType: v as JoinType })}>
              <SelectTrigger className="h-8">
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

          <div className="space-y-1">
            <Label className="text-xs">Left key column</Label>
            <Select value={config.leftColumn} onValueChange={v => updateConfig({ leftColumn: v })} disabled={leftColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={leftColumns.length === 0 ? "Connect left input" : "Select"} />
              </SelectTrigger>
              <SelectContent>
                {leftColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Right key column</Label>
            <Select value={config.rightColumn} onValueChange={v => updateConfig({ rightColumn: v })} disabled={rightColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={rightColumns.length === 0 ? "Connect right input" : "Select"} />
              </SelectTrigger>
              <SelectContent>
                {rightColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-cyan-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows merged
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-cyan-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-cyan-400" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-cyan-600" />
      </BaseNode>
    </>
  );
});

MergeNode.displayName = "MergeNode";
