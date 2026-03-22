'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Calculator } from 'lucide-react';
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

type MathOp = 'add' | 'subtract' | 'multiply' | 'divide';

interface MathColumnConfig {
  column?: string;
  operation?: MathOp;
  value?: string;
  sourceColumn?: string; // optional: use another column instead of a constant
  resultColumn?: string; // name for the result column
}

export const MathColumnNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: MathColumnConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<MathColumnConfig>) => {
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
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-blue-700 text-white">
          <Calculator className="size-4" />
          <BaseNodeHeaderTitle>Math (Column)</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Column</Label>
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
            <Label className="text-xs">Operation</Label>
            <Select value={config.operation} onValueChange={v => updateConfig({ operation: v as MathOp })}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">+ Add</SelectItem>
                <SelectItem value="subtract">− Subtract</SelectItem>
                <SelectItem value="multiply">× Multiply</SelectItem>
                <SelectItem value="divide">÷ Divide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Value (constant)</Label>
            <Input
              value={config.value ?? ''}
              onChange={e => updateConfig({ value: e.target.value })}
              placeholder="e.g. 10"
              className="h-8"
              type="number"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Or use column</Label>
            <Select value={config.sourceColumn} onValueChange={v => updateConfig({ sourceColumn: v })} disabled={columns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="(optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">(use constant value)</SelectItem>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Result column name</Label>
            <Input
              value={config.resultColumn ?? ''}
              onChange={e => updateConfig({ resultColumn: e.target.value })}
              placeholder="e.g. result"
              className="h-8"
            />
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-blue-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {data.result?.columns?.length ?? '?'} cols
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-blue-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-blue-600" />
      </BaseNode>
    </>
  );
});

MathColumnNode.displayName = "MathColumnNode";
