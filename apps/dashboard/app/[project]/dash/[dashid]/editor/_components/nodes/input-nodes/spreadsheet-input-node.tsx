'use client';

import { memo } from 'react';
import { Position } from '@xyflow/react';
import { FileSpreadsheet, Table2 } from 'lucide-react';
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

export const SpreadsheetInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();

  const dataset = data.text;
  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];

  return (
    <BaseNode variant="input" className="min-w-[320px]">
      <BaseNodeHeader variant="input">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="input">
            <FileSpreadsheet className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Sheet Input</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-2.5">
        {columns.length > 0 ? (
          <>
            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold text-center font-mono">
              {rows.length} rows × {columns.length} columns
            </div>

            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
              {columns.map((col, i) => (
                <span
                  key={i}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40 text-foreground font-mono"
                >
                  {col}
                </span>
              ))}
            </div>

            <div className="max-h-[100px] overflow-auto border border-border/40 rounded-lg">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40">
                    {columns.map((col, i) => (
                      <th
                        key={i}
                        className="px-1.5 py-1 text-left font-medium border-r border-border/30 last:border-r-0 truncate max-w-[80px]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/30 last:border-b-0">
                      {row.map((cell: any, ci: number) => (
                        <td
                          key={ci}
                          className="px-1.5 py-1 border-r border-border/30 last:border-r-0 truncate max-w-[80px] font-mono text-[9px]"
                        >
                          {String(cell ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 3 && (
                <div className="text-[9px] text-center text-muted-foreground py-0.5 bg-muted/20">
                  + {rows.length - 3} more rows
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 italic flex flex-col items-center gap-1.5">
            <Table2 className="size-5 opacity-40" />
            No sheet data selected
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle
        variant="input"
        type="source"
        position={Position.Right}
        id="out"
      />
    </BaseNode>
  );
});

SpreadsheetInputNode.displayName = "SpreadsheetInputNode";
