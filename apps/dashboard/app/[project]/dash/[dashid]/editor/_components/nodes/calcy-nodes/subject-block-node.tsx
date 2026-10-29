'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { TableProperties } from 'lucide-react';
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
    <BaseNode variant="combine" className="min-w-[340px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <TableProperties className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Subject Block</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300">
            {prefix || '???'}
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
        <div className="space-y-1.5 bg-muted/30 border border-border/40 p-2.5 rounded-xl">
          {[
            { label: 'Subject Code', val: subjectCode, dot: 'bg-teal-500' },
            { label: 'Section Type', val: sectionType, dot: 'bg-cyan-500' },
            { label: 'Key Column', val: keyColumn, dot: 'bg-blue-500' },
            { label: 'Data', val: availableColumns.length > 0 ? `${availableColumns.length} cols` : '', dot: 'bg-emerald-500' },
          ].map(({ label, val, dot }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${val ? dot : 'bg-muted-foreground/40'}`} />
              <span className="text-[11px] text-muted-foreground">
                {label}: <span className="font-semibold text-foreground">{val || 'Connect →'}</span>
              </span>
            </div>
          ))}
        </div>

        {prefix && mappedCols.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Column Prefix Preview</span>
            <div className="border border-border/40 rounded-lg max-h-[100px] overflow-y-auto text-[10px] bg-muted/20">
              <table className="w-full text-left">
                <tbody>
                  {keyColumn && (
                    <tr className="border-b border-border/40 font-mono text-muted-foreground">
                      <td className="px-2 py-0.5">{keyColumn}</td>
                      <td className="px-2 py-0.5">→</td>
                      <td className="px-2 py-0.5 font-semibold text-foreground">{keyColumn} (key)</td>
                    </tr>
                  )}
                  {mappedCols.map((m, i) => (
                    <tr key={i} className="border-t border-border/40 font-mono">
                      <td className="px-2 py-0.5 text-muted-foreground">{m.source}</td>
                      <td className="px-2 py-0.5 text-muted-foreground">→</td>
                      <td className="px-2 py-0.5 text-fuchsia-600 dark:text-fuchsia-400 font-medium truncate max-w-[140px]">{m.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium text-center pt-1 border-t border-border/40">
            {data.rowCount} rows • {prefix || 'no prefix'}
          </div>
        )}
        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">⚠ {data.error}</div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="subject-code" style={{ top: '20%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="section-type" style={{ top: '36%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="key-col-name" style={{ top: '52%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="data" style={{ top: '72%' }} />
      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

SubjectBlockNode.displayName = "SubjectBlockNode";
