'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Filter as FilterIcon } from 'lucide-react';
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
import { NodeData } from '@/types/types';

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
    <BaseNode variant="transform" className="min-w-[320px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <FilterIcon className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Filter</BaseNodeHeaderTitle>
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
          <Label className="text-xs text-muted-foreground">Column</Label>
          <Select
            value={config.column}
            onValueChange={(v) => updateConfig({ column: v })}
            disabled={availableColumns.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={availableColumns.length === 0 ? "Connect upstream node first" : "Select column"} />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Condition</Label>
          <Select
            value={config.condition}
            onValueChange={(v) => updateConfig({ condition: v as FilterCondition })}
          >
            <SelectTrigger className="h-8 text-xs">
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
          <Label className="text-xs text-muted-foreground">Value</Label>
          <Input
            value={config.value ?? ''}
            onChange={e => updateConfig({ value: e.target.value })}
            placeholder="e.g. A or 42"
            className="h-8 text-xs nodrag"
          />
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium text-center pt-2.5 border-t border-border/40">
            {data.rowCount} rows after filter • {data.result?.columns?.length ?? '?'} cols
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

FilterNode.displayName = "FilterNode";