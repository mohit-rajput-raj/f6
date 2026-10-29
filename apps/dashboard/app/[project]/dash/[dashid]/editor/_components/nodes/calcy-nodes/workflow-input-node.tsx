'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { ArrowRightFromLine } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Badge } from "@repo/ui/components/ui/badge";

export interface WorkflowInputConfig {
  label?: string;
  dataType?: 'dataset' | 'text' | 'any';
  description?: string;
}

export const WorkflowInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: WorkflowInputConfig = data.config || {};

  const updateConfig = useCallback((updates: Partial<WorkflowInputConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="input" className="min-w-[280px]">
      <BaseNodeHeader variant="input">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="input">
            <ArrowRightFromLine className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>
            {config.label || 'Workflow Input'}
          </BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-sky-500/30 text-sky-700 dark:text-sky-300">
            Input
          </Badge>
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
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            value={config.label ?? ''}
            onChange={e => updateConfig({ label: e.target.value })}
            placeholder="e.g. Student Attendance CSV"
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data Type</Label>
          <Select
            value={config.dataType ?? 'dataset'}
            onValueChange={v => updateConfig({ dataType: v as WorkflowInputConfig['dataType'] })}
          >
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dataset">Dataset (columns + rows)</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="any">Any</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description (optional)</Label>
          <Textarea
            value={config.description ?? ''}
            onChange={e => updateConfig({ description: e.target.value })}
            placeholder="Help text for when this workflow is used as a subflow..."
            className="h-16 text-xs resize-none nodrag"
          />
        </div>

        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
            ⚠ {data.error}
          </div>
        )}

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows received
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle
        variant="input"
        type="source"
        position={Position.Right}
        id={`wf-input-${id}`}
      />
    </BaseNode>
  );
});

WorkflowInputNode.displayName = "WorkflowInputNode";
