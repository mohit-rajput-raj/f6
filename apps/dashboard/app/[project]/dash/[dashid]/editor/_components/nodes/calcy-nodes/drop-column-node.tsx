'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
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

interface DropColumnConfig {
  columnsToDrop?: string[];
}

export const DropColumnNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: DropColumnConfig = data.config || {};
  const availableColumns: string[] = data.inputColumns ?? [];
  const columnsToDrop = config.columnsToDrop ?? [];

  const updateConfig = useCallback((updates: Partial<DropColumnConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const toggleColumn = useCallback((col: string) => {
    const current = columnsToDrop;
    const next = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    updateConfig({ columnsToDrop: next });
  }, [columnsToDrop, updateConfig]);

  const remainingColumns = availableColumns.filter(c => !columnsToDrop.includes(c));

  return (
    <BaseNode variant="transform" className="min-w-[280px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <X className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Drop Columns</BaseNodeHeaderTitle>
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
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Click columns to drop</Label>
            {availableColumns.length > 0 && (
              <div className="flex gap-1.5 nodrag">
                <button
                  onClick={() => updateConfig({ columnsToDrop: [...availableColumns] })}
                  className="text-[10px] text-destructive hover:underline cursor-pointer"
                >
                  Drop All
                </button>
                <span className="text-[10px] text-muted-foreground">·</span>
                <button
                  onClick={() => updateConfig({ columnsToDrop: [] })}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto border border-border/40 rounded-lg p-2 bg-muted/20">
            {availableColumns.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Connect input first</span>
            ) : (
              availableColumns.map(col => {
                const isDropped = columnsToDrop.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className={`text-xs px-2 py-0.5 rounded-md border transition cursor-pointer nodrag ${
                      isDropped
                        ? 'bg-destructive/15 text-destructive border-destructive/30 line-through font-medium'
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

        {columnsToDrop.length > 0 && (
          <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-2 space-y-0.5">
            <div>
              <span className="text-destructive font-medium">Dropping:</span>{' '}
              {columnsToDrop.join(', ')}
            </div>
            <div>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Keeping:</span>{' '}
              {remainingColumns.length > 0 ? remainingColumns.join(', ') : 'none'}
            </div>
          </div>
        )}

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-muted-foreground font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows • {remainingColumns.length} columns remaining
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

DropColumnNode.displayName = "DropColumnNode";
