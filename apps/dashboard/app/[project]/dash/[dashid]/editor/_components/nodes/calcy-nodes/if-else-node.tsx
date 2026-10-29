'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
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

type ConditionOp =
  | 'text-exact' | 'text-contains' | 'text-starts' | 'text-ends'
  | 'number-eq' | 'number-gt' | 'number-gte' | 'number-lt' | 'number-lte';

interface ConditionRule {
  column?: string;
  condition?: ConditionOp;
  value?: string;
  label?: string;
}

interface IfElseConfig {
  rules?: ConditionRule[];
}

const COLORS = [
  'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-lime-500', 'bg-orange-500', 'bg-teal-500',
];

export const IfElseNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: IfElseConfig = data.config || {};
  const rules = config.rules ?? [{ column: '', condition: 'text-exact' as ConditionOp, value: '', label: 'Condition 1' }];
  const availableColumns: string[] = data.inputColumns ?? [];

  const updateRules = useCallback((newRules: ConditionRule[]) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...(n.data.config || {}), rules: newRules } } } : n
      )
    );
  }, [id, setNodes]);

  const updateRule = useCallback((index: number, updates: Partial<ConditionRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    updateRules(newRules);
  }, [rules, updateRules]);

  const addRule = useCallback(() => {
    updateRules([...rules, { column: '', condition: 'text-exact', value: '', label: `Condition ${rules.length + 1}` }]);
  }, [rules, updateRules]);

  const removeRule = useCallback((index: number) => {
    if (rules.length <= 1) return;
    updateRules(rules.filter((_, i) => i !== index));
  }, [rules, updateRules]);

  const totalOutputs = rules.length + 1; // +1 for else
  const getHandleTop = (index: number) => {
    return `${((index + 1) / (totalOutputs + 1)) * 100}%`;
  };

  return (
    <BaseNode variant="logic" className="min-w-[340px]">
      <BaseNodeHeader variant="logic">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="logic">
            <GitBranch className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>If / Else</BaseNodeHeaderTitle>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
            {totalOutputs} routes
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

      <BaseNodeContent className="p-3.5 space-y-2.5">
        {rules.map((rule, i) => (
          <div key={i} className="border border-border/40 rounded-xl p-2.5 space-y-2 relative bg-card/60">
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${COLORS[i % COLORS.length]}`} />

            <div className="flex items-center justify-between pl-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]}`} />
                <Input
                  value={rule.label ?? `Condition ${i + 1}`}
                  onChange={e => updateRule(i, { label: e.target.value })}
                  className="h-6 text-xs font-semibold w-[130px] border-none p-0 bg-transparent nodrag focus-visible:ring-0"
                />
              </div>
              {rules.length > 1 && (
                <button
                  onClick={() => removeRule(i)}
                  className="text-muted-foreground hover:text-destructive transition cursor-pointer nodrag"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pl-2">
              <Select value={rule.column || ''} onValueChange={v => updateRule(i, { column: v })} disabled={availableColumns.length === 0}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map(col => (
                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={rule.condition || 'text-exact'} onValueChange={v => updateRule(i, { condition: v as ConditionOp })}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-exact" className="text-xs">= exactly</SelectItem>
                  <SelectItem value="text-contains" className="text-xs">contains</SelectItem>
                  <SelectItem value="text-starts" className="text-xs">starts with</SelectItem>
                  <SelectItem value="text-ends" className="text-xs">ends with</SelectItem>
                  <SelectItem value="number-eq" className="text-xs">== (num)</SelectItem>
                  <SelectItem value="number-gt" className="text-xs">&gt;</SelectItem>
                  <SelectItem value="number-gte" className="text-xs">≥</SelectItem>
                  <SelectItem value="number-lt" className="text-xs">&lt;</SelectItem>
                  <SelectItem value="number-lte" className="text-xs">≤</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={rule.value ?? ''}
                onChange={e => updateRule(i, { value: e.target.value })}
                placeholder="Value"
                className="h-7 text-[11px] nodrag"
              />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addRule}
          className="w-full h-7 text-xs nodrag"
        >
          <Plus className="size-3 mr-1" /> Add Condition
        </Button>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border/40 rounded-lg bg-muted/30">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span className="text-[11px] font-medium text-muted-foreground">Else (unmatched rows)</span>
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium text-center pt-1 border-t border-border/40">
            {data.rowCount} rows processed
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="logic" type="target" position={Position.Left} id="in" />

      {rules.map((rule, i) => (
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
        id="out_else"
        className="!w-3 !h-3 rounded-full !border-2 !border-background shadow-xs hover:!scale-130 transition-transform cursor-crosshair z-10 !bg-muted-foreground"
        style={{ top: getHandleTop(rules.length) }}
      />
    </BaseNode>
  );
});

IfElseNode.displayName = "IfElseNode";
