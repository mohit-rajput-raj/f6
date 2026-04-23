'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Table2, Hash } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Badge } from "@repo/ui/components/ui/badge";

/**
 * MasterSheetPreviewNode — terminal node that pushes data to the desk panel's
 * bottom MasterSheet Syncfusion spreadsheet.
 *
 * data.mastersheetId = user-defined ID string (e.g. "attendance", "marks")
 *                      so the desk page knows which node's output to show.
 * data.result        = { columns, data } — set by execution engine
 */
export const MasterSheetPreviewNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const mastersheetId: string = data.mastersheetId ?? '';

  const updateMastersheetId = useCallback((newId: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, mastersheetId: newId } } : node
      )
    );
  }, [id, setNodes]);

  const result = data.result ?? null;

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-md">
          <Table2 className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Master Sheet Preview</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            → Desk Bottom
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* MasterSheet ID input */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
              <Hash className="size-3" />
              MasterSheet ID
            </label>
            <input
              value={mastersheetId}
              onChange={(e) => updateMastersheetId(e.target.value)}
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 nodrag"
              placeholder="e.g. attendance, marks..."
            />
            <p className="text-[9px] text-muted-foreground">
              Type this ID in the Desk's MasterSheet panel to show this data.
            </p>
          </div>

          {/* Data preview */}
          {result && result.columns?.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs text-indigo-600 font-semibold text-center">
                {result.data.length} rows × {result.columns.length} columns
              </div>
              <div className="flex flex-wrap gap-1">
                {result.columns.slice(0, 5).map((col: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
                  >
                    {col}
                  </span>
                ))}
                {result.columns.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{result.columns.length - 5}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-center text-indigo-500 font-medium">
                ✅ Data will show in Desk MasterSheet panel
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2 italic">
              Connect input data, then execute to preview
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle only — terminal node */}
        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-indigo-600" />
      </BaseNode>
    </>
  );
});

MasterSheetPreviewNode.displayName = 'MasterSheetPreviewNode';
