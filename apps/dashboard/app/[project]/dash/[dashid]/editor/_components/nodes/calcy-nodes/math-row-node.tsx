'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Rows3 } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

type RowAgg = 'sum' | 'average' | 'min' | 'max';

interface MathRowConfig {
  columns?: string[];
  aggregation?: RowAgg;
  resultColumn?: string;
}

export const MathRowNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: MathRowConfig = data.config || {};
  const availableCols: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<MathRowConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const toggleColumn = useCallback((col: string) => {
    const current = config.columns ?? [];
    const next = current.includes(col) ? current.filter(c => c !== col) : [...current, col];
    updateConfig({ columns: next });
  }, [config.columns, updateConfig]);

  return (
    <BaseNode variant="math" className="min-w-[300px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <Rows3 className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Math (Row)</BaseNodeHeaderTitle>
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
          <Label className="text-xs text-muted-foreground">Aggregation</Label>
          <Select value={config.aggregation} onValueChange={v => updateConfig({ aggregation: v as RowAgg })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="min">Min</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Columns to aggregate</Label>
            {availableCols.length > 0 && (
              <div className="flex gap-1.5 nodrag">
                <button
                  onClick={() => updateConfig({ columns: [...availableCols] })}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[10px] text-muted-foreground">·</span>
                <button
                  onClick={() => updateConfig({ columns: [] })}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto border border-border/40 rounded-lg p-2 bg-muted/20">
            {availableCols.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Connect input first</span>
            ) : (
              availableCols.map(col => {
                const isSelected = (config.columns ?? []).includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className={`text-xs px-2 py-0.5 rounded-md border transition cursor-pointer nodrag ${
                      isSelected
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium'
                        : 'bg-background/80 text-muted-foreground border-border/40 hover:bg-muted'
                    }`}
                  >
                    {col}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Result column name</Label>
          <Input
            value={config.resultColumn ?? ''}
            onChange={e => updateConfig({ resultColumn: e.target.value })}
            placeholder="e.g. row_total"
            className="h-8 text-xs nodrag"
          />
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="math" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="math" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

MathRowNode.displayName = "MathRowNode";
