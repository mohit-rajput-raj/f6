'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Combine } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Label } from "@repo/ui/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

interface UnionMergeConfig {
  keyColumns?: string[];
}

/**
 * UnionMergeNode — merges two datasets by combining all columns.
 * Example: Sheet1(a,b,c,d) + Sheet2(b,d,e,f) → Result(a,b,c,d,e,f)
 * Multiple key columns are used to match rows (like a composite key).
 */
export const UnionMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: UnionMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];

  // All columns available for key selection = intersection of left & right
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-indigo-700 text-white">
          <Combine className="size-4" />
          <BaseNodeHeaderTitle>Union Merge</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground leading-tight">
            Combines all columns from both sheets. Rows are matched on key columns. Unmatched rows are kept with nulls.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Key Columns (match rows on these)</Label>
            {commonColumns.length > 0 ? (
              <MultiSelect
                options={commonColumns.map(col => ({ label: col, value: col }))}
                onValueChange={(vals) => updateConfig({ keyColumns: vals })}
                defaultValue={config.keyColumns ?? []}
                placeholder="Select key columns"
                maxCount={3}
              />
            ) : (
              <div className="text-xs text-muted-foreground border rounded p-2 italic">
                {leftColumns.length === 0 && rightColumns.length === 0
                  ? "Connect both inputs first"
                  : "No common columns found between left & right"}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground">
              Common columns between left ({leftColumns.length}) and right ({rightColumns.length})
            </p>
          </div>

          {/* Column preview */}
          {(leftColumns.length > 0 || rightColumns.length > 0) && (
            <div className="border-t pt-2 space-y-1">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-indigo-500">Left columns</Label>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {leftColumns.slice(0, 6).map((col, i) => (
                      <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {col}
                      </span>
                    ))}
                    {leftColumns.length > 6 && <span className="text-[9px] text-muted-foreground">+{leftColumns.length - 6}</span>}
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-violet-500">Right columns</Label>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {rightColumns.slice(0, 6).map((col, i) => (
                      <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
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
            <div className="text-xs text-indigo-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {data.result?.columns?.length ?? '?'} columns
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-indigo-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-violet-500" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-indigo-600" />
      </BaseNode>
    </>
  );
});

UnionMergeNode.displayName = "UnionMergeNode";
