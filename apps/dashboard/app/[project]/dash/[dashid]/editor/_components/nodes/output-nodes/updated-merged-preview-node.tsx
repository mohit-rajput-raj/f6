'use client';

import { memo, useCallback, useState, useMemo } from 'react';
import { Handle, Position, useReactFlow, useEdges, useNodes } from '@xyflow/react';
import { Sparkles, CheckCircle2, Table2, ArrowRight, Loader2, TextCursorInput, Layers } from 'lucide-react';
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
  stackName?: string;
}

/**
 * UpdatedMergedPreviewNode — terminal output preview node for AI-merged MasterSheet data.
 * Displays calculated updates, new column values, dynamically syncs path from AnalyticsStackNode / DeskTextInput,
 * and offers one-click "Confirm Merge to MasterSheet".
 */
export const UpdatedMergedPreviewNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const result: Dataset | null = data.result ?? null;
  const [isMerging, setIsMerging] = useState(false);
  const [isMerged, setIsMerged] = useState(false);

  const edges = useEdges();
  const nodes = useNodes();

  // 1. Edge connected to target-path or path handle
  const pathEdge = edges.find(
    (e) =>
      e.target === id &&
      (e.targetHandle === 'target-path' ||
        e.targetHandle === 'targetPath' ||
        e.targetHandle === 'path' ||
        e.targetHandle === 'table-name' ||
        e.targetHandle === 'tableName')
  );

  // 2. Edge connected to data input handle ('in' or default)
  const inEdge = edges.find((e) => e.target === id && (e.targetHandle === 'in' || !e.targetHandle));

  const pathSourceNode = pathEdge ? nodes.find((n) => n.id === pathEdge.source) : null;
  const inSourceNode = inEdge ? nodes.find((n) => n.id === inEdge.source) : null;

  // Real-time resolution from desk store if connected to DeskTextInputNode
  const dynamicDeskPath = useDeskStore((s) => {
    const targetSource = pathSourceNode || (inSourceNode?.type === 'DeskTextInputNode' ? inSourceNode : null);
    if (!targetSource) return '';
    if (targetSource.type === 'DeskTextInputNode') {
      const sourceData = targetSource.data as any;
      const deskBlockId = sourceData?.deskBlockId;
      const deskInputId = sourceData?.deskInputId || targetSource.id;
      if (deskBlockId) {
        const block = s.blocks.find((b) => b.id === deskBlockId);
        const val = block?.textInputs?.find((t) => t.id === deskInputId)?.value;
        if (val !== undefined && val !== null && val !== '') return val;
      }
      for (const b of s.blocks) {
        const found = b.textInputs?.find((t) => t.id === deskInputId || t.id === targetSource.id);
        if (found && found.value) return found.value;
      }
      return sourceData?.text ?? '';
    }
    return typeof targetSource.data?.text === 'string'
      ? targetSource.data.text
      : typeof targetSource.data?.result === 'string'
      ? targetSource.data.result
      : '';
  });

  // Find connected or upstream AnalyticsStackNode
  const connectedAnalyticsNode = useMemo(() => {
    if (inSourceNode?.type === 'AnalyticsStackNode') return inSourceNode;
    if (pathSourceNode?.type === 'AnalyticsStackNode') return pathSourceNode;
    const direct = nodes.find(
      (n) => n.type === 'AnalyticsStackNode' && edges.some((e) => e.source === n.id && e.target === id)
    );
    if (direct) return direct;
    return nodes.find((n) => n.type === 'AnalyticsStackNode') || null;
  }, [inSourceNode, pathSourceNode, nodes, edges, id]);

  const analyticsTableName =
    connectedAnalyticsNode?.data?.resolvedTableName ||
    connectedAnalyticsNode?.data?.stackName ||
    (connectedAnalyticsNode?.data as any)?.effectiveStackName ||
    '';

  // Find connected or upstream DynamicMasterSheetNode
  const connectedDynamicNode = useMemo(() => {
    if (inSourceNode?.type === 'DynamicMasterSheetNode') return inSourceNode;
    return nodes.find((n) => n.type === 'DynamicMasterSheetNode') || null;
  }, [inSourceNode, nodes]);

  const dynamicNodePath =
    connectedDynamicNode?.data?.incomingTargetPath ||
    connectedDynamicNode?.data?.targetPath ||
    '';

  const deskStoreMergedPath = useDeskStore((s) => s.mergedPreview?.targetPath || (s.mergedPreview as any)?.stackName || '');

  // Priority resolution:
  // 1. Explicit DeskTextInput connected to path handle
  // 2. Already computed result's targetPath or stackName
  // 3. AnalyticsStackNode's table name
  // 4. DynamicMasterSheetNode's targetPath
  // 5. Dynamic desk path from inSourceNode
  // 6. Node data targetPath
  // 7. Desk store mergedPreview targetPath
  const effectiveTargetPath =
    (pathEdge && dynamicDeskPath ? dynamicDeskPath : null) ||
    result?.targetPath ||
    result?.stackName ||
    (analyticsTableName ? analyticsTableName : null) ||
    (dynamicNodePath ? dynamicNodePath : null) ||
    (dynamicDeskPath ? dynamicDeskPath : null) ||
    data.targetPath ||
    deskStoreMergedPath ||
    '';

  const isDynamicDeskConnected = Boolean(pathEdge || (dynamicDeskPath && !analyticsTableName));
  const isAnalyticsLinked = Boolean(!pathEdge && analyticsTableName);

  const updatesCount = result?.updates?.length ?? 0;
  const targetSheet = result?.sheetName || data.sheetName || 'Sheet1';

  const updateNodeData = useCallback(
    (fields: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...fields } } : node
        )
      );
    },
    [id, setNodes]
  );

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
        updatedMasterSheet = applyUpdatesToMasterSheet(currentRaw, result.updates, effectiveTargetPath, (result as any).dataStartRow);
      }

      // 3. Update in-memory store
      if (updatedMasterSheet) {
        msStore.setSheetData(targetSheet, updatedMasterSheet);
        deskStore.setDeskMasterSheetData(updatedMasterSheet);
        msStore.pushData({
          masterSheetName: targetSheet,
          sheetName: targetSheet,
          data: updatedMasterSheet,
          blockCodenames: [effectiveTargetPath],
          pushedBy: 'workflow',
          pushedByName: 'UpdatedMergedPreview Node',
          pushedAt: Date.now(),
          sourceNodeId: id,
        });
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
  }, [id, result, targetSheet, effectiveTargetPath]);

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
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-2 gap-2">
            <span className="shrink-0">
              Target: <strong className="font-mono text-foreground font-medium">{targetSheet}</strong>
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0">Path:</span>
              <strong className="font-mono text-foreground font-medium truncate max-w-[150px]" title={effectiveTargetPath}>
                {effectiveTargetPath || "(Not set)"}
              </strong>
              {isDynamicDeskConnected ? (
                <Badge
                  variant="outline"
                  className="text-[8px] px-1 py-0 h-4 bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30 gap-0.5 shrink-0 font-mono"
                >
                  <TextCursorInput className="size-2 text-teal-500" />
                  Desk In
                </Badge>
              ) : isAnalyticsLinked ? (
                <Badge
                  variant="outline"
                  className="text-[8px] px-1 py-0 h-4 bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30 gap-0.5 shrink-0 font-mono"
                >
                  <Layers className="size-2 text-violet-500" />
                  Analytics
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Sync indicator pill or custom input */}
          {isDynamicDeskConnected ? (
            <div className="px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-600 dark:text-teal-300 flex items-center justify-between">
              <span className="flex items-center gap-1 truncate font-medium">
                <TextCursorInput className="size-3 shrink-0 text-teal-500" />
                Desk Input Linked:
              </span>
              <strong className="font-mono text-xs font-bold text-teal-700 dark:text-teal-200">
                &ldquo;{effectiveTargetPath}&rdquo;
              </strong>
            </div>
          ) : isAnalyticsLinked ? (
            <div className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-600 dark:text-violet-300 flex items-center justify-between">
              <span className="flex items-center gap-1 truncate font-medium">
                <Layers className="size-3 shrink-0 text-violet-500" />
                Synced with Analytics Table:
              </span>
              <strong className="font-mono text-xs font-bold text-violet-700 dark:text-violet-200">
                &ldquo;{effectiveTargetPath}&rdquo;
              </strong>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span>Target Column / Path:</span>
                <span className="text-[8px] font-mono text-muted-foreground">Port: Desk Input / Path In</span>
              </div>
              <input
                type="text"
                value={data.targetPath ?? ''}
                onChange={(e) => updateNodeData({ targetPath: e.target.value })}
                placeholder="e.g. CO24009/Lab or connect Desk Input"
                className="w-full px-2 py-1 text-xs rounded border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

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

        {/* Desk Text Input / Path In Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="target-path"
          className="w-3.5 h-3.5 bg-teal-500 border-2 border-background shadow-xs hover:scale-110 transition-transform"
          style={{ top: '30%' }}
        />
        <div
          className="absolute left-[-6px] text-[7px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase select-none pointer-events-none"
          style={{ top: '27%', transform: 'translateX(-100%)' }}
        >
          Desk Input / Path In
        </div>

        {/* Input handle from Dynamic MasterSheet Node or Analytics Stack Node */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3.5 h-3.5 bg-emerald-500 border-2 border-background shadow-xs hover:scale-110 transition-transform"
          style={{ top: '70%' }}
        />
        <div
          className="absolute left-[-6px] text-[7px] text-emerald-500 font-semibold tracking-wider uppercase select-none pointer-events-none"
          style={{ top: '67%', transform: 'translateX(-100%)' }}
        >
          Data In
        </div>
      </BaseNode>
    </>
  );
});

UpdatedMergedPreviewNode.displayName = 'UpdatedMergedPreviewNode';
