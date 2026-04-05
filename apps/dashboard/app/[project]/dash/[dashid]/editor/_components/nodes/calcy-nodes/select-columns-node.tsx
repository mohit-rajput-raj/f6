'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Columns3 } from 'lucide-react';
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-fuchsia-700 text-white">
          <Columns3 className="size-4" />
          <BaseNodeHeaderTitle>Select Columns</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => updateConfig({ mode: 'keep' })}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                config.mode === 'keep' ? 'bg-fuchsia-600 text-white' : 'bg-background hover:bg-muted'
              }`}
            >
              Keep selected
            </button>
            <button
              onClick={() => updateConfig({ mode: 'drop' })}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                config.mode === 'drop' ? 'bg-fuchsia-600 text-white' : 'bg-background hover:bg-muted'
              }`}
            >
              Drop selected
            </button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Columns</Label>
            {columns.length > 0 && (
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => updateConfig({ selectedColumns: [...columns] })}
                  className="text-[10px] px-2 py-0.5 rounded border bg-fuchsia-100 dark:bg-fuchsia-900 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800 transition"
                >
                  Select All
                </button>
                <button
                  onClick={() => updateConfig({ selectedColumns: [] })}
                  className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted transition"
                >
                  Deselect All
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto border rounded p-2">
              {columns.length === 0 && (
                <span className="text-xs text-muted-foreground">Connect input first</span>
              )}
              {columns.map(col => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition ${
                    (config.selectedColumns ?? []).includes(col)
                      ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-fuchsia-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-fuchsia-600" />
      </BaseNode>
    </>
  );
});

SelectColumnsNode.displayName = "SelectColumnsNode";
