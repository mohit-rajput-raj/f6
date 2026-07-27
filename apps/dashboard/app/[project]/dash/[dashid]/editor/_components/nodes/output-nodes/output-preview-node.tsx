'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Eye, EyeOff, Table2 } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";

interface Dataset {
  columns: string[];
  data: any[][];
}

/**
 * OutputPreviewNode — terminal node that pushes data to the desk panel's
 * Syncfusion spreadsheet preview.
 *
 * data.result = { columns, data } — set by the execution engine
 * data.previewEnabled = boolean — toggle preview on/off (default true)
 * data.previewName = string — label shown in the desk preview tab
 */
export const OutputPreviewNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const result: Dataset | null = data.result ?? null;
  const previewEnabled: boolean = data.previewEnabled !== false; // default true
  const previewName: string = data.previewName || 'Preview';

  const togglePreview = useCallback(() => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id
          ? { ...n, data: { ...n.data, previewEnabled: !previewEnabled } }
          : n
      )
    );
  }, [id, setNodes, previewEnabled]);

  const updatePreviewName = useCallback((name: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id
          ? { ...n, data: { ...n.data, previewName: name } }
          : n
      )
    );
  }, [id, setNodes]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[300px]">
        <BaseNodeHeader className={`border-b flex items-center gap-2 px-3 py-2 rounded-t-md ${previewEnabled ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white' : 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-zinc-300'}`}>
          {previewEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          <BaseNodeHeaderTitle className={previewEnabled ? 'text-white' : 'text-zinc-300'}>Output Preview</BaseNodeHeaderTitle>

          {/* Preview toggle switch */}
          <button
            onClick={togglePreview}
            className={`ml-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              previewEnabled ? 'bg-purple-400' : 'bg-zinc-500'
            }`}
            title={previewEnabled ? 'Preview ON — click to disable' : 'Preview OFF — click to enable'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                previewEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>

          <Badge variant="outline" className={`text-[10px] ml-1 ${previewEnabled ? 'border-white/30 text-white/80' : 'border-zinc-500 text-zinc-400'}`}>
            {previewEnabled ? '→ Desk' : 'OFF'}
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {/* Editable preview name */}
          <Input
            value={previewName}
            onChange={(e) => updatePreviewName(e.target.value)}
            className="h-6 text-xs border-dashed nodrag"
            placeholder="Preview name..."
          />

          {!previewEnabled && (
            <div className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-950 p-1.5 rounded text-center font-medium">
              ⚠ Preview disabled — data won't appear in Desk panel
            </div>
          )}

          {result && result.columns && result.columns.length > 0 ? (
            <>
              <div className="text-xs text-purple-600 font-semibold text-center">
                {result.data.length} rows × {result.columns.length} columns
              </div>

              {/* Column badges */}
              <div className="flex flex-wrap gap-1">
                {result.columns.slice(0, 6).map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                  >
                    {col}
                  </span>
                ))}
                {result.columns.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{result.columns.length - 6} more
                  </span>
                )}
              </div>

              {/* Mini preview table */}
              <div className="max-h-[100px] overflow-auto border rounded">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-purple-50 dark:bg-purple-900/40">
                      {result.columns.slice(0, 5).map((col, i) => (
                        <th key={i} className="px-1 py-0.5 text-left font-medium border-r last:border-r-0 truncate max-w-[70px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 4).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.slice(0, 5).map((cell: any, ci: number) => (
                          <td key={ci} className="px-1 py-0.5 border-r last:border-r-0 truncate max-w-[70px]">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 4 && (
                  <div className="text-[10px] text-center text-muted-foreground py-0.5 border-t">
                    + {result.data.length - 4} more rows
                  </div>
                )}
              </div>

              <div className="text-[10px] text-center text-purple-500 font-medium">
                {previewEnabled ? '✅ Previewing in Desk panel' : '⏸ Preview paused'}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4 italic flex flex-col items-center gap-2">
              <Table2 className="size-6 opacity-40" />
              <span>Run workflow to preview output</span>
              <span className="text-[9px]">Data will appear as a spreadsheet in the Desk panel</span>
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle only — NO output handle (terminal node) */}
        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-purple-600" />
      </BaseNode>
    </>
  );
});

OutputPreviewNode.displayName = 'OutputPreviewNode';
