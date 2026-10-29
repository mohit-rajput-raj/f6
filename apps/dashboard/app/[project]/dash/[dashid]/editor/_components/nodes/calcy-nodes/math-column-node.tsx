'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Calculator } from 'lucide-react';
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

type MathOp = 'add' | 'subtract' | 'multiply' | 'divide';

interface MathColumnConfig {
  column?: string;
  operation?: MathOp;
  value?: string;
  sourceColumn?: string;
  resultColumn?: string;
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
    <BaseNode variant="math" className="min-w-[320px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <Calculator className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Math (Column)</BaseNodeHeaderTitle>
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
          <Label className="text-xs text-muted-foreground">Target column</Label>
          <Select value={config.column} onValueChange={v => updateConfig({ column: v })} disabled={columns.length === 0}>
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
          <Label className="text-xs text-muted-foreground">Operation</Label>
          <Select value={config.operation} onValueChange={v => updateConfig({ operation: v as MathOp })}>
            <SelectTrigger className="h-8 text-xs">
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Value (constant)</Label>
          <Input
            value={config.value ?? ''}
            onChange={e => updateConfig({ value: e.target.value })}
            placeholder="e.g. 10"
            className="h-8 text-xs nodrag"
            type="number"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Or second column</Label>
          <Select value={config.sourceColumn} onValueChange={v => updateConfig({ sourceColumn: v })} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Result column name</Label>
          <Input
            value={config.resultColumn ?? ''}
            onChange={e => updateConfig({ resultColumn: e.target.value })}
            placeholder="e.g. result"
            className="h-8 text-xs nodrag"
          />
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows • {data.result?.columns?.length ?? '?'} cols
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="math" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="math" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

MathColumnNode.displayName = "MathColumnNode";
