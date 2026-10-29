'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Scissors } from 'lucide-react';
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
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

export const BlockExtractorNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const config = data.config || {};

  const resolvedCode = data.resolvedBlockCode || config.blockCode || '';
  const resolvedType = data.resolvedSectionType || config.sectionType || '';
  const prefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}:` : '';

  const incomingColumns: string[] = data.inputColumns ?? [];
  const extractedColumns = prefix
    ? incomingColumns.filter(c => c.startsWith(prefix)).map(c => c.slice(prefix.length))
    : [];
  const baseColumns = prefix
    ? incomingColumns.filter(c => !c.includes(':'))
    : [];

  const updateConfig = useCallback((updates: Record<string, any>) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...config, ...updates } } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="combine" className="min-w-[280px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <Scissors className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Block Extractor</BaseNodeHeaderTitle>
          {prefix && (
            <Badge variant="outline" className="text-[10px] font-mono border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300">
              {prefix}
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
          Extracts a block from a MasterSheet by <strong>code:type</strong> prefix.
        </p>

        <div className="space-y-1.5 bg-muted/30 border border-border/40 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${resolvedCode ? 'bg-teal-500' : 'bg-muted-foreground/40'}`} />
            <span className="text-[11px] text-muted-foreground">
              Code: <span className="font-semibold text-foreground">{resolvedCode || 'Connect →'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${resolvedType ? 'bg-cyan-500' : 'bg-muted-foreground/40'}`} />
            <span className="text-[11px] text-muted-foreground">
              Type: <span className="font-semibold text-foreground">{resolvedType || 'Connect →'}</span>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Block Code (fallback)</Label>
          <Input
            value={config.blockCode ?? ''}
            onChange={e => updateConfig({ blockCode: e.target.value })}
            placeholder="e.g. CO12005"
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Section Type (fallback)</Label>
          <Input
            value={config.sectionType ?? ''}
            onChange={e => updateConfig({ sectionType: e.target.value })}
            placeholder="e.g. lab, Th"
            className="h-8 text-xs nodrag"
          />
        </div>

        {extractedColumns.length > 0 && (
          <div className="border-t border-border/40 pt-2 space-y-1">
            <span className="text-[10px] font-medium text-fuchsia-600 dark:text-fuchsia-400">
              Extracted {extractedColumns.length} columns:
            </span>
            <div className="flex flex-wrap gap-1">
              {baseColumns.map((col, i) => (
                <span key={`b-${i}`} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-muted-foreground font-mono">
                  {col}
                </span>
              ))}
              {extractedColumns.map((col, i) => (
                <span key={`e-${i}`} className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300 font-mono">
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">⚠ {data.error}</div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="data" style={{ top: '20%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="code" style={{ top: '45%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="type" style={{ top: '65%' }} />

      <div className="absolute left-[-4px] text-[7px] text-blue-500 font-medium" style={{ top: '17%', transform: 'translateX(-100%)' }}>
        Sheet Data
      </div>
      <div className="absolute left-[-4px] text-[7px] text-teal-500 font-medium" style={{ top: '42%', transform: 'translateX(-100%)' }}>
        Code
      </div>
      <div className="absolute left-[-4px] text-[7px] text-cyan-500 font-medium" style={{ top: '62%', transform: 'translateX(-100%)' }}>
        Type
      </div>

      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

BlockExtractorNode.displayName = "BlockExtractorNode";
