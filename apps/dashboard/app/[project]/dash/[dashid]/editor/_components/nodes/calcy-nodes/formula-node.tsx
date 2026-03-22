'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileCode } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

interface FormulaConfig {
  formula?: string; // e.g. "col_A * 2 + col_B"
  resultColumn?: string;
}

export const FormulaNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: FormulaConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<FormulaConfig>) => {
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

      <BaseNode className="min-w-[340px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-rose-700 text-white">
          <FileCode className="size-4" />
          <BaseNodeHeaderTitle>Formula</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          {columns.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Available: {columns.join(', ')}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Formula</Label>
            <Input
              value={config.formula ?? ''}
              onChange={e => updateConfig({ formula: e.target.value })}
              placeholder="e.g. col_A * 2 + col_B"
              className="h-8 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Use column names. Operators: + − * / ( )
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Result column name</Label>
            <Input
              value={config.resultColumn ?? ''}
              onChange={e => updateConfig({ resultColumn: e.target.value })}
              placeholder="e.g. calculated"
              className="h-8"
            />
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-rose-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows
            </div>
          )}

          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
              {data.error}
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-rose-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-rose-600" />
      </BaseNode>
    </>
  );
});

FormulaNode.displayName = "FormulaNode";
