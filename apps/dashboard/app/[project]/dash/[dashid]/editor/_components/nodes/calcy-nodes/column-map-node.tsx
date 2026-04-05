'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[340px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-rose-700 text-white">
          <ArrowRightLeft className="size-4" />
          <BaseNodeHeaderTitle>Column Map</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-rose-50 dark:bg-rose-950 p-2 rounded">
            Rename / map columns. Useful when merging data with different column names.
          </p>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs nodrag"
              onClick={autoMapAll}
              disabled={columns.length === 0}
            >
              Auto-map all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs nodrag"
              onClick={addMapping}
              disabled={columns.length === 0}
            >
              + Add mapping
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {mappings.length === 0 && (
              <span className="text-xs text-muted-foreground">No mappings configured</span>
            )}
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-1">
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
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  value={m.target}
                  onChange={e => updateMapping(i, 'target', e.target.value)}
                  className="h-7 text-xs flex-1 nodrag"
                  placeholder="New name"
                />
                <button
                  onClick={() => removeMapping(i)}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-rose-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows, {mappings.length} columns mapped
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-rose-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-rose-600" />
      </BaseNode>
    </>
  );
});

ColumnMapNode.displayName = "ColumnMapNode";
