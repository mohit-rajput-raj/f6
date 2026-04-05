'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { LayoutPanelLeft } from 'lucide-react';
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
import { Label } from "@repo/ui/components/ui/label";
import { Input } from "@repo/ui/components/ui/input";

interface SheetMergeConfig {
  keyColumn?: string;
  leftPrefix?: string;
  rightPrefix?: string;
}

export const SheetMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: SheetMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];
  const allColumns = [...new Set([...leftColumns, ...rightColumns])];

  const updateConfig = useCallback((updates: Partial<SheetMergeConfig>) => {
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

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-sky-700 text-white">
          <LayoutPanelLeft className="size-4" />
          <BaseNodeHeaderTitle>Sheet Merge</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-sky-50 dark:bg-sky-950 p-2 rounded">
            Merge two datasets side-by-side, prefixing columns with subject/category names.
            Like building a multi-subject attendance sheet.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Match Key Column</Label>
            <Select value={config.keyColumn} onValueChange={v => updateConfig({ keyColumn: v })} disabled={allColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={allColumns.length === 0 ? "Connect inputs" : "Select key (e.g. Enrollment)"} />
              </SelectTrigger>
              <SelectContent>
                {allColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Left Prefix (e.g. "CO24553:")</Label>
            <Input
              value={config.leftPrefix ?? ''}
              onChange={e => updateConfig({ leftPrefix: e.target.value })}
              placeholder="e.g. Discrete_"
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Right Prefix (e.g. "CO24804:")</Label>
            <Input
              value={config.rightPrefix ?? ''}
              onChange={e => updateConfig({ rightPrefix: e.target.value })}
              placeholder="e.g. MobileApp_"
              className="h-8"
            />
          </div>

          {leftColumns.length > 0 && (
            <div className="text-[10px] text-sky-600 border-t pt-1">
              <span className="font-semibold">Left:</span> {leftColumns.join(', ')}
            </div>
          )}
          {rightColumns.length > 0 && (
            <div className="text-[10px] text-sky-500">
              <span className="font-semibold">Right:</span> {rightColumns.join(', ')}
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-sky-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows merged
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-sky-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-sky-400" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-sky-600" />
      </BaseNode>
    </>
  );
});

SheetMergeNode.displayName = "SheetMergeNode";
