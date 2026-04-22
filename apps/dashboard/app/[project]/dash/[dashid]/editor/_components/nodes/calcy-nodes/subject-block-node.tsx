'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { TableProperties } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";

interface SubjectBlockConfig {
  subjectCode?: string;
  sectionType?: string;
  keyColumnName?: string;
}

export const SubjectBlockNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const config: SubjectBlockConfig = data.config || {};

  const subjectCode = data.resolvedSubjectCode || config.subjectCode || '';
  const sectionType = data.resolvedSectionType || config.sectionType || '';
  const keyColumn = data.resolvedKeyColumn || config.keyColumnName || '';
  const availableColumns: string[] = data.inputColumns ?? [];
  const prefix = subjectCode && sectionType ? `${subjectCode}:${sectionType}:` : '';

  const mappedCols = availableColumns
    .filter(col => col !== keyColumn)
    .map(col => ({ source: col, target: prefix ? `${prefix}${col}` : col }));

  const updateConfig = useCallback((updates: Partial<SubjectBlockConfig>) => {
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
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-t-md">
          <TableProperties className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Subject Block</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            {prefix || '???'}
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* Status indicators */}
          <div className="space-y-1.5">
            {[
              { label: 'Subject Code', val: subjectCode, color: 'teal' },
              { label: 'Section Type', val: sectionType, color: 'cyan' },
              { label: 'Key Column', val: keyColumn, color: 'blue' },
              { label: 'Data', val: availableColumns.length > 0 ? `${availableColumns.length} cols` : '', color: 'emerald' },
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
          {!data.resolvedSubjectCode && (
            <div className="space-y-1">
              <Label className="text-xs">Subject Code (manual)</Label>
              <Input value={config.subjectCode ?? ''} onChange={e => updateConfig({ subjectCode: e.target.value })}
                placeholder="e.g. CO24553" className="h-7 text-xs nodrag" />
            </div>
          )}
          {!data.resolvedSectionType && (
            <div className="space-y-1">
              <Label className="text-xs">Section Type (manual)</Label>
              <Input value={config.sectionType ?? ''} onChange={e => updateConfig({ sectionType: e.target.value })}
                placeholder="e.g. Th, Tut, Lab" className="h-7 text-xs nodrag" />
            </div>
          )}
          {!data.resolvedKeyColumn && (
            <div className="space-y-1">
              <Label className="text-xs">Key Column (manual)</Label>
              <Input value={config.keyColumnName ?? ''} onChange={e => updateConfig({ keyColumnName: e.target.value })}
                placeholder="e.g. Enrollment" className="h-7 text-xs nodrag" />
            </div>
          )}

          {/* Column Mapping Preview */}
          {mappedCols.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Column Mapping</Label>
              <div className="max-h-[80px] overflow-auto border rounded text-[10px]">
                <table className="w-full">
                  <thead><tr className="bg-muted">
                    <th className="px-1.5 py-0.5 text-left font-medium">Source</th>
                    <th className="px-1.5 py-0.5">→</th>
                    <th className="px-1.5 py-0.5 text-left font-medium">Target</th>
                  </tr></thead>
                  <tbody>
                    {keyColumn && (
                      <tr className="border-t bg-blue-50 dark:bg-blue-950">
                        <td className="px-1.5 py-0.5 font-medium">{keyColumn}</td>
                        <td className="px-1.5 py-0.5">🔑</td>
                        <td className="px-1.5 py-0.5 font-medium">{keyColumn}</td>
                      </tr>
                    )}
                    {mappedCols.map((m, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-1.5 py-0.5">{m.source}</td>
                        <td className="px-1.5 py-0.5">→</td>
                        <td className="px-1.5 py-0.5 text-teal-600 font-medium truncate max-w-[140px]">{m.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.rowCount !== undefined && (
            <div className="text-xs text-teal-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows • {prefix || 'no prefix'}
            </div>
          )}
          {data.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">⚠ {data.error}</div>
          )}
        </BaseNodeContent>

        {/* 4 input handles */}
        <Handle type="target" position={Position.Left} id="subject-code" className="w-3 h-3 bg-teal-500" style={{ top: '20%' }} />
        <Handle type="target" position={Position.Left} id="section-type" className="w-3 h-3 bg-cyan-500" style={{ top: '36%' }} />
        <Handle type="target" position={Position.Left} id="key-col-name" className="w-3 h-3 bg-blue-500" style={{ top: '52%' }} />
        <Handle type="target" position={Position.Left} id="data" className="w-3 h-3 bg-emerald-500" style={{ top: '72%' }} />

        {/* Output handle */}
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-teal-600" />
      </BaseNode>
    </>
  );
});

SubjectBlockNode.displayName = "SubjectBlockNode";
