'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ArrowRightFromLine } from 'lucide-react';
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

export interface WorkflowInputConfig {
  label?: string;
  dataType?: 'dataset' | 'text' | 'any';
  description?: string;
  requiredColumns?: string; // comma-separated
}

interface WorkflowInputData {
  title?: string;
  config?: WorkflowInputConfig;
  result?: any;
  rowCount?: number;
  error?: string;
}

export const WorkflowInputNode = memo(({ id, data }: { id: string; data: WorkflowInputData }) => {
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-md">
          <ArrowRightFromLine className="size-4" />
          <BaseNodeHeaderTitle className="text-white">
            {config.label || 'Workflow Input'}
          </BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            📥 Input
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* Label */}
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={config.label ?? ''}
              onChange={e => updateConfig({ label: e.target.value })}
              placeholder="e.g. Student Attendance CSV"
              className="h-8 text-sm nodrag"
            />
          </div>

          {/* Data Type */}
          <div className="space-y-1">
            <Label className="text-xs">Data Type</Label>
            <Select
              value={config.dataType ?? 'dataset'}
              onValueChange={v => updateConfig({ dataType: v as WorkflowInputConfig['dataType'] })}
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
              placeholder="What data does this input expect?"
              className="text-sm min-h-[50px] nodrag"
              rows={2}
            />
          </div>

          {/* Required Columns */}
          {(config.dataType === 'dataset' || !config.dataType) && (
            <div className="space-y-1">
              <Label className="text-xs">Required Columns (comma-separated)</Label>
              <Input
                value={config.requiredColumns ?? ''}
                onChange={e => updateConfig({ requiredColumns: e.target.value })}
                placeholder="e.g. Name, RollNo, Marks"
                className="h-8 text-sm nodrag"
              />
            </div>
          )}

          {/* Status */}
          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              ⚠ {data.error}
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-emerald-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows received
            </div>
          )}
        </BaseNodeContent>

        {/* Only SOURCE handle — data flows OUT to the internal workflow */}
        <Handle
          type="source"
          position={Position.Right}
          id={`wf-input-${id}`}
          className="w-3 h-3 bg-emerald-500"
        />
      </BaseNode>
    </>
  );
});

WorkflowInputNode.displayName = "WorkflowInputNode";
