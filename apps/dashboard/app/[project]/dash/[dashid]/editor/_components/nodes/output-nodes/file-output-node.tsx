'use client';

import { memo, useCallback, useState } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Download, FileSpreadsheet, Database } from 'lucide-react';
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

export const FileOutputNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
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
      const dashid = typeof window !== 'undefined' ? window.location.pathname.split('/dash/')[1]?.split('/')[0] : undefined;
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
        workflowId: dashid,
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
    <BaseNode variant="output" selected={selected} className="min-w-[320px]">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <FileSpreadsheet className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>File Output</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-4 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">File name</Label>
          <Input
            value={fileName}
            onChange={e => updateFileName(e.target.value)}
            placeholder="output"
            className="h-8 nodrag"
          />
        </div>

        {result ? (
          <>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center border-t border-border/50 pt-2">
              {result.data.length} rows × {result.columns.length} columns
            </div>

            {/* Preview table */}
            <div className="max-h-[120px] overflow-auto border border-border/60 rounded-md">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/70">
                    {result.columns.map((col, i) => (
                      <th key={i} className="px-1.5 py-1 text-left font-medium border-r border-border/40 last:border-r-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-t border-border/40">
                      {row.map((cell: any, ci: number) => (
                        <td key={ci} className="px-1.5 py-0.5 border-r border-border/40 last:border-r-0 truncate max-w-[80px]">
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 nodrag"
                onClick={downloadCSV}
              >
                <Download className="size-3.5 mr-1.5" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 nodrag bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                onClick={saveToLibrary}
                disabled={savingToLibrary}
              >
                <Database className="size-3.5 mr-1.5" />
                {savingToLibrary ? 'Saving...' : 'Save to Library'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 italic">
            Run workflow to see output...
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle
        variant="output"
        type="target"
        position={Position.Left}
        id="in"
      />
    </BaseNode>
  );
});

FileOutputNode.displayName = "FileOutputNode";

