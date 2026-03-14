'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Filter as FilterIcon } from 'lucide-react';
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
import { NodeData } from '../input-nodes/test-nodes'; // adjust if needed

type FilterCondition =
  | 'text-exact' | 'text-contains' | 'text-starts' | 'text-ends'
  | 'number-eq' | 'number-gt' | 'number-gte' | 'number-lt' | 'number-lte';

interface FilterConfig {
  column?: string;
  condition?: FilterCondition;
  value?: string;
}

export const FilterNode = memo(({ id, data }: { id: string; data: NodeData & { config?: FilterConfig; result?: any; rowCount?: number; inputColumns?: string[] } }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config = data.config || { column: '', condition: 'text-exact' as FilterCondition, value: '' };

  const updateConfig = useCallback((updates: Partial<FilterConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  // Use columns from upstream node (set during execution or on connect)
  const availableColumns = data.inputColumns ?? [];

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-purple-800 text-white">
          <FilterIcon className="size-4" />
          <BaseNodeHeaderTitle>Filter</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Column</Label>
            <Select
              value={config.column}
              onValueChange={(v) => updateConfig({ column: v })}
              disabled={availableColumns.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={availableColumns.length === 0 ? "Connect upstream node first" : "Select column"} />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
                {availableColumns.length === 0 && (
                  <SelectItem value="" disabled>No columns yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Condition</Label>
            <Select
              value={config.condition}
              onValueChange={(v) => updateConfig({ condition: v as FilterCondition })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-exact">is exactly</SelectItem>
                <SelectItem value="text-contains">contains</SelectItem>
                <SelectItem value="text-starts">starts with</SelectItem>
                <SelectItem value="text-ends">ends with</SelectItem>
                <SelectItem value="number-eq">equals</SelectItem>
                <SelectItem value="number-gt">greater than</SelectItem>
                <SelectItem value="number-gte">≥</SelectItem>
                <SelectItem value="number-lt">less than</SelectItem>
                <SelectItem value="number-lte">≤</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <Input
              value={config.value ?? ''}
              onChange={e => updateConfig({ value: e.target.value })}
              placeholder="e.g. A or 42"
              className="h-9"
            />
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-emerald-600 font-medium text-center pt-3 border-t">
              {data.rowCount} rows after filter • {data.result?.columns?.length ?? '?'} cols
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-purple-600" />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-purple-600" />
      </BaseNode>
    </>
  );
});

FilterNode.displayName = "FilterNode";