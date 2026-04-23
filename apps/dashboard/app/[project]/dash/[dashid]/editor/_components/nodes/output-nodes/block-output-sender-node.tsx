'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Send, Table2 } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Badge } from "@repo/ui/components/ui/badge";

interface Dataset {
  columns: string[];
  data: any[][];
}

/**
 * BlockOutputSenderNode — terminal node that stores its input data as the
 * block's output so the NEXT block can pick it up as an input sheet.
 *
 * data.result = { columns, data } — set by the execution engine
 * data.deskBlockId = the parent block's ID
 */
export const BlockOutputSenderNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();
  const result: Dataset | null = data.result ?? null;

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-md">
          <Send className="size-4" />
          <BaseNodeHeaderTitle className="text-white">Send to Next Block</BaseNodeHeaderTitle>
          <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
            → Block+1
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {result && result.columns && result.columns.length > 0 ? (
            <>
              <div className="text-xs text-cyan-600 font-semibold text-center">
                {result.data.length} rows × {result.columns.length} columns
              </div>

              {/* Column badges */}
              <div className="flex flex-wrap gap-1">
                {result.columns.slice(0, 6).map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700"
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

              <div className="text-[10px] text-center text-cyan-500 font-medium">
                ✅ Data will be sent to next block's input
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4 italic flex flex-col items-center gap-2">
              <Table2 className="size-6 opacity-40" />
              <span>Run workflow to capture output</span>
              <span className="text-[9px]">This data will be available in the next block</span>
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle only — terminal node */}
        <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-cyan-600" />
      </BaseNode>
    </>
  );
});

BlockOutputSenderNode.displayName = 'BlockOutputSenderNode';
