'use client';

import { memo, useState, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Table2, Hash, Save, Loader2 } from 'lucide-react';
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
import { Button } from "@repo/ui/components/ui/button";

/**
 * MasterSheetPreviewNode — terminal node that pushes data to the desk panel's
 * bottom MasterSheet Syncfusion spreadsheet.
 *
 * data.mastersheetId = user-defined ID string (e.g. "attendance", "marks")
 *                      so the desk page knows which node's output to show.
 * data.result        = { columns, data } — set by execution engine
 * 
 * - save-trigger input port: triggers saving the mastersheet to DB
 * - Built-in save button for manual saves
 */
export const MasterSheetPreviewNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const mastersheetId: string = data.mastersheetId ?? '';
  const [isSaving, setIsSaving] = useState(false);
  const saveTriggered = data.saveTriggered ?? false;
  const lastSaveStatus = data.lastSaveStatus ?? '';

  const updateMastersheetId = useCallback((newId: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, mastersheetId: newId } } : node
      )
    );
  }, [id, setNodes]);

  const result = data.result ?? null;

  return (
    <BaseNode variant="output" selected={selected} className="min-w-[280px]">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <Table2 className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Master Sheet Preview</BaseNodeHeaderTitle>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          → Desk Bottom
        </Badge>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-3">
        {/* MasterSheet ID input */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
            <Hash className="size-3 text-muted-foreground" />
            MasterSheet ID
          </label>
          <input
            value={mastersheetId}
            onChange={(e) => updateMastersheetId(e.target.value)}
            className="w-full h-7 px-2 text-xs border border-border/60 rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 nodrag"
            placeholder="e.g. attendance, marks..."
          />
          <p className="text-[9px] text-muted-foreground">
            Type this ID in the Desk's MasterSheet panel to show this data.
          </p>
        </div>

        {/* Data preview */}
        {result && result.columns?.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center">
              {result.data.length} rows × {result.columns.length} columns
            </div>
            <div className="flex flex-wrap gap-1">
              {result.columns.slice(0, 5).map((col: string, i: number) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  {col}
                </span>
              ))}
              {result.columns.length > 5 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{result.columns.length - 5}
                </span>
              )}
            </div>
            <div className="text-[10px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
              ✅ Data will show in Desk MasterSheet panel
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2 italic">
            Connect input data, then execute to preview
          </div>
        )}

        {/* Save status */}
        {lastSaveStatus && (
          <div className={`text-[10px] text-center font-medium rounded-md px-2 py-1 ${
            lastSaveStatus === 'saved'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : lastSaveStatus === 'error'
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-muted text-muted-foreground border border-border/50'
          }`}>
            {lastSaveStatus === 'saved' ? '✅ Saved to DB' : lastSaveStatus === 'error' ? '❌ Save failed' : lastSaveStatus}
          </div>
        )}
      </BaseNodeContent>

      {/* Input handle — data */}
      <NodeHandle
        variant="output"
        type="target"
        position={Position.Left}
        id="in"
        style={{ top: '50%' }}
      />

      {/* Handle labels */}
      <div className="absolute left-[-4px] text-[8px] text-emerald-600 dark:text-emerald-400 font-medium select-none pointer-events-none" style={{ top: '47%', transform: 'translateX(-100%)' }}>
        Data
      </div>
    </BaseNode>
  );
});

MasterSheetPreviewNode.displayName = 'MasterSheetPreviewNode';
