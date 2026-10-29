'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Combine } from 'lucide-react';
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
import { Label } from "@repo/ui/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

interface UnionMergeConfig {
  keyColumns?: string[];
}

export const UnionMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: UnionMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];

  const commonColumns = leftColumns.filter(c => rightColumns.includes(c));

  const updateConfig = useCallback((updates: Partial<UnionMergeConfig>) => {
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
            <Combine className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Union Merge</BaseNodeHeaderTitle>
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
          Combines all columns from both sheets matching on key columns.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Key Columns (match rows on these)</Label>
          {commonColumns.length > 0 ? (
            <div className="nodrag">
              <MultiSelect
                options={commonColumns.map(col => ({ label: col, value: col }))}
                onValueChange={(vals) => updateConfig({ keyColumns: vals })}
                defaultValue={config.keyColumns ?? []}
                placeholder="Select key columns"
                maxCount={3}
              />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground border border-border/40 rounded-lg p-2 italic bg-muted/20">
              {leftColumns.length === 0 && rightColumns.length === 0
                ? "Connect both inputs first"
                : "No common columns found between left & right"}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Common columns between left ({leftColumns.length}) and right ({rightColumns.length})
          </p>
        </div>

        {(leftColumns.length > 0 || rightColumns.length > 0) && (
          <div className="border-t border-border/40 pt-2 space-y-1">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400">Left columns</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {leftColumns.slice(0, 6).map((col, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-foreground font-mono">
                      {col}
                    </span>
                  ))}
                  {leftColumns.length > 6 && <span className="text-[9px] text-muted-foreground">+{leftColumns.length - 6}</span>}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-pink-600 dark:text-pink-400">Right columns</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rightColumns.slice(0, 6).map((col, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-foreground font-mono">
                      {col}
                    </span>
                  ))}
                  {rightColumns.length > 6 && <span className="text-[9px] text-muted-foreground">+{rightColumns.length - 6}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows • {data.result?.columns?.length ?? '?'} columns
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="left" style={{ top: '35%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="right" style={{ top: '65%' }} />
      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

UnionMergeNode.displayName = "UnionMergeNode";
