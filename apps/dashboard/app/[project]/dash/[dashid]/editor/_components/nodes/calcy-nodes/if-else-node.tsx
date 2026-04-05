'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
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

/**
 * IfElseNode — routes rows to different outputs based on conditions.
 * Each condition gets its own output handle. Unmatched rows go to "else".
 * Number of outputs = number of conditions + 1 (else).
 */
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

  // Compute output handle positions
  const totalOutputs = rules.length + 1; // +1 for else
  const getHandleTop = (index: number) => {
    return `${((index + 1) / (totalOutputs + 1)) * 100}%`;
  };

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[340px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white">
          <GitBranch className="size-4" />
          <BaseNodeHeaderTitle>If / Else</BaseNodeHeaderTitle>
          <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
            {totalOutputs} outputs
          </span>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="border rounded-lg p-2 space-y-1.5 relative">
              {/* Color bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${COLORS[i % COLORS.length]}`} />

              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]}`} />
                  <Input
                    value={rule.label ?? `Condition ${i + 1}`}
                    onChange={e => updateRule(i, { label: e.target.value })}
                    className="h-6 text-[10px] font-semibold w-[120px] border-none p-0 bg-transparent"
                  />
                </div>
                {rules.length > 1 && (
                  <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-red-500 transition">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 pl-2">
                <Select value={rule.column || ''} onValueChange={v => updateRule(i, { column: v })} disabled={availableColumns.length === 0}>
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rule.condition || 'text-exact'} onValueChange={v => updateRule(i, { condition: v as ConditionOp })}>
                  <SelectTrigger className="h-7 text-[10px]">
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
                  className="h-7 text-[10px]"
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className="w-full h-7 text-xs"
          >
            <Plus className="size-3 mr-1" /> Add Condition
          </Button>

          {/* Else label */}
          <div className="flex items-center gap-1.5 px-2 py-1 border rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-[10px] font-semibold text-muted-foreground">Else (no match)</span>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-amber-600 font-medium text-center pt-1 border-t">
              {data.rowCount} rows processed
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle */}
        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-amber-600" />

        {/* Dynamic output handles — one per condition + else */}
        {rules.map((rule, i) => (
          <Handle
            key={`out_${i}`}
            type="source"
            position={Position.Right}
            id={`out_${i}`}
            className={`w-3 h-3 ${COLORS[i % COLORS.length].replace('bg-', 'bg-')}`}
            style={{ top: getHandleTop(i) }}
          />
        ))}
        {/* Else handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="out_else"
          className="w-3 h-3 bg-gray-400"
          style={{ top: getHandleTop(rules.length) }}
        />
      </BaseNode>
    </>
  );
});

IfElseNode.displayName = "IfElseNode";
