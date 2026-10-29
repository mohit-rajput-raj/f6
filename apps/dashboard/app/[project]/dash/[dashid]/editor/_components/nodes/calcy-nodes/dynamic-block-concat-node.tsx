'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Layers } from 'lucide-react';
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

interface DynamicBlockConcatConfig {
  sheetName?: string;
  keyColumn?: string;
  blockCode?: string;
  sectionType?: string;
}

export const DynamicBlockConcatNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const config: DynamicBlockConcatConfig = data.config || {};

  const resolvedSheetName = data.resolvedSheetName || config.sheetName || '';
  const resolvedCode = data.resolvedBlockCode || config.blockCode || '';
  const resolvedType = data.resolvedSectionType || config.sectionType || '';
  const resolvedKey = data.resolvedKeyColumn || config.keyColumn || '';
  const blockPrefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : '';

  const mastersheetColumns: string[] = data.mastersheetColumns ?? [];
  const blockColumns: string[] = data.blockColumns ?? [];
  const allColumns: string[] = data.result?.columns ?? [];
  const hasMastersheet = mastersheetColumns.length > 0;
  const hasBlockData = blockColumns.length > 0;

  const updateConfig = useCallback((updates: Partial<DynamicBlockConcatConfig>) => {
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
            <Layers className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Dynamic Block Concat</BaseNodeHeaderTitle>
          {blockPrefix && (
            <Badge variant="outline" className="text-[10px] font-mono border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300">
              {blockPrefix}
            </Badge>
          )}
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
          Merges a single Subject Block into MasterSheet by <strong>code + type</strong>.
        </p>

        <div className="space-y-1.5 bg-muted/30 border border-border/40 p-2.5 rounded-xl">
          {[
            { label: 'Sheet Name', val: resolvedSheetName, dot: 'bg-amber-500' },
            { label: 'Key Column', val: resolvedKey, dot: 'bg-lime-500' },
            { label: 'Block Code', val: resolvedCode, dot: 'bg-teal-500' },
            { label: 'Section Type', val: resolvedType, dot: 'bg-cyan-500' },
            { label: 'MasterSheet', val: hasMastersheet ? `${mastersheetColumns.length} cols` : '', dot: 'bg-orange-500' },
            { label: 'Block Data', val: hasBlockData ? `${blockColumns.length} cols` : '', dot: 'bg-fuchsia-500' },
          ].map(({ label, val, dot }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${val ? dot : 'bg-muted-foreground/40'}`} />
              <span className="text-[11px] text-muted-foreground">
                {label}: <span className="font-semibold text-foreground">{val || 'Connect →'}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Master Sheet Name (fallback)</Label>
          <Input
            value={config.sheetName ?? ''}
            onChange={e => updateConfig({ sheetName: e.target.value })}
            placeholder="e.g. MasterSheet_IT"
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Key Column (fallback, e.g. Enrollment)</Label>
          <Input
            value={config.keyColumn ?? ''}
            onChange={e => updateConfig({ keyColumn: e.target.value })}
            placeholder="e.g. Enrollment"
            className="h-8 text-xs nodrag"
          />
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

      <NodeHandle variant="combine" type="target" position={Position.Left} id="sheet-name" style={{ top: '8%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="key" style={{ top: '18%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="mastersheet" style={{ top: '30%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="code" style={{ top: '44%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="type" style={{ top: '56%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="block" style={{ top: '70%' }} />

      <div className="absolute left-[-4px] text-[7px] text-amber-500 font-medium" style={{ top: '5%', transform: 'translateX(-100%)' }}>
        Sheet Name
      </div>
      <div className="absolute left-[-4px] text-[7px] text-lime-500 font-medium" style={{ top: '15%', transform: 'translateX(-100%)' }}>
        Key
      </div>
      <div className="absolute left-[-4px] text-[7px] text-orange-500 font-medium" style={{ top: '27%', transform: 'translateX(-100%)' }}>
        MasterSheet
      </div>
      <div className="absolute left-[-4px] text-[7px] text-teal-500 font-medium" style={{ top: '41%', transform: 'translateX(-100%)' }}>
        Code
      </div>
      <div className="absolute left-[-4px] text-[7px] text-cyan-500 font-medium" style={{ top: '53%', transform: 'translateX(-100%)' }}>
        Type
      </div>
      <div className="absolute left-[-4px] text-[7px] text-fuchsia-500 font-medium" style={{ top: '67%', transform: 'translateX(-100%)' }}>
        Block Data
      </div>

      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

DynamicBlockConcatNode.displayName = "DynamicBlockConcatNode";
