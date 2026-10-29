'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitFork, Plus, Trash2 } from 'lucide-react';
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

export const SwitchCaseNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SwitchCaseConfig = data.config || {};
  const selectedColumn = config.column || '';
  const cases = config.cases ?? ['Case 1'];
  const availableColumns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<SwitchCaseConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const addCase = useCallback(() => {
    updateConfig({ cases: [...cases, `Case ${cases.length + 1}`] });
  }, [cases, updateConfig]);

  const removeCase = useCallback((index: number) => {
    if (cases.length <= 1) return;
    updateConfig({ cases: cases.filter((_, i) => i !== index) });
  }, [cases, updateConfig]);

  const updateCase = useCallback((index: number, val: string) => {
    const next = [...cases];
    next[index] = val;
    updateConfig({ cases: next });
  }, [cases, updateConfig]);

  const totalOutputs = cases.length + 1; // +1 for default
  const getHandleTop = (index: number) => {
    return `${((index + 1) / (totalOutputs + 1)) * 100}%`;
  };

  return (
    <BaseNode variant="logic" className="min-w-[280px]">
      <BaseNodeHeader variant="logic">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="logic">
            <GitFork className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Switch Case</BaseNodeHeaderTitle>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
            {totalOutputs} outputs
          </span>
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
          <Label className="text-xs text-muted-foreground">Switch Column</Label>
          <Select value={selectedColumn} onValueChange={v => updateConfig({ column: v })} disabled={availableColumns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
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
          <Label className="text-xs text-muted-foreground">Cases (exact match)</Label>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
            {cases.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
                <Input
                  value={c}
                  onChange={e => updateCase(i, e.target.value)}
                  placeholder={`Case ${i + 1} value`}
                  className="h-7 text-xs flex-1 nodrag"
                />
                {cases.length > 1 && (
                  <button
                    onClick={() => removeCase(i)}
                    className="text-muted-foreground hover:text-destructive transition cursor-pointer nodrag"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addCase}
            className="w-full h-7 text-xs mt-1 nodrag"
          >
            <Plus className="size-3 mr-1" /> Add Case
          </Button>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 border border-border/40 rounded-lg bg-muted/30">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60 shrink-0" />
          <span className="text-[11px] font-medium text-muted-foreground">Default (no match)</span>
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows processed
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="logic" type="target" position={Position.Left} id="in" />

      {cases.map((c, i) => (
        <Handle
          key={`out_${i}`}
          type="source"
          position={Position.Right}
          id={`out_${i}`}
          className={`!w-3 !h-3 rounded-full !border-2 !border-background shadow-xs hover:!scale-130 transition-transform cursor-crosshair z-10 !${COLORS[i % COLORS.length]}`}
          style={{ top: getHandleTop(i) }}
        />
      ))}
      <Handle
        type="source"
        position={Position.Right}
        id="out_default"
        className="!w-3 !h-3 rounded-full !border-2 !border-background shadow-xs hover:!scale-130 transition-transform cursor-crosshair z-10 !bg-muted-foreground"
        style={{ top: getHandleTop(cases.length) }}
      />
    </BaseNode>
  );
});

SwitchCaseNode.displayName = "SwitchCaseNode";
