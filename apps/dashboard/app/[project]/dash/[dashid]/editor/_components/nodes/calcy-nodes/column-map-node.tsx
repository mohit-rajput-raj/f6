'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { ArrowRightLeft, Plus } from 'lucide-react';
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
import { Button } from "@repo/ui/components/ui/button";

interface ColumnMapping {
  source: string;
  target: string;
}

interface ColumnMapConfig {
  mappings?: ColumnMapping[];
}

export const ColumnMapNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: ColumnMapConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];
  const mappings: ColumnMapping[] = config.mappings ?? [];

  const updateConfig = useCallback((updates: Partial<ColumnMapConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const addMapping = useCallback(() => {
    const firstUnmapped = columns.find(c => !mappings.some(m => m.source === c));
    if (!firstUnmapped) return;
    updateConfig({ mappings: [...mappings, { source: firstUnmapped, target: firstUnmapped }] });
  }, [columns, mappings, updateConfig]);

  const removeMapping = useCallback((index: number) => {
    const next = mappings.filter((_, i) => i !== index);
    updateConfig({ mappings: next });
  }, [mappings, updateConfig]);

  const updateMapping = useCallback((index: number, field: 'source' | 'target', value: string) => {
    const next = mappings.map((m, i) => i === index ? { ...m, [field]: value } : m);
    updateConfig({ mappings: next });
  }, [mappings, updateConfig]);

  const autoMapAll = useCallback(() => {
    const auto = columns.map(c => ({ source: c, target: c }));
    updateConfig({ mappings: auto });
  }, [columns, updateConfig]);

  return (
    <BaseNode variant="transform" className="min-w-[340px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <ArrowRightLeft className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Column Map</BaseNodeHeaderTitle>
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
          Rename or remap columns before joining or exporting.
        </p>

        <div className="flex gap-2 nodrag">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 nodrag"
            onClick={autoMapAll}
            disabled={columns.length === 0}
          >
            Auto-map all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 nodrag flex items-center gap-1"
            onClick={addMapping}
            disabled={columns.length === 0}
          >
            <Plus className="size-3" /> Add mapping
          </Button>
        </div>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {mappings.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No mappings configured</span>
          )}
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <Select value={m.source} onValueChange={v => updateMapping(i, 'source', v)}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                value={m.target}
                onChange={e => updateMapping(i, 'target', e.target.value)}
                placeholder="new name"
                className="h-7 text-xs flex-1 nodrag"
              />
              <button
                onClick={() => removeMapping(i)}
                className="text-muted-foreground hover:text-destructive text-sm px-1 cursor-pointer nodrag"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-violet-600 dark:text-violet-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows, {mappings.length} columns mapped
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

ColumnMapNode.displayName = "ColumnMapNode";
