'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
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

interface RenameConfig {
  oldName?: string;
  newName?: string;
}

export const RenameColumnNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: RenameConfig = data.config || {};
  const columns: string[] = data.inputColumns ?? [];

  const updateConfig = useCallback((updates: Partial<RenameConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="transform" className="min-w-[280px]">
      <BaseNodeHeader variant="transform">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="transform">
            <Type className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Rename Column</BaseNodeHeaderTitle>
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
          <Label className="text-xs text-muted-foreground">Column to rename</Label>
          <Select value={config.oldName} onValueChange={v => updateConfig({ oldName: v })} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={columns.length === 0 ? "Connect input first" : "Select column"} />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">New name</Label>
          <Input
            value={config.newName ?? ''}
            onChange={e => updateConfig({ newName: e.target.value })}
            placeholder="e.g. student_name"
            className="h-8 text-xs nodrag"
          />
        </div>
      </BaseNodeContent>

      <NodeHandle variant="transform" type="target" position={Position.Left} id="in" />
      <NodeHandle variant="transform" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

RenameColumnNode.displayName = "RenameColumnNode";
