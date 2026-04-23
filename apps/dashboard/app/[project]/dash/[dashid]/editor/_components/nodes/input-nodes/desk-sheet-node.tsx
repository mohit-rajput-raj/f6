'use client';

import { memo, useEffect, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileSpreadsheet, Table2 } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
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
export const DeskSheetNode = memo(({ id, data }: { id: string; data: any }) => {
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <FileSpreadsheet className="size-4" />
          <BaseNodeHeaderTitle className="text-white text-sm">
            📊 {displayName}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {columns.length > 0 ? (
            <>
              <div className="text-xs text-orange-600 font-semibold text-center">
                {rows.length} rows × {columns.length} columns
              </div>

              {/* Column badges */}
              <div className="flex flex-wrap gap-1">
                {columns.slice(0, 8).map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700"
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
              <div className="max-h-[80px] overflow-auto border rounded">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-orange-50 dark:bg-orange-900/40">
                      {columns.slice(0, 5).map((col, i) => (
                        <th key={i} className="px-1 py-0.5 text-left font-medium border-r last:border-r-0 truncate max-w-[60px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.slice(0, 5).map((cell: any, ci: number) => (
                          <td key={ci} className="px-1 py-0.5 border-r last:border-r-0 truncate max-w-[60px]">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 3 && (
                  <div className="text-[10px] text-center text-muted-foreground py-0.5 border-t">
                    + {rows.length - 3} more rows
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-3 italic flex flex-col items-center gap-2">
              <Table2 className="size-5 opacity-50" />
              No data loaded — upload CSV on Desk panel
            </div>
          )}

          {!deskBlockId && (
            <p className="text-[9px] text-amber-500 text-center">
              ⚠ No block ID set. Open this editor from a desk block.
            </p>
          )}

          <p className="text-[9px] text-muted-foreground text-center">
            📊 Data loaded from Desk panel
          </p>
        </BaseNodeContent>

        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-orange-500" />
      </BaseNode>
    </>
  );
});

DeskSheetNode.displayName = 'DeskSheetNode';
