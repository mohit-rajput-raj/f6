'use client';

import { memo } from 'react';
import { Position } from '@xyflow/react';
import { Send, Table2 } from 'lucide-react';
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
export const BlockOutputSenderNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const handleDelete = useDeleteNode();
  const result: Dataset | null = data.result ?? null;

  return (
    <BaseNode variant="output" selected={selected} className="min-w-[280px]">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <Send className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Send to Next Block</BaseNodeHeaderTitle>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          → Block+1
        </Badge>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-2.5">
        {result && result.columns && result.columns.length > 0 ? (
          <>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center">
              {result.data.length} rows × {result.columns.length} columns
            </div>

            {/* Column badges */}
            <div className="flex flex-wrap gap-1">
              {result.columns.slice(0, 6).map((col, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  {col}
                </span>
              ))}
              {result.columns.length > 6 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{result.columns.length - 6} more
                </span>
              )}
            </div>

            <div className="text-[10px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
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
      <NodeHandle variant="output" type="target" position={Position.Left} id="in" />
    </BaseNode>
  );
});

BlockOutputSenderNode.displayName = 'BlockOutputSenderNode';
