'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Scissors } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

/**
 * BlockExtractorNode — extracts a specific block from a MasterSheet / Sheet Library
 * by matching columns that start with `code:type:`.
 *
 * Input:  A dataset with prefixed columns like CO12005:lab:total, CO12005:lab:present
 * Output: A dataset with stripped columns like total, present (+ base columns kept)
 *
 * Ports:
 *   - data (target): The full sheet (from SheetLibrary or MasterSheet)
 *   - code (target): The block code (e.g. CO12005)
 *   - type (target): The section type (e.g. lab, Th, Tut)
 *   - out  (source): Extracted block with stripped column names
 */
export const BlockExtractorNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const config = data.config || {};

  const resolvedCode = data.resolvedBlockCode || config.blockCode || '';
  const resolvedType = data.resolvedSectionType || config.sectionType || '';
  const prefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : '';

  const extractedColumns: string[] = data.extractedColumns ?? [];
  const baseColumns: string[] = data.baseColumns ?? [];
  const totalInputCols: number = data.totalInputCols ?? 0;

  const updateConfig = useCallback((updates: Record<string, string>) => {
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

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-t-md">
          <Scissors className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Block Extractor</BaseNodeHeaderTitle>
          {prefix && (
            <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
              {prefix}
            </Badge>
          )}
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-sky-50 dark:bg-sky-950 p-2 rounded leading-relaxed">
            Extracts a block from a MasterSheet by <strong>code:type</strong> prefix
            and strips the prefix from column names.
          </p>

          {/* Status */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${resolvedCode ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] text-muted-foreground">
                Code: <span className="font-semibold text-foreground">{resolvedCode || 'Connect →'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${resolvedType ? 'bg-cyan-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] text-muted-foreground">
                Type: <span className="font-semibold text-foreground">{resolvedType || 'Connect →'}</span>
              </span>
            </div>
            {totalInputCols > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-muted-foreground">
                  Input: <span className="font-semibold text-foreground">{totalInputCols} cols</span>
                </span>
              </div>
            )}
          </div>

          {/* Manual fallbacks */}
          {!data.resolvedBlockCode && (
            <div className="space-y-1">
              <Label className="text-xs">Block Code (manual)</Label>
              <Input
                value={config.blockCode ?? ''}
                onChange={e => updateConfig({ blockCode: e.target.value })}
                placeholder="e.g. CO12005"
                className="h-7 text-xs nodrag"
              />
            </div>
          )}
          {!data.resolvedSectionType && (
            <div className="space-y-1">
              <Label className="text-xs">Section Type (manual)</Label>
              <Input
                value={config.sectionType ?? ''}
                onChange={e => updateConfig({ sectionType: e.target.value })}
                placeholder="e.g. lab, Th, Tut"
                className="h-7 text-xs nodrag"
              />
            </div>
          )}

          {/* Extraction result preview */}
          {extractedColumns.length > 0 && (
            <div className="border-t pt-2 space-y-1">
              <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                Extracted {extractedColumns.length} columns:
              </span>
              <div className="flex flex-wrap gap-1">
                {baseColumns.map((col, i) => (
                  <span key={`b-${i}`} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border">
                    {col}
                  </span>
                ))}
                {extractedColumns.map((col, i) => (
                  <span key={`e-${i}`} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">⚠ {data.error}</div>
          )}
        </BaseNodeContent>

        {/* Input handles */}
        <Handle type="target" position={Position.Left} id="data" className="w-3 h-3 bg-blue-500" style={{ top: '20%' }} />
        <Handle type="target" position={Position.Left} id="code" className="w-3 h-3 bg-teal-500" style={{ top: '45%' }} />
        <Handle type="target" position={Position.Left} id="type" className="w-3 h-3 bg-cyan-500" style={{ top: '65%' }} />

        {/* Handle labels */}
        <div className="absolute left-[-4px] text-[7px] text-blue-500 font-medium" style={{ top: '17%', transform: 'translateX(-100%)' }}>
          Sheet Data
        </div>
        <div className="absolute left-[-4px] text-[7px] text-teal-500 font-medium" style={{ top: '42%', transform: 'translateX(-100%)' }}>
          Code
        </div>
        <div className="absolute left-[-4px] text-[7px] text-cyan-500 font-medium" style={{ top: '62%', transform: 'translateX(-100%)' }}>
          Type
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-sky-600" />
      </BaseNode>
    </>
  );
});

BlockExtractorNode.displayName = "BlockExtractorNode";
