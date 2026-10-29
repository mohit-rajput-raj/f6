'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { LayoutPanelLeft } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";

interface SheetMergeConfig {
  keyColumn?: string;
  leftPrefix?: string;
  rightPrefix?: string;
}

export const SheetMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SheetMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];
  const allColumns = [...new Set([...leftColumns, ...rightColumns])];

  const updateConfig = useCallback((updates: Partial<SheetMergeConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="combine" className="min-w-[320px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <LayoutPanelLeft className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Sheet Merge</BaseNodeHeaderTitle>
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
        <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
          Merge datasets side-by-side with subject/category prefixes.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Match Key Column</Label>
          <Select value={config.keyColumn} onValueChange={v => updateConfig({ keyColumn: v })} disabled={allColumns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={allColumns.length === 0 ? "Connect inputs" : "Select key (e.g. Enrollment)"} />
            </SelectTrigger>
            <SelectContent>
              {allColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Left Prefix (e.g. "CO24553:")</Label>
          <Input
            value={config.leftPrefix ?? ''}
            onChange={e => updateConfig({ leftPrefix: e.target.value })}
            placeholder="e.g. Discrete_"
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Right Prefix (e.g. "CO24804:")</Label>
          <Input
            value={config.rightPrefix ?? ''}
            onChange={e => updateConfig({ rightPrefix: e.target.value })}
            placeholder="e.g. MobileApp_"
            className="h-8 text-xs nodrag"
          />
        </div>

        {leftColumns.length > 0 && (
          <div className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 border-t border-border/40 pt-1 font-mono">
            <span className="font-semibold">Left:</span> {leftColumns.join(', ')}
          </div>
        )}
        {rightColumns.length > 0 && (
          <div className="text-[10px] text-pink-600 dark:text-pink-400 font-mono">
            <span className="font-semibold">Right:</span> {rightColumns.join(', ')}
          </div>
        )}

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

SheetMergeNode.displayName = "SheetMergeNode";
