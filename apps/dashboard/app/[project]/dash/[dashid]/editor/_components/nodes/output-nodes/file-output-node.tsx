'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

interface Dataset {
  columns: string[];
  data: any[][];
}

export const FileOutputNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const result: Dataset | null = data.result ?? null;
  const fileName = data.fileName ?? 'output';

  const updateFileName = useCallback((name: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, fileName: name } } : n
      )
    );
  }, [id, setNodes]);

  const downloadCSV = useCallback(() => {
    if (!result) return;

    const header = result.columns.join(',');
    const rows = result.data.map(row =>
      row.map((cell: any) => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-emerald-700 text-white">
          <FileSpreadsheet className="size-4" />
          <BaseNodeHeaderTitle>File Output</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">File name</Label>
            <Input
              value={fileName}
              onChange={e => updateFileName(e.target.value)}
              placeholder="output"
              className="h-8"
            />
          </div>

          {result ? (
            <>
              <div className="text-xs text-emerald-600 font-medium text-center border-t pt-2">
                {result.data.length} rows × {result.columns.length} columns
              </div>

              {/* Preview table */}
              <div className="max-h-[120px] overflow-auto border rounded">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted">
                      {result.columns.map((col, i) => (
                        <th key={i} className="px-1 py-0.5 text-left font-medium border-r last:border-r-0">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell: any, ci: number) => (
                          <td key={ci} className="px-1 py-0.5 border-r last:border-r-0 truncate max-w-[80px]">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 5 && (
                  <div className="text-[10px] text-center text-muted-foreground py-0.5">
                    + {result.data.length - 5} more rows
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full nodrag"
                onClick={downloadCSV}
              >
                <Download className="size-3 mr-1" /> Download CSV
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4 italic">
              Run workflow to see output...
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-emerald-600" />
      </BaseNode>
    </>
  );
});

FileOutputNode.displayName = "FileOutputNode";
