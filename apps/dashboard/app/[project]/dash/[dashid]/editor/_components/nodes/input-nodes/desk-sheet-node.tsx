'use client';

import { memo, useEffect, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
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
import { useDeskStore } from '@/stores/desk-store';
import { useEditorWorkFlow } from '@/context/WorkFlowContextProvider';

/**
 * DeskSheetNode — auto-created when user adds a sheet on the desk panel.
 *
 * data.deskBlockId = ID of the parent DeskBlock
 * data.deskSheetId = ID of the corresponding DeskSheet in desk-store
 * data.sheetName   = name of the sheet (display label)
 * data.text        = { columns, data } (synced from desk store at execution time)
 */
export const DeskSheetNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const defaultHandleDelete = useDeleteNode();
  const { deskBlockId: contextBlockId } = useEditorWorkFlow();
  const deskSheetId: string = data.deskSheetId || id;
  const deskBlockId: string = data.deskBlockId || contextBlockId || '';
  const sheetName: string = data.sheetName ?? 'Desk Sheet';

  const handleDelete = useCallback(() => {
    if (deskBlockId) {
      useDeskStore.getState().removeSheet(deskBlockId, deskSheetId);
    }
    defaultHandleDelete();
  }, [deskBlockId, deskSheetId, defaultHandleDelete]);

  // Auto-register in desk store on mount
  useEffect(() => {
    if (!deskBlockId) return;
    const store = useDeskStore.getState();
    if (!store.getSheetById(deskBlockId, deskSheetId)) {
      store.addSheet(deskBlockId, sheetName, deskSheetId);
      
      // Update node data to hold the ID if it wasn't there
      if (!data.deskSheetId) {
        setNodes(nds => nds.map(node => 
          node.id === id ? { ...node, data: { ...node.data, deskSheetId } } : node
        ));
      }
    }
  }, [id, deskBlockId, deskSheetId, sheetName, data.deskSheetId, setNodes]);

  // Read live data from desk store
  const sheetData = useDeskStore((s) => {
    if (!deskBlockId) {
      // Fallback: check node data
      const fd = data.text;
      return fd && typeof fd === 'object' && fd.columns ? fd : null;
    }
    const block = s.blocks.find(b => b.id === deskBlockId);
    const sheet = block?.sheets.find(sh => sh.id === deskSheetId);
    return sheet?.data ?? null;
  });

  const displayName = useDeskStore((s) => {
    if (!deskBlockId) return sheetName;
    const block = s.blocks.find(b => b.id === deskBlockId);
    return block?.sheets.find(sh => sh.id === deskSheetId)?.name ?? sheetName;
  });

  const columns: string[] = sheetData?.columns ?? [];
  const rows: any[][] = sheetData?.data ?? [];

  return (
    <BaseNode variant="input" selected={selected} className="min-w-[280px]">
      <BaseNodeHeader variant="input">
        <BaseNodeIcon variant="input">
          <FileSpreadsheet className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>{displayName}</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3 space-y-2.5">
        {columns.length > 0 ? (
          <>
            <div className="text-[11px] text-muted-foreground font-mono text-center">
              {rows.length} rows × {columns.length} columns
            </div>

            {/* Column badges */}
            <div className="flex flex-wrap gap-1">
              {columns.slice(0, 8).map((col, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/40 font-mono"
                >
                  {col}
                </span>
              ))}
              {columns.length > 8 && (
                <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                  +{columns.length - 8} more
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="max-h-[85px] overflow-auto border border-border/40 rounded-lg bg-background">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-medium">
                    {columns.slice(0, 5).map((col, i) => (
                      <th
                        key={i}
                        className="px-2 py-1 text-left border-r border-border/30 last:border-r-0 truncate max-w-[65px]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {rows.slice(0, 3).map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      {row.slice(0, 5).map((cell: any, ci: number) => (
                        <td
                          key={ci}
                          className="px-2 py-1 border-r border-border/25 last:border-r-0 truncate max-w-[65px] font-mono text-foreground"
                        >
                          {String(cell ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 3 && (
                <div className="text-[10px] text-center text-muted-foreground py-1 border-t border-border/30 bg-muted/20">
                  + {rows.length - 3} more rows
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 italic flex flex-col items-center gap-1.5">
            <Table2 className="size-4 opacity-50" />
            <span>No data loaded — upload CSV on Desk panel</span>
          </div>
        )}

        {!deskBlockId && (
          <p className="text-[9px] text-muted-foreground/80 text-center">
            ⚠ No block ID set. Open this editor from a desk block.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/80 text-center font-medium">
          Data loaded from Desk panel
        </p>
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

DeskSheetNode.displayName = 'DeskSheetNode';
