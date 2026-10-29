'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Columns3 } from 'lucide-react';
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

interface SelectColumnsConfig {
  selectedColumns?: string[];
  mode?: 'keep' | 'drop';
}

export const SelectColumnsNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SelectColumnsConfig = data.config || { mode: 'keep' };
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<SelectColumnsConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const toggleColumn = useCallback((col: string) => {
    const current = config.selectedColumns ?? [];
    const next = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    updateConfig({ selectedColumns: next });
  }, [config.selectedColumns, updateConfig]);

  return (
    <BaseNode variant="transform" className="min-w-[280px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <Columns3 className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Select Columns</BaseNodeHeaderTitle>
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
        <div className="flex gap-1.5 p-0.5 rounded-lg bg-muted/50 border border-border/40">
          <button
            onClick={() => updateConfig({ mode: 'keep' })}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition cursor-pointer nodrag ${
              config.mode === 'keep' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Keep selected
          </button>
          <button
            onClick={() => updateConfig({ mode: 'drop' })}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition cursor-pointer nodrag ${
              config.mode === 'drop' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Drop selected
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Columns</Label>
            {columns.length > 0 && (
              <div className="flex gap-1.5 nodrag">
                <button
                  onClick={() => updateConfig({ selectedColumns: [...columns] })}
                  className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[10px] text-muted-foreground">·</span>
                <button
                  onClick={() => updateConfig({ selectedColumns: [] })}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto border border-border/40 rounded-lg p-2 bg-muted/20">
            {columns.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Connect input first</span>
            ) : (
              columns.map(col => {
                const isSelected = (config.selectedColumns ?? []).includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className={`text-xs px-2 py-0.5 rounded-md border transition cursor-pointer nodrag ${
                      isSelected
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 font-medium'
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
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

SelectColumnsNode.displayName = "SelectColumnsNode";
