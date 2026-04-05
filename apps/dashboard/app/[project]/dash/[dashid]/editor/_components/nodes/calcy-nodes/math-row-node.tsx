'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Rows3 } from 'lucide-react';
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
    const next = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    updateConfig({ columns: next });
  }, [config.columns, updateConfig]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[300px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-teal-700 text-white">
          <Rows3 className="size-4" />
          <BaseNodeHeaderTitle>Math (Row)</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Aggregation</Label>
            <Select value={config.aggregation} onValueChange={v => updateConfig({ aggregation: v as RowAgg })}>
              <SelectTrigger className="h-8">
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

          <div className="space-y-1">
            <Label className="text-xs">Columns to aggregate</Label>
            {availableCols.length > 0 && (
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => updateConfig({ columns: [...availableCols] })}
                  className="text-[10px] px-2 py-0.5 rounded border bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800 transition"
                >
                  Select All
                </button>
                <button
                  onClick={() => updateConfig({ columns: [] })}
                  className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted transition"
                >
                  Deselect All
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto border rounded p-2">
              {availableCols.length === 0 && (
                <span className="text-xs text-muted-foreground">Connect input first</span>
              )}
              {availableCols.map(col => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition ${
                    (config.columns ?? []).includes(col)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Result column name</Label>
            <Input
              value={config.resultColumn ?? ''}
              onChange={e => updateConfig({ resultColumn: e.target.value })}
              placeholder="e.g. row_total"
              className="h-8"
            />
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-teal-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-teal-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-teal-600" />
      </BaseNode>
    </>
  );
});

MathRowNode.displayName = "MathRowNode";
