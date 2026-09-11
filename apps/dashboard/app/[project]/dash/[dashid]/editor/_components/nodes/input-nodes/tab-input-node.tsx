'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Inbox, RefreshCw, Table2, ArrowDownToLine, Check } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useDeskStore, type IncomingTabData } from '@/stores/desk-store';
import { useEditorWorkFlow } from '@/context/WorkFlowContextProvider';
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { toast } from "sonner";

interface Dataset {
  columns: string[];
  data: any[][];
}

/**
 * TabInputNode — receives datasets sent from OutputPreview nodes in other tabs/blocks.
 * 
 * When multiple tabs send data to the same target tab, an array of incoming files/datasets
 * is collected. This node lets the user choose which dataset to use on the canvas.
 *
 * data.text = { columns: string[], data: any[][] }
 * data.selectedDatasetId = id of chosen incoming dataset
 * data.selectedDatasetName = label of chosen incoming dataset
 */
export const TabInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { deskBlockId: contextBlockId } = useEditorWorkFlow();
  const deskBlockId: string = data.deskBlockId || contextBlockId || '';

  // Auto-inject deskBlockId into node data if missing
  useEffect(() => {
    if (!data.deskBlockId && contextBlockId) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, deskBlockId: contextBlockId } } : n
        )
      );
    }
  }, [id, data.deskBlockId, contextBlockId, setNodes]);

  // Current tab info
  const blocks = useDeskStore((s) => s.blocks);
  const currentTab = useMemo(() => blocks.find(b => b.id === deskBlockId), [blocks, deskBlockId]);
  const currentTabName = currentTab?.name || 'Current Tab';

  // Get array of incoming datasets for this tab
  const incomingDataByTab = useDeskStore((s) => s.incomingDataByTab);
  const incomingList: IncomingTabData[] = useMemo(() =>
    useDeskStore.getState().getIncomingDataForTab(deskBlockId || currentTabName),
    [incomingDataByTab, deskBlockId, currentTabName]
  );

  const selectedDatasetId: string = data.selectedDatasetId || (incomingList.length > 0 ? incomingList[0]?.id : '');

  // Active dataset to display
  const activeIncoming = incomingList.find((i) => i.id === selectedDatasetId) || incomingList[0];
  const dataset: Dataset | null = data.text || activeIncoming?.data || null;

  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];

  // Auto-sync node text data with selected incoming dataset (including on upstream re-run)
  useEffect(() => {
    if (
      activeIncoming &&
      (!data.text ||
        data.selectedDatasetId !== activeIncoming.id ||
        data.lastSyncedAt !== activeIncoming.updatedAt)
    ) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  selectedDatasetId: activeIncoming.id,
                  selectedDatasetName: activeIncoming.name,
                  lastSyncedAt: activeIncoming.updatedAt,
                  text: activeIncoming.data,
                  inputColumns: activeIncoming.data.columns,
                  rowCount: activeIncoming.data.data.length,
                },
              }
            : n
        )
      );
    }
  }, [id, activeIncoming, data.text, data.selectedDatasetId, data.lastSyncedAt, setNodes]);

  const handleSelectDataset = useCallback((targetId: string) => {
    const chosen = incomingList.find((i) => i.id === targetId);
    if (!chosen) return;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                selectedDatasetId: chosen.id,
                selectedDatasetName: chosen.name,
                text: chosen.data,
                inputColumns: chosen.data.columns,
                rowCount: chosen.data.data.length,
              },
            }
          : n
      )
    );
    toast.success(`Selected incoming dataset: "${chosen.name}"`);
  }, [id, incomingList, setNodes]);

  const handleRefresh = useCallback(() => {
    const list = useDeskStore.getState().getIncomingDataForTab(deskBlockId || currentTabName);
    if (list.length > 0) {
      toast.success(`Found ${list.length} incoming dataset(s) for this tab`);
      if (!selectedDatasetId || !list.some(i => i.id === selectedDatasetId)) {
        handleSelectDataset(list[0].id);
      }
    } else {
      toast.info(`No incoming datasets for "${currentTabName}" yet`);
    }
  }, [deskBlockId, currentTabName, selectedDatasetId, handleSelectDataset]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px] max-w-[360px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-md">
          <Inbox className="size-4" />
          <BaseNodeHeaderTitle className="text-white text-sm">
            Tab Input
          </BaseNodeHeaderTitle>
          <Badge variant="outline" className="ml-auto text-[10px] border-white/30 text-white/90">
            {incomingList.length > 0 ? `${incomingList.length} Available` : 'Empty'}
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2.5">
          {/* Target tab label */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>Target Tab: <strong className="text-foreground">{currentTabName}</strong></span>
            <button
              onClick={handleRefresh}
              className="hover:text-foreground flex items-center gap-1 cursor-pointer"
              title="Refresh incoming datasets"
            >
              <RefreshCw className="size-3" />
              <span>Sync</span>
            </button>
          </div>

          {/* Dataset Selector (File Array) */}
          {incomingList.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground">
                Choose Incoming Dataset:
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => handleSelectDataset(e.target.value)}
                className="w-full text-xs rounded border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring nodrag"
              >
                {incomingList.map((item, i) => (
                  <option key={`${item.id}-${i}`} value={item.id}>
                    {item.name} (from {item.fromTabName}) — {item.data.data.length} rows
                  </option>
                ))}
              </select>

              {activeIncoming && (
                <div className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono flex items-center gap-1">
                  <Check className="size-3" />
                  <span>Pushed from <strong>{activeIncoming.fromTabName}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center space-y-1.5">
              <ArrowDownToLine className="size-5 mx-auto text-muted-foreground opacity-50" />
              <p className="text-xs font-medium text-foreground">No incoming data yet</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                In another tab, configure an <strong>Output Preview</strong> node with <strong>Target Next Tab = &quot;{currentTabName}&quot;</strong> and run it.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-6 text-[10px] gap-1 mt-1 cursor-pointer"
              >
                <RefreshCw className="size-2.5" />
                Check Again
              </Button>
            </div>
          )}

          {/* Dataset Preview */}
          {columns.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold text-center">
                {rows.length} rows × {columns.length} columns
              </div>

              {/* Column badges */}
              <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                {columns.map((col, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono"
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* Mini preview table */}
              <div className="max-h-[90px] overflow-auto border rounded bg-background">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted/70 sticky top-0">
                      {columns.slice(0, 5).map((col, i) => (
                        <th key={i} className="px-1.5 py-0.5 text-left font-medium border-r last:border-r-0 truncate max-w-[70px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.slice(0, 5).map((cell: any, ci: number) => (
                          <td key={ci} className="px-1.5 py-0.5 border-r last:border-r-0 truncate max-w-[70px]">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </BaseNodeContent>

        {/* Output Handle to connect to other nodes */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-cyan-500 border border-background"
        />
      </BaseNode>
    </>
  );
});

TabInputNode.displayName = 'TabInputNode';
