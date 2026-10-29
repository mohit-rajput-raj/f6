'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { LayoutPanelTop } from 'lucide-react';
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
    <BaseNode variant="combine" className="min-w-[340px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <LayoutPanelTop className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Block Concat</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300">
            {blockCount} blocks
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
        <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
          Joins base dataset with subject blocks side-by-side into a single master sheet.
        </p>

        <div className="space-y-1.5 bg-muted/30 border border-border/40 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${resolvedSheetName ? 'bg-fuchsia-500' : 'bg-muted-foreground/40'}`} />
            <span className="text-[11px] text-muted-foreground">
              Master Sheet: <span className="font-semibold text-foreground">{resolvedSheetName || 'Connect or type →'}</span>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Master Sheet Name (or connect text input)</Label>
          <Input
            value={config.sheetName ?? ''}
            onChange={e => updateConfig({ sheetName: e.target.value })}
            placeholder="e.g. MasterSheet_IT"
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Key Column (e.g. Enrollment)</Label>
          <Select value={config.keyColumn} onValueChange={v => updateConfig({ keyColumn: v })} disabled={baseColumns.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={baseColumns.length === 0 ? "Connect base first" : "Select key column"} />
            </SelectTrigger>
            <SelectContent>
              {baseColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {allColumns.length > 0 && (
          <div className="space-y-1 border-t border-border/40 pt-2">
            <span className="text-[10px] font-medium text-muted-foreground">Columns ({allColumns.length})</span>
            <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto">
              {allColumns.slice(0, 10).map((col, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-foreground font-mono">
                  {col}
                </span>
              ))}
              {allColumns.length > 10 && (
                <span className="text-[9px] text-muted-foreground">+{allColumns.length - 10} more</span>
              )}
            </div>
          </div>
        )}

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium text-center pt-1 border-t border-border/40">
            {data.rowCount} rows • {allColumns.length} columns
          </div>
        )}

        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">⚠ {data.error}</div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="sheet-name" style={{ top: '6%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="base" style={{ top: '14%' }} />

      {Array.from({ length: MAX_BLOCKS }).map((_, i) => (
        <NodeHandle
          key={`block-${i}`}
          variant="combine"
          type="target"
          position={Position.Left}
          id={`block-${i}`}
          style={{ top: `${22 + i * 9}%` }}
        />
      ))}

      <div className="absolute left-[-4px] text-[8px] text-amber-500 font-medium" style={{ top: '3%', transform: 'translateX(-100%)' }}>
        Sheet Name
      </div>
      <div className="absolute left-[-4px] text-[8px] text-fuchsia-500 font-medium" style={{ top: '11%', transform: 'translateX(-100%)' }}>
        Base (Key+Name)
      </div>
      {Array.from({ length: Math.min(blockCount + 1, MAX_BLOCKS) }).map((_, i) => (
        <div key={i} className="absolute left-[-4px] text-[7px] text-fuchsia-400" style={{ top: `${19 + i * 9}%`, transform: 'translateX(-100%)' }}>
          Block {i}
        </div>
      ))}

      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

BlockConcatNode.displayName = "BlockConcatNode";
