'use client';

import { memo, useCallback, useState, useMemo } from 'react';
import { Position, useReactFlow, useEdges, useNodes } from '@xyflow/react';
import { Sparkles, CheckCircle2, Table2, ArrowRight, Loader2, TextCursorInput, Layers } from 'lucide-react';
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
export const UpdatedMergedPreviewNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
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
    <BaseNode variant="ai" selected={selected} className="min-w-[340px] max-w-[380px]">
      <BaseNodeHeader variant="ai">
        <BaseNodeIcon variant="ai">
          <Sparkles className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Merged Preview</BaseNodeHeaderTitle>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
          Desk Panel
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
        {/* Metadata badges */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-2 gap-2">
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
                className="text-[9px] px-1.5 py-0 h-4 bg-muted/60 text-foreground border-border/40 gap-0.5 shrink-0 font-mono"
              >
                <TextCursorInput className="size-2 text-muted-foreground" />
                Desk In
              </Badge>
            ) : isAnalyticsLinked ? (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 bg-muted/60 text-foreground border-border/40 gap-0.5 shrink-0 font-mono"
              >
                <Layers className="size-2 text-muted-foreground" />
                Analytics
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Sync indicator pill or custom input */}
        {isDynamicDeskConnected ? (
          <div className="px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate font-medium">
              <TextCursorInput className="size-3 shrink-0 text-muted-foreground" />
              Desk Input Linked:
            </span>
            <strong className="font-mono text-[11px] font-semibold text-foreground">
              &ldquo;{effectiveTargetPath}&rdquo;
            </strong>
          </div>
        ) : isAnalyticsLinked ? (
          <div className="px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate font-medium">
              <Layers className="size-3 shrink-0 text-muted-foreground" />
              Synced with Analytics Table:
            </span>
            <strong className="font-mono text-[11px] font-semibold text-foreground">
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
              className="w-full px-2 py-1 text-xs rounded-lg border border-border/50 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground/30 nodrag"
            />
          </div>
        )}

        {result && result.columns && result.columns.length > 0 ? (
          <>
            {/* Stats overview */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="size-3.5 text-foreground" />
                {result.data.length} records computed
              </span>
              {updatesCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {updatesCount} updates
                </Badge>
              )}
            </div>

            {/* Column tags */}
            <div className="flex flex-wrap gap-1 max-h-[55px] overflow-y-auto">
              {result.columns.map((col, i) => {
                const isMetric = col.includes(':') || col.toLowerCase().includes('total') || col.toLowerCase().includes('attend') || col.includes('%');
                return (
                  <span
                    key={i}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${
                      isMetric
                        ? 'bg-muted text-foreground border-border/60 font-semibold'
                        : 'bg-background text-muted-foreground border-border/30'
                    }`}
                  >
                    {col}
                  </span>
                );
              })}
            </div>

            {/* Mini Table Preview */}
            <div className="max-h-[120px] overflow-auto border border-border/40 rounded-lg bg-card">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/40 sticky top-0 border-b border-border/40 text-muted-foreground font-medium">
                    {result.columns.slice(0, 5).map((col, i) => (
                      <th key={i} className="px-2 py-1 text-left border-r border-border/30 last:border-r-0 truncate max-w-[80px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {result.data.slice(0, 4).map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30 transition-colors">
                      {row.slice(0, 5).map((cell: any, ci: number) => (
                        <td key={ci} className="px-2 py-1 border-r border-border/25 last:border-r-0 truncate max-w-[80px] font-mono text-foreground">
                          {String(cell ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.data.length > 4 && (
                <div className="text-[10px] text-center text-muted-foreground py-1 border-t border-border/30 bg-muted/20">
                  + {result.data.length - 4} more rows
                </div>
              )}
            </div>

            {/* Confirm Merge Button */}
            <Button
              onClick={handleConfirmMerge}
              disabled={isMerging}
              size="sm"
              className="w-full h-8 gap-1.5 font-medium cursor-pointer shadow-2xs rounded-lg bg-foreground text-background hover:bg-foreground/90"
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
            <div className="size-8 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-muted-foreground">
              <Table2 className="size-4" />
            </div>
            <span className="text-xs text-foreground font-medium">Connect Dynamic MasterSheet Node & Execute</span>
            <span className="text-[10px] text-muted-foreground">Live preview will display calculated columns here</span>
          </div>
        )}
      </BaseNodeContent>

      {/* Desk Text Input / Path In Handle */}
      <NodeHandle
        variant="ai"
        type="target"
        position={Position.Left}
        id="target-path"
        style={{ top: '30%' }}
      />
      <div
        className="absolute left-[-4px] text-[8px] text-indigo-500 font-mono uppercase tracking-wider select-none pointer-events-none"
        style={{ top: '27%', transform: 'translateX(-100%)' }}
      >
        Desk Input / Path In
      </div>

      {/* Input handle from Dynamic MasterSheet Node or Analytics Stack Node */}
      <NodeHandle
        variant="ai"
        type="target"
        position={Position.Left}
        id="in"
        style={{ top: '70%' }}
      />
      <div
        className="absolute left-[-4px] text-[8px] text-indigo-500 font-mono uppercase tracking-wider select-none pointer-events-none"
        style={{ top: '67%', transform: 'translateX(-100%)' }}
      >
        Data In
      </div>
    </BaseNode>
  );
});

UpdatedMergedPreviewNode.displayName = 'UpdatedMergedPreviewNode';
