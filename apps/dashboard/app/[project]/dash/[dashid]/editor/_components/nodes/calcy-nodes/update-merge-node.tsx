'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { RefreshCcw } from 'lucide-react';
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

type UpdateMode = 'add' | 'replace' | 'max' | 'concat';

interface UpdateMergeConfig {
  keyColumn?: string;
  updateMode?: UpdateMode;
  targetColumns?: string[];
}

export const UpdateMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: UpdateMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];
  const allColumns = [...new Set([...leftColumns, ...rightColumns])];

  const updateConfig = useCallback((updates: Partial<UpdateMergeConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const toggleTarget = useCallback((col: string) => {
    const current = config.targetColumns ?? [];
    const next = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    updateConfig({ targetColumns: next });
  }, [config.targetColumns, updateConfig]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-amber-700 text-white">
          <RefreshCcw className="size-4" />
          <BaseNodeHeaderTitle>Update Merge</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-amber-50 dark:bg-amber-950 p-2 rounded">
            Accumulates data from "New" input into "Existing" by matching key rows.
            E.g., attendance dates 1-10 + dates 11-20 → totals add up.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Match Key Column</Label>
            <Select value={config.keyColumn} onValueChange={v => updateConfig({ keyColumn: v })} disabled={allColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={allColumns.length === 0 ? "Connect inputs" : "Select key"} />
              </SelectTrigger>
              <SelectContent>
                {allColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Update Mode</Label>
            <Select value={config.updateMode ?? 'add'} onValueChange={v => updateConfig({ updateMode: v as UpdateMode })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add (col = old + new)</SelectItem>
                <SelectItem value="replace">Replace (col = new)</SelectItem>
                <SelectItem value="max">Max (col = max(old, new))</SelectItem>
                <SelectItem value="concat">Concat (col = old + new text)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Columns to Update</Label>
            {allColumns.length > 0 && (
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => updateConfig({ targetColumns: [...allColumns] })}
                  className="text-[10px] px-2 py-0.5 rounded border bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 transition"
                >
                  Select All
                </button>
                <button
                  onClick={() => updateConfig({ targetColumns: [] })}
                  className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted transition"
                >
                  Deselect All
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto border rounded p-2">
              {allColumns.length === 0 && (
                <span className="text-xs text-muted-foreground">Connect inputs first</span>
              )}
              {allColumns.map(col => (
                <button
                  key={col}
                  onClick={() => toggleTarget(col)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition ${
                    (config.targetColumns ?? []).includes(col)
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-amber-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows after update
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-amber-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-amber-400" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-amber-600" />
      </BaseNode>
    </>
  );
});

UpdateMergeNode.displayName = "UpdateMergeNode";
