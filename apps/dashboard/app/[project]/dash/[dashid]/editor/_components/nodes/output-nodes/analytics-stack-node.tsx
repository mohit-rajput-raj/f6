'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow, useEdges, useNodes } from '@xyflow/react';
import {
  BarChart3,
  Layers,
  Key,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  TextCursorInput,
} from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/dashboard/flow/Node/baseNode';
import { NodeMenu } from '../node-menu';
import { IconTrash } from '@tabler/icons-react';
import { useDeleteNode } from '../settings/triggers';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Switch } from '@repo/ui/components/ui/switch';
import { toast } from 'sonner';
import { saveOrMergeAnalyticsStack } from '../../../../analytics/_actions/analytics-actions';
import { useSession } from '@/lib/auth-client';
import { useParams } from 'next/navigation';
import { useDeskStore } from '@/stores/desk-store';

export const AnalyticsStackNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const params = useParams();
  const dashid = (params?.dashid as string) || '';

  const stackName: string = data.stackName ?? 'Attendance Tracker';
  const stackMode: 'align_columns' | 'append_rows' | 'replace' = data.stackMode ?? 'align_columns';
  const keyColumn: string = data.keyColumn ?? 'Enrollment';
  const autoExecute: boolean = data.autoExecute ?? false;

  // Real-time edge detection for dynamic Table Name from DeskTextInputNode or other text nodes
  const edges = useEdges();
  const nodes = useNodes();
  const nameEdge = edges.find(
    (e) =>
      e.target === id &&
      (e.targetHandle === 'table-name' ||
        e.targetHandle === 'tableName' ||
        e.targetHandle === 'table_name' ||
        e.targetHandle === 'name')
  );

  const dynamicSourceNode = nameEdge ? nodes.find((n) => n.id === nameEdge.source) : null;

  // Read dynamic value in real-time from desk store or source node
  const dynamicDeskText = useDeskStore((s) => {
    if (!nameEdge || !dynamicSourceNode) return '';
    if (dynamicSourceNode.type === 'DeskTextInputNode') {
      const sourceData = dynamicSourceNode.data as any;
      const deskBlockId = sourceData?.deskBlockId;
      const deskInputId = sourceData?.deskInputId || dynamicSourceNode.id;
      if (deskBlockId) {
        const block = s.blocks.find((b) => b.id === deskBlockId);
        const val = block?.textInputs?.find((t) => t.id === deskInputId)?.value;
        if (val !== undefined && val !== null && val !== '') return val;
      }
      for (const b of s.blocks) {
        const found = b.textInputs?.find((t) => t.id === deskInputId || t.id === dynamicSourceNode.id);
        if (found && found.value) return found.value;
      }
      return sourceData?.text ?? '';
    }
    return typeof dynamicSourceNode.data?.text === 'string'
      ? dynamicSourceNode.data.text
      : typeof dynamicSourceNode.data?.result === 'string'
      ? dynamicSourceNode.data.result
      : '';
  });

  const isDynamicNameConnected = Boolean(nameEdge);
  const effectiveStackName =
    (isDynamicNameConnected && dynamicDeskText ? dynamicDeskText : null) ||
    data.resolvedTableName ||
    stackName ||
    'Attendance Tracker';

  const [isPushing, setIsPushing] = useState(false);
  const lastSyncStatus = data.lastSyncStatus ?? '';
  const lastSyncedAt = data.lastSyncedAt ?? null;
  const syncedRows = data.syncedRows ?? 0;
  const syncedCols = data.syncedCols ?? 0;

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

  const result = data.result ?? null;

  const handlePushToAnalytics = async () => {
    if (!result || !Array.isArray(result.columns) || !Array.isArray(result.data)) {
      toast.error('No input dataset connected to push to analytics');
      return;
    }
    if (!userId) {
      toast.error('Please log in to push analytics data');
      return;
    }

    const targetStackName = effectiveStackName;

    setIsPushing(true);
    try {
      const res = await saveOrMergeAnalyticsStack({
        dashid,
        userId,
        stackName: targetStackName,
        stackMode,
        keyColumn,
        dataset: result,
      });

      const updatedCols = res?.data?.columns?.length ?? result.columns.length;
      const updatedRows = res?.data?.data?.length ?? result.data.length;

      updateNodeData({
        stackName: targetStackName,
        resolvedTableName: targetStackName,
        lastSyncStatus: 'synced',
        lastSyncedAt: Date.now(),
        syncedRows: updatedRows,
        syncedCols: updatedCols,
      });

      toast.success(
        `Synced to Analytics Stack "${targetStackName}" (${updatedRows} rows × ${updatedCols} cols)`
      );
    } catch (err: any) {
      console.error('Push to analytics failed:', err);
      updateNodeData({ lastSyncStatus: 'error' });
      toast.error('Sync failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash
          className="size-4 cursor-pointer text-red-400 hover:text-red-600"
          onClick={handleDelete}
        />
      </div>

      <BaseNode className="min-w-[320px] shadow-lg border-violet-500/20">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-md">
          <BarChart3 className="size-4" />
          <BaseNodeHeaderTitle className="text-white font-semibold">
            Analytics Stack Node
          </BaseNodeHeaderTitle>
          <Badge
            variant="outline"
            className={`text-[9px] font-mono ml-auto ${
              autoExecute
                ? 'border-emerald-400/50 text-emerald-100 bg-emerald-500/25'
                : 'border-white/30 text-white/90 bg-white/10'
            }`}
          >
            {autoExecute ? '⚡ Auto-Sync ON' : '→ Analytics'}
          </Badge>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-3">
          {/* Auto Execute Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent">
            <div className="space-y-0.5 pr-2">
              <div className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Zap
                  className={`size-3.5 ${
                    autoExecute ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                  }`}
                />
                <span>Auto Execute Mode</span>
                {autoExecute ? (
                  <Badge className="h-4 px-1 text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono">
                    <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                    ON
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground font-mono">
                    OFF
                  </Badge>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">
                {autoExecute
                  ? 'Automatically stacks data to Analytics when flow executes from Desk or Editor'
                  : 'Manual push only — click "Push to Analytics" button below'}
              </p>
            </div>
            <Switch
              checked={autoExecute}
              onCheckedChange={(checked) => updateNodeData({ autoExecute: checked })}
              className="nodrag shrink-0 data-[state=checked]:bg-violet-600"
            />
          </div>

          {/* Stack Name Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                <Layers className="size-3 text-violet-500" />
                Stack Table Name
              </label>
              {isDynamicNameConnected ? (
                <Badge
                  variant="outline"
                  className="text-[9px] bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 gap-1 font-mono py-0 h-4"
                >
                  <TextCursorInput className="size-2.5 text-teal-500" />
                  Desk Input Linked
                </Badge>
              ) : (
                <span className="text-[9px] text-muted-foreground font-mono">
                  Port: Table Name In
                </span>
              )}
            </div>

            {isDynamicNameConnected ? (
              <div className="p-2 rounded-md border border-teal-500/30 bg-teal-500/5 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium shrink-0">
                    Active Table Name:
                  </span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 truncate max-w-[180px]">
                    &ldquo;{String(effectiveStackName)}&rdquo;
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  ⚡ Dynamically set by connected{' '}
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {String((dynamicSourceNode?.data as any)?.placeholder || 'Desk Text Input')}
                  </span>{' '}
                  node from desk panel.
                </p>
              </div>
            ) : (
              <>
                <input
                  value={stackName}
                  onChange={(e) => updateNodeData({ stackName: e.target.value })}
                  className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 nodrag font-medium"
                  placeholder="e.g. Attendance Daily, Subject Marks..."
                />
                <p className="text-[9px] text-muted-foreground">
                  Manual table name, or connect a <strong>Desk Text Input</strong> node to the <em>Table Name In</em> port.
                </p>
              </>
            )}
          </div>

          {/* Stacking / Alignment Mode */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="size-3 text-indigo-500" />
              Stack Alignment Mode
            </label>
            <select
              value={stackMode}
              onChange={(e) => updateNodeData({ stackMode: e.target.value })}
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 nodrag cursor-pointer"
            >
              <option value="align_columns">📅 Align Columns (e.g. Daily Dates Jul 1, 2...)</option>
              <option value="append_rows">📑 Append Rows (Vertical Stack)</option>
              <option value="replace">🔄 Overwrite (Latest Snapshot)</option>
            </select>
          </div>

          {/* Key Column Input (if align_columns) */}
          {stackMode === 'align_columns' && (
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                <Key className="size-3 text-amber-500" />
                Row Match Key Column
              </label>
              <input
                value={keyColumn}
                onChange={(e) => updateNodeData({ keyColumn: e.target.value })}
                className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 nodrag"
                placeholder="e.g. Enrollment, Name, ID..."
              />
              <p className="text-[9px] text-muted-foreground">
                Matches rows across daily files to append new dates side-by-side.
              </p>
            </div>
          )}

          {/* Incoming Data Preview */}
          {result && result.columns?.length > 0 ? (
            <div className="rounded-md border p-2 bg-muted/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                  Ready to Push
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {result.data.length} rows × {result.columns.length} cols
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {result.columns.slice(0, 4).map((col: string, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                  >
                    {col}
                  </span>
                ))}
                {result.columns.length > 4 && (
                  <span className="text-[9px] text-muted-foreground self-center">
                    +{result.columns.length - 4} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2 italic border rounded bg-muted/20">
              Connect incoming data node to stack
            </div>
          )}

          {/* Push Button & Status */}
          <div className="pt-1 flex flex-col gap-1.5">
            <Button
              size="sm"
              onClick={handlePushToAnalytics}
              disabled={isPushing || !result}
              className="w-full h-7 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPushing ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Syncing to Analytics...
                </>
              ) : (
                <>
                  <UploadCloud className="size-3.5" />
                  Push to Analytics Now
                </>
              )}
            </Button>

            {lastSyncStatus && (
              <div
                className={`flex items-center justify-center gap-1 text-[10px] font-medium py-1 px-2 rounded ${
                  lastSyncStatus === 'synced'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {lastSyncStatus === 'synced' ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    <span>
                      Synced {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : ''}
                      {syncedRows > 0 ? ` (${syncedRows}r × ${syncedCols}c)` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3" />
                    <span>Sync failed — check console</span>
                  </>
                )}
              </div>
            )}
          </div>
        </BaseNodeContent>

        {/* Input & Output Ports */}
        <Handle
          type="target"
          position={Position.Left}
          id="table-name"
          className="w-3.5 h-3.5 bg-teal-500 border-2 border-background shadow-xs hover:scale-110 transition-transform"
          style={{ top: '35%' }}
        />
        <div
          className="absolute left-[-6px] text-[7px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase select-none pointer-events-none"
          style={{ top: '32%', transform: 'translateX(-100%)' }}
        >
          Table Name In
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3.5 h-3.5 bg-violet-600 border-2 border-background shadow-xs hover:scale-110 transition-transform"
          style={{ top: '65%' }}
        />
        <div
          className="absolute left-[-6px] text-[7px] text-violet-500 font-semibold tracking-wider uppercase select-none pointer-events-none"
          style={{ top: '62%', transform: 'translateX(-100%)' }}
        >
          Data In
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3.5 h-3.5 bg-violet-600 border-2 border-background shadow-xs hover:scale-110 transition-transform"
          style={{ top: '50%' }}
        />
        <div
          className="absolute right-[-6px] text-[7px] text-violet-500 font-semibold tracking-wider uppercase select-none pointer-events-none"
          style={{ top: '47%', transform: 'translateX(100%)' }}
        >
          Data Out
        </div>
      </BaseNode>
    </>
  );
});

AnalyticsStackNode.displayName = 'AnalyticsStackNode';
