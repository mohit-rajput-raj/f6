'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ArrowLeftFromLine } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
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

export interface WorkflowOutputConfig {
  label?: string;
  dataType?: 'dataset' | 'text' | 'any';
  description?: string;
}

interface WorkflowOutputData {
  title?: string;
  config?: WorkflowOutputConfig;
  result?: any;
  rowCount?: number;
  error?: string;
}

export const WorkflowOutputNode = memo(({ id, data }: { id: string; data: WorkflowOutputData }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: WorkflowOutputConfig = data.config || {};

  const updateConfig = useCallback((updates: Partial<WorkflowOutputConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-md">
          <ArrowLeftFromLine className="size-4" />
          <BaseNodeHeaderTitle className="text-white">
            {config.label || 'Workflow Output'}
          </BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            📤 Output
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* Label */}
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={config.label ?? ''}
              onChange={e => updateConfig({ label: e.target.value })}
              placeholder="e.g. Processed Attendance"
              className="h-8 text-sm nodrag"
            />
          </div>

          {/* Data Type */}
          <div className="space-y-1">
            <Label className="text-xs">Data Type</Label>
            <Select
              value={config.dataType ?? 'dataset'}
              onValueChange={v => updateConfig({ dataType: v as WorkflowOutputConfig['dataType'] })}
            >
              <SelectTrigger className="h-8 text-sm nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dataset">Dataset (columns + rows)</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={config.description ?? ''}
              onChange={e => updateConfig({ description: e.target.value })}
              placeholder="What kind of data does this output produce?"
              className="text-sm min-h-[50px] nodrag"
              rows={2}
            />
          </div>

          {/* Status */}
          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              ⚠ {data.error}
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-amber-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows output
            </div>
          )}
        </BaseNodeContent>

        {/* Only TARGET handle — data flows IN from the internal workflow */}
        <Handle
          type="target"
          position={Position.Left}
          id={`wf-output-${id}`}
          className="w-3 h-3 bg-amber-500"
        />
      </BaseNode>
    </>
  );
});

WorkflowOutputNode.displayName = "WorkflowOutputNode";
