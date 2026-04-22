'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { LayoutPanelTop } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select";

const MAX_BLOCKS = 8;

interface BlockConcatConfig {
  sheetName?: string;
  keyColumn?: string;
}

export const BlockConcatNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const config: BlockConcatConfig = data.config || {};

  const baseColumns: string[] = data.baseColumns ?? [];
  const blockCount: number = data.connectedBlocks ?? 0;
  const allColumns: string[] = data.result?.columns ?? [];
  const resolvedSheetName = data.resolvedSheetName || config.sheetName || '';

  const updateConfig = useCallback((updates: Partial<BlockConcatConfig>) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...config, ...updates } } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[340px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-t-md">
          <LayoutPanelTop className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Block Concat</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            {blockCount} blocks
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-violet-50 dark:bg-violet-950 p-2 rounded leading-relaxed">
            Joins base data (Enrollment, Name) with subject blocks side-by-side.
            Connect base → top handle, blocks → numbered handles, sheet name → name handle.
          </p>

          {/* Resolved Master Sheet Name indicator */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${resolvedSheetName ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] text-muted-foreground">
                Master Sheet: <span className="font-semibold text-foreground">{resolvedSheetName || 'Connect or type →'}</span>
              </span>
            </div>
          </div>

          {/* Sheet Name (manual fallback) */}
          {!data.resolvedSheetName && (
            <div className="space-y-1">
              <Label className="text-xs">Sheet Name (manual)</Label>
              <Input
                value={config.sheetName ?? ''}
                onChange={e => updateConfig({ sheetName: e.target.value })}
                placeholder="e.g. Attendance Master"
                className="h-8 text-sm nodrag"
              />
            </div>
          )}

          {/* Key Column */}
          <div className="space-y-1">
            <Label className="text-xs">Key Column (match rows)</Label>
            <Select
              value={config.keyColumn}
              onValueChange={v => updateConfig({ keyColumn: v })}
              disabled={baseColumns.length === 0}
            >
              <SelectTrigger className="h-8 nodrag">
                <SelectValue placeholder={baseColumns.length === 0 ? "Connect base input" : "Select key"} />
              </SelectTrigger>
              <SelectContent>
                {baseColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Connected blocks info */}
          {blockCount > 0 && (
            <div className="text-[10px] text-violet-600 dark:text-violet-400 border-t pt-2 space-y-1">
              <div className="font-semibold">{blockCount} block(s) connected</div>
              {allColumns.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {allColumns.slice(0, 12).map((col, i) => (
                    <span key={i} className="px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-[9px]">
                      {col}
                    </span>
                  ))}
                  {allColumns.length > 12 && (
                    <span className="text-muted-foreground">+{allColumns.length - 12} more</span>
                  )}
                </div>
              )}
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-violet-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {allColumns.length} columns
            </div>
          )}

          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">⚠ {data.error}</div>
          )}
        </BaseNodeContent>

        {/* Sheet Name handle */}
        <Handle type="target" position={Position.Left} id="sheet-name" className="w-3 h-3 bg-amber-500" style={{ top: '6%' }} />

        {/* Base handle */}
        <Handle type="target" position={Position.Left} id="base" className="w-3 h-3 bg-violet-300" style={{ top: '14%' }} />

        {/* Block handles (0 through MAX_BLOCKS-1) */}
        {Array.from({ length: MAX_BLOCKS }).map((_, i) => (
          <Handle
            key={`block-${i}`}
            type="target"
            position={Position.Left}
            id={`block-${i}`}
            className="w-3 h-3 bg-purple-500"
            style={{ top: `${22 + i * 9}%` }}
          />
        ))}

        {/* Handle labels */}
        <div className="absolute left-[-4px] text-[8px] text-amber-500 font-medium" style={{ top: '3%', transform: 'translateX(-100%)' }}>
          Sheet Name
        </div>
        <div className="absolute left-[-4px] text-[8px] text-violet-400 font-medium" style={{ top: '11%', transform: 'translateX(-100%)' }}>
          Base (Key+Name)
        </div>
        {Array.from({ length: Math.min(blockCount + 1, MAX_BLOCKS) }).map((_, i) => (
          <div key={i} className="absolute left-[-4px] text-[7px] text-purple-400" style={{ top: `${19 + i * 9}%`, transform: 'translateX(-100%)' }}>
            Block {i}
          </div>
        ))}

        {/* Output handle */}
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-violet-600" />
      </BaseNode>
    </>
  );
});

BlockConcatNode.displayName = "BlockConcatNode";
