'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Layers } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
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

  // Resolved values (from ports or manual config)
  const resolvedSheetName = data.resolvedSheetName || config.sheetName || '';
  const resolvedCode = data.resolvedBlockCode || config.blockCode || '';
  const resolvedType = data.resolvedSectionType || config.sectionType || '';
  const resolvedKey = data.resolvedKeyColumn || config.keyColumn || '';
  const blockPrefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : '';

  const mastersheetColumns: string[] = data.mastersheetColumns ?? [];
  const blockColumns: string[] = data.blockColumns ?? [];
  const allColumns: string[] = data.result?.columns ?? [];
  const hasMastersheet = data.hasMastersheet ?? false;
  const isReplacing = data.isReplacing ?? false;

  const updateConfig = useCallback((updates: Partial<DynamicBlockConcatConfig>) => {
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
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white rounded-t-md">
          <Layers className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Dynamic Block Concat</BaseNodeHeaderTitle>
          {blockPrefix && (
            <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
              {blockPrefix}
            </Badge>
          )}
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-fuchsia-50 dark:bg-fuchsia-950 p-2 rounded leading-relaxed">
            Merges a single Subject Block into a MasterSheet by <strong>code + type</strong>.
            Connect code &amp; type ports (same as Subject Block) to identify the target block.
          </p>

          {/* Status indicators */}
          <div className="space-y-1.5">
            {[
              { label: 'Sheet Name', val: resolvedSheetName, color: 'amber' },
              { label: 'Key Column', val: resolvedKey, color: 'lime' },
              { label: 'Block Code', val: resolvedCode, color: 'teal' },
              { label: 'Section Type', val: resolvedType, color: 'cyan' },
              { label: 'MasterSheet', val: hasMastersheet ? `${mastersheetColumns.length} cols` : '', color: 'orange' },
              { label: 'Block Data', val: blockColumns.length > 0 ? `${blockColumns.length} cols` : '', color: 'purple' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${val ? `bg-${color}-500` : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                <span className="text-[10px] text-muted-foreground">
                  {label}: <span className="font-semibold text-foreground">{val || 'Connect →'}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Manual fallbacks */}
          {!data.resolvedSheetName && (
            <div className="space-y-1">
              <Label className="text-xs">Sheet Name (manual)</Label>
              <Input
                value={config.sheetName ?? ''}
                onChange={e => updateConfig({ sheetName: e.target.value })}
                placeholder="e.g. 8th Semester Section B"
                className="h-7 text-xs nodrag"
              />
            </div>
          )}
          {!data.resolvedKeyColumn && (
            <div className="space-y-1">
              <Label className="text-xs">Key Column (manual)</Label>
              <Input
                value={config.keyColumn ?? ''}
                onChange={e => updateConfig({ keyColumn: e.target.value })}
                placeholder="e.g. Enrollment_No"
                className="h-7 text-xs nodrag"
              />
            </div>
          )}
          {!data.resolvedBlockCode && (
            <div className="space-y-1">
              <Label className="text-xs">Block Code (manual)</Label>
              <Input
                value={config.blockCode ?? ''}
                onChange={e => updateConfig({ blockCode: e.target.value })}
                placeholder="e.g. CO24553"
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
                placeholder="e.g. Th, Tut, Lab"
                className="h-7 text-xs nodrag"
              />
            </div>
          )}

          {/* Block replacement status */}
          {blockPrefix && (
            <div className="border-t pt-2">
              <span className={`text-[10px] font-medium ${isReplacing
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                {isReplacing
                  ? `🔄 Will replace existing block "${blockPrefix}" in mastersheet`
                  : `✨ Will add new block "${blockPrefix}" to mastersheet`
                }
              </span>
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-fuchsia-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {allColumns.length} columns
            </div>
          )}

          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">⚠ {data.error}</div>
          )}
        </BaseNodeContent>

        {/* Input handles — 6 ports */}
        <Handle type="target" position={Position.Left} id="sheet-name" className="w-3 h-3 bg-amber-500" style={{ top: '8%' }} />
        <Handle type="target" position={Position.Left} id="key" className="w-3 h-3 bg-lime-500" style={{ top: '18%' }} />
        <Handle type="target" position={Position.Left} id="mastersheet" className="w-3 h-3 bg-orange-500" style={{ top: '30%' }} />
        <Handle type="target" position={Position.Left} id="code" className="w-3 h-3 bg-teal-500" style={{ top: '44%' }} />
        <Handle type="target" position={Position.Left} id="type" className="w-3 h-3 bg-cyan-500" style={{ top: '56%' }} />
        <Handle type="target" position={Position.Left} id="block" className="w-3 h-3 bg-purple-500" style={{ top: '70%' }} />

        {/* Handle labels */}
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
        <div className="absolute left-[-4px] text-[7px] text-purple-500 font-medium" style={{ top: '67%', transform: 'translateX(-100%)' }}>
          Block Data
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-fuchsia-600" />
      </BaseNode>
    </>
  );
});

DynamicBlockConcatNode.displayName = "DynamicBlockConcatNode";
