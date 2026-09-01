'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Sparkles, CheckCircle2, Table2, ArrowRight, Loader2 } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { useDeskStore } from "@/stores/desk-store";
import { toast } from "sonner";

interface Dataset {
  columns: string[];
  data: any[][];
  updates?: any[];
  sheetName?: string;
  targetPath?: string;
}

/**
 * UpdatedMergedPreviewNode — terminal output preview node for AI-merged MasterSheet data.
 * Displays calculated updates, new column values, and offers one-click "Confirm Merge to MasterSheet".
 */
export const UpdatedMergedPreviewNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();
  const result: Dataset | null = data.result ?? null;
  const [isMerging, setIsMerging] = useState(false);
  const [isMerged, setIsMerged] = useState(false);

  const updatesCount = result?.updates?.length ?? 0;
  const targetSheet = result?.sheetName || data.sheetName || 'Sheet1';
  const targetPath = result?.targetPath || data.targetPath || 'CO24554/Th.';

  const handleConfirmMerge = useCallback(async () => {
    if (!result || !result.updates || result.updates.length === 0) {
      toast.error('No merged updates to apply. Run execution first.');
      return;
    }

    setIsMerging(true);
    try {
      const msStore = useMasterSheetStore.getState();
      const deskStore = useDeskStore.getState();
      const {
        applyUpdatesToMasterSheet,
        applyUpdatesDirectlyToSyncfusion,
        extractSyncfusionInstanceData,
        openSheetInSyncfusion,
      } = await import("@/lib/sheet-utils");

      const ss = typeof window !== "undefined" ? (window as any).__masterSheetSpreadsheet : null;

      // 1. Direct cell updates to visible Syncfusion spreadsheet
      let updatedDirectly = false;
      if (ss) {
        updatedDirectly = applyUpdatesDirectlyToSyncfusion(ss, result.updates);
      }

      // 2. Extract or calculate full updated workbook JSON
      let updatedMasterSheet = null;
      if (ss && typeof ss.saveAsJson === "function") {
        try {
          const res = await ss.saveAsJson();
          updatedMasterSheet = res?.jsonObject || res;
        } catch (e) {
          console.warn("saveAsJson notice:", e);
        }
      }

      if (!updatedMasterSheet && ss) {
        updatedMasterSheet = extractSyncfusionInstanceData(ss);
      }

      if (!updatedMasterSheet) {
        const currentRaw =
          msStore.sheets[targetSheet]?.data ||
          deskStore.activeMasterSheetData ||
          deskStore.masterSheetPreview;
        updatedMasterSheet = applyUpdatesToMasterSheet(currentRaw, result.updates, targetPath);
      }

      // 3. Update in-memory store
      if (updatedMasterSheet) {
        msStore.setSheetData(targetSheet, updatedMasterSheet);
        deskStore.setDeskMasterSheetData(updatedMasterSheet);
        msStore.pushData({
          masterSheetName: targetSheet,
          sheetName: targetSheet,
          data: updatedMasterSheet,
          blockCodenames: [targetPath],
          pushedBy: 'workflow',
          pushedByName: 'UpdatedMergedPreview Node',
          pushedAt: Date.now(),
          sourceNodeId: id,
        });
      }

      // 4. Refresh if direct update was not available
      if (!updatedDirectly && ss && updatedMasterSheet) {
        openSheetInSyncfusion(ss, updatedMasterSheet);
      }

      setIsMerged(true);
      toast.success(`Merged ${result.updates.length} records into MasterSheet "${targetSheet}"! Click "Save Sheet" in Desk panel to persist.`);
      setTimeout(() => setIsMerged(false), 4000);
    } catch (err: any) {
      console.error('Merge confirmation failed:', err);
      toast.error('Merge confirmation failed: ' + (err?.message || err));
    } finally {
      setIsMerging(false);
    }
  }, [id, result, targetSheet, targetPath]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[340px] max-w-[380px] rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <BaseNodeHeader className="border-b border-border flex items-center justify-between px-3.5 py-2.5 bg-muted/40 text-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-6 rounded-md bg-primary/10 border border-primary/20 text-primary">
              <Table2 className="size-3.5" />
            </div>
            <BaseNodeHeaderTitle className="text-foreground text-xs font-semibold tracking-tight">
              Merged Preview
            </BaseNodeHeaderTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] font-normal">
            → Desk Panel
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3.5 space-y-3">
          {/* Metadata badges */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-2">
            <span>
              Target: <strong className="font-mono text-foreground font-medium">{targetSheet}</strong>
            </span>
            <span>
              Path: <strong className="font-mono text-foreground font-medium">{targetPath}</strong>
            </span>
          </div>

          {result && result.columns && result.columns.length > 0 ? (
            <>
              {/* Stats overview */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  {result.data.length} records computed
                </span>
                {updatesCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {updatesCount} updates
                  </Badge>
                )}
              </div>

              {/* Column tags */}
              <div className="flex flex-wrap gap-1 max-h-[55px] overflow-y-auto">
                {result.columns.map((col, i) => {
                  const isMetric = col.includes(':') || col.toLowerCase().includes('total') || col.toLowerCase().includes('attend') || col.includes('%')
                  return (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${
                        isMetric
                          ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                          : 'bg-background text-foreground border-border'
                      }`}
                    >
                      {col}
                    </span>
                  )
                })}
              </div>

              {/* Mini Table Preview */}
              <div className="max-h-[120px] overflow-auto border border-border rounded-md bg-card">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted/60 sticky top-0 border-b border-border text-muted-foreground font-medium">
                      {result.columns.slice(0, 5).map((col, i) => (
                        <th key={i} className="px-2 py-1 text-left border-r border-border/50 last:border-r-0 truncate max-w-[80px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {result.data.slice(0, 4).map((row, ri) => (
                      <tr key={ri} className="hover:bg-muted/50 transition-colors">
                        {row.slice(0, 5).map((cell: any, ci: number) => (
                          <td key={ci} className="px-2 py-1 border-r border-border/40 last:border-r-0 truncate max-w-[80px] font-mono text-foreground">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 4 && (
                  <div className="text-[10px] text-center text-muted-foreground py-1 border-t border-border bg-muted/20">
                    + {result.data.length - 4} more rows
                  </div>
                )}
              </div>

              {/* Confirm Merge Button */}
              <Button
                onClick={handleConfirmMerge}
                disabled={isMerging}
                size="sm"
                className="w-full h-8 gap-1.5 font-medium cursor-pointer shadow-xs"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Merging...</span>
                  </>
                ) : isMerged ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Merged in MasterSheet</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="size-3.5" />
                    <span>Confirm Merge in MasterSheet</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-5 italic flex flex-col items-center gap-2">
              <div className="size-8 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground">
                <Table2 className="size-4" />
              </div>
              <span className="text-xs text-foreground font-medium">Connect Dynamic MasterSheet Node & Execute</span>
              <span className="text-[10px] text-muted-foreground">Live preview will display calculated columns here</span>
            </div>
          )}
        </BaseNodeContent>

        {/* Input handle from Dynamic MasterSheet Node */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3 h-3 bg-emerald-500 border border-zinc-950"
          style={{ top: '50%' }}
        />
        <div className="absolute left-[-4px] text-[7px] text-emerald-400 font-semibold" style={{ top: '47%', transform: 'translateX(-100%)' }}>
          Updates / Merged
        </div>
      </BaseNode>
    </>
  );
});

UpdatedMergedPreviewNode.displayName = 'UpdatedMergedPreviewNode';
