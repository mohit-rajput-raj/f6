'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { FileCode } from 'lucide-react';
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
    <BaseNode variant="math" className="min-w-[340px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <FileCode className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Formula</BaseNodeHeaderTitle>
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
        {columns.length > 0 && (
          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40 font-mono truncate">
            Columns: {columns.join(', ')}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Formula</Label>
          <Input
            value={config.formula ?? ''}
            onChange={e => updateConfig({ formula: e.target.value })}
            placeholder="e.g. col_A * 2 + col_B"
            className="h-8 font-mono text-xs nodrag"
          />
          <p className="text-[10px] text-muted-foreground">
            Use column names. Operators: + − * / ( )
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Result column name</Label>
          <Input
            value={config.resultColumn ?? ''}
            onChange={e => updateConfig({ resultColumn: e.target.value })}
            placeholder="e.g. calculated"
            className="h-8 text-xs nodrag"
          />
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows
          </div>
        )}

        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
            {data.error}
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="math" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="math" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

FormulaNode.displayName = "FormulaNode";
