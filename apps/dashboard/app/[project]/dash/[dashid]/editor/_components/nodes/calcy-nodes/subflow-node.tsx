'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Workflow, Settings2 } from 'lucide-react';
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
import { Badge } from "@repo/ui/components/ui/badge";

interface SubflowConfig {
  publishedWorkflowId?: string;
  blockCode?: string;
}

interface SubflowData {
  title?: string;
  description?: string;
  config?: SubflowConfig;
  result?: any;
  rowCount?: number;
  inputColumns?: string[];
  // Stored from the published workflow
  publishedName?: string;
  publishedIcon?: string;
  publishedDefinition?: any;
  inputSchema?: Array<{ nodeId: string; type: string; title: string }>;
  outputSchema?: Array<{ nodeId: string; type: string; title: string }>;
  error?: string;
}

export const SubflowNode = memo(({ id, data }: { id: string; data: SubflowData }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config = data.config || {};
  const inputSchema = data.inputSchema ?? [];
  const outputSchema = data.outputSchema ?? [];

  const updateConfig = useCallback((updates: Partial<SubflowConfig>) => {
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
        {/* Gradient header for subflow look */}
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-md">
          <span className="text-lg">{data.publishedIcon || '⚡'}</span>
          <BaseNodeHeaderTitle className="text-white">
            {data.publishedName || data.title || 'Subflow'}
          </BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            Workflow
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* Input/Output info */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>📥 {inputSchema.length} input{inputSchema.length !== 1 ? 's' : ''}</span>
            <span>📤 {outputSchema.length} output{outputSchema.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Block code setting for sheet-based workflows */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Settings2 className="size-3" />
              Block / Subject Code
            </Label>
            <Input
              value={config.blockCode ?? ''}
              onChange={e => updateConfig({ blockCode: e.target.value })}
              placeholder="e.g. CS101"
              className="h-8 text-sm nodrag"
            />
            <p className="text-[10px] text-muted-foreground">
              Used to prefix columns when pushing to a main sheet
            </p>
          </div>

          {/* Status */}
          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              ⚠ {data.error}
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-emerald-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows output • {data.result?.columns?.length ?? '?'} cols
            </div>
          )}
        </BaseNodeContent>

        {/* Dynamic input handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3 h-3 bg-indigo-500"
        />

        {/* Dynamic output handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-purple-500"
        />
      </BaseNode>
    </>
  );
});

SubflowNode.displayName = "SubflowNode";
