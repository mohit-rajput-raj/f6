'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Label } from "@repo/ui/components/ui/label";

interface DropColumnConfig {
  columnsToDrop?: string[];
}

/**
 * DropColumnNode — removes specific columns from a dataset.
 * Input: a,b,c,d → drop 'a' → Output: b,c,d
 */
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-rose-700 text-white">
          <X className="size-4" />
          <BaseNodeHeaderTitle>Drop Columns</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Click columns to drop (red = will be removed)</Label>

            {availableColumns.length > 0 && (
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => updateConfig({ columnsToDrop: [...availableColumns] })}
                  className="text-[10px] px-2 py-0.5 rounded border bg-rose-100 dark:bg-rose-900 hover:bg-rose-200 dark:hover:bg-rose-800 transition"
                >
                  Drop All
                </button>
                <button
                  onClick={() => updateConfig({ columnsToDrop: [] })}
                  className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted transition"
                >
                  Keep All
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto border rounded p-2">
              {availableColumns.length === 0 && (
                <span className="text-xs text-muted-foreground">Connect input first</span>
              )}
              {availableColumns.map(col => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition ${
                    columnsToDrop.includes(col)
                      ? 'bg-rose-600 text-white border-rose-600 line-through'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {columnsToDrop.length > 0 && (
            <div className="text-[10px] text-muted-foreground border-t pt-2 space-y-0.5">
              <div>
                <span className="text-rose-500 font-medium">Dropping:</span>{' '}
                {columnsToDrop.join(', ')}
              </div>
              <div>
                <span className="text-emerald-500 font-medium">Keeping:</span>{' '}
                {remainingColumns.length > 0 ? remainingColumns.join(', ') : 'none'}
              </div>
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-rose-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {remainingColumns.length} columns remaining
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-rose-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-rose-600" />
      </BaseNode>
    </>
  );
});

DropColumnNode.displayName = "DropColumnNode";
