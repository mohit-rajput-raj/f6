'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitFork, Plus, Trash2 } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Button } from "@repo/ui/components/ui/button";

interface SwitchCaseConfig {
  column?: string;
  cases?: string[];
}

const COLORS = [
  'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-lime-500', 'bg-orange-500', 'bg-teal-500',
];

/**
 * SwitchCaseNode — routes rows based on exact matches of a single column.
 * Number of outputs = number of cases + 1 (default).
 */
export const SwitchCaseNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SwitchCaseConfig = data.config || {};
  const cases = config.cases ?? ['Value 1'];
  const availableColumns: string[] = data.inputColumns ?? [];
  const selectedColumn = config.column || '';

  const updateConfig = useCallback((updates: Partial<SwitchCaseConfig>) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...(n.data.config || {}), ...updates } } } : n
      )
    );
  }, [id, setNodes]);

  const updateCase = useCallback((index: number, val: string) => {
    const newCases = [...cases];
    newCases[index] = val;
    updateConfig({ cases: newCases });
  }, [cases, updateConfig]);

  const addCase = useCallback(() => {
    updateConfig({ cases: [...cases, `Value ${cases.length + 1}`] });
  }, [cases, updateConfig]);

  const removeCase = useCallback((index: number) => {
    if (cases.length <= 1) return;
    updateConfig({ cases: cases.filter((_, i) => i !== index) });
  }, [cases, updateConfig]);

  // Compute output handle positions
  const totalOutputs = cases.length + 1; // +1 for default
  const getHandleTop = (index: number) => {
    return `${((index + 1) / (totalOutputs + 1)) * 100}%`;
  };

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white">
          <GitFork className="size-4" />
          <BaseNodeHeaderTitle>Switch Case</BaseNodeHeaderTitle>
          <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
            {totalOutputs} outputs
          </span>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Switch Column</Label>
            <Select value={selectedColumn} onValueChange={v => updateConfig({ column: v })} disabled={availableColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={availableColumns.length === 0 ? "Connect input first" : "Select column"} />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Cases (exact match)</Label>
            {cases.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${COLORS[i % COLORS.length]}`} />
                <Input
                  value={c}
                  onChange={e => updateCase(i, e.target.value)}
                  placeholder={`Case ${i + 1} value`}
                  className="h-7 text-xs flex-1"
                />
                {cases.length > 1 && (
                  <button onClick={() => removeCase(i)} className="text-muted-foreground hover:text-red-500 transition">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addCase}
              className="w-full h-7 text-xs mt-1"
            >
              <Plus className="size-3 mr-1" /> Add Case
            </Button>
          </div>

          {/* Default label */}
          <div className="flex items-center gap-2 px-2 py-1 border rounded-lg bg-gray-50 dark:bg-gray-900 mt-2">
            <div className="w-2 h-2 flex-shrink-0 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-muted-foreground">Default (no match)</span>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-sky-600 font-medium text-center pt-2 border-t mt-2">
              {data.rowCount} rows processed
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle */}
        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-sky-600" />

        {/* Dynamic output handles — one per case + default */}
        {cases.map((c, i) => (
          <Handle
            key={`out_${i}`}
            type="source"
            position={Position.Right}
            id={`out_${i}`}
            className={`w-3 h-3 ${COLORS[i % COLORS.length].replace('bg-', 'bg-')}`}
            style={{ top: getHandleTop(i) }}
          />
        ))}
        {/* Default handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="out_default"
          className="w-3 h-3 bg-gray-400"
          style={{ top: getHandleTop(cases.length) }}
        />
      </BaseNode>
    </>
  );
});

SwitchCaseNode.displayName = "SwitchCaseNode";
