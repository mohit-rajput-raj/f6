'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Download, FileSpreadsheet, Database } from 'lucide-react';
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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { createDataLibraryFile } from "@/app/[project]/dash/[dashid]/(documents)/data-library/actions";

interface Dataset {
  columns: string[];
  data: any[][];
}

export const FileOutputNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { data: session } = useSession();
  const [savingToLibrary, setSavingToLibrary] = useState(false);

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

  const saveToLibrary = useCallback(async () => {
    if (!result || !session?.user?.id) {
      toast.error("Cannot save — no data or not logged in");
      return;
    }

    setSavingToLibrary(true);
    try {
      await createDataLibraryFile({
        userId: session.user.id,
        name: fileName || 'Workflow Output',
        description: `Saved from workflow output (${result.data.length} rows)`,
        fileType: 'calculated',
        data: { columns: result.columns, data: result.data },
        metadata: {
          rowCount: result.data.length,
          colCount: result.columns.length,
          sourceNodeId: id,
        },
      });
      toast.success(`Saved "${fileName}" to Data Library`);
    } catch (err) {
      console.error("Save to library failed:", err);
      toast.error("Failed to save to Data Library");
    } finally {
      setSavingToLibrary(false);
    }
  }, [result, session, fileName, id]);

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

              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 nodrag"
                  onClick={downloadCSV}
                >
                  <Download className="size-3 mr-1" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 nodrag bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-800"
                  onClick={saveToLibrary}
                  disabled={savingToLibrary}
                >
                  <Database className="size-3 mr-1" />
                  {savingToLibrary ? 'Saving...' : 'Save to Library'}
                </Button>
              </div>
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

