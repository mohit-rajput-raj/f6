'use client';

import { memo, useCallback, useState } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { Sheet, Settings2, Upload, Plus, CheckCircle2 } from 'lucide-react';
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
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Switch } from "@repo/ui/components/ui/switch";
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { createDataLibraryFile } from '@/app/[project]/dash/[dashid]/(documents)/data-library/actions';


interface SheetEditorConfig {
  targetSheetId?: string;
  targetSheetName?: string;
  blockCode?: string;
  keyColumn?: string;
  createIfNotExists?: boolean;
  columnMappings?: Array<{ source: string; target: string }>;
}

interface Dataset {
  columns: string[];
  data: any[][];
}

interface SheetEditorData {
  title?: string;
  description?: string;
  config?: SheetEditorConfig;
  result?: Dataset;
  rowCount?: number;
  inputColumns?: string[];
  error?: string;
  pushStatus?: {
    rowsUpdated: number;
    rowsInserted: number;
    totalRows: number;
  };
}

export const SheetEditorNode = memo(({ id, data, selected }: { id: string; data: SheetEditorData; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { data: session } = useSession();
  const [isPushing, setIsPushing] = useState(false);

  const config: SheetEditorConfig = data.config || {
    blockCode: '',
    keyColumn: '',
    createIfNotExists: true,
    targetSheetName: 'Main Sheet',
  };

  const availableColumns = data.inputColumns ?? [];
  const inputData = data.result ?? null;

  // Build column mappings preview
  const mappedColumns = availableColumns
    .filter(col => col !== config.keyColumn)
    .map(col => ({
      source: col,
      target: config.blockCode ? `${config.blockCode}_${col}` : col,
    }));

  const updateConfig = useCallback((updates: Partial<SheetEditorConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  // ─── Push to Sheet Logic ─────────────────────────────────
  const handlePushToSheet = useCallback(async () => {
    if (!inputData || !session?.user?.id) {
      toast.error("No data to push or not logged in");
      return;
    }

    if (!config.keyColumn) {
      toast.error("Please select a key column (e.g., rollNumber)");
      return;
    }

    setIsPushing(true);

    try {
      const keyColIdx = inputData.columns.indexOf(config.keyColumn);
      if (keyColIdx === -1) {
        toast.error(`Key column "${config.keyColumn}" not found in input data`);
        return;
      }

      // Build the target columns with block code prefix 
      const targetColumns = [config.keyColumn];
      const sourceColIdxs: number[] = [];

      inputData.columns.forEach((col, idx) => {
        if (col !== config.keyColumn) {
          const targetName = config.blockCode ? `${config.blockCode}_${col}` : col;
          targetColumns.push(targetName);
          sourceColIdxs.push(idx);
        }
      });

      // Build target data rows
      const targetData = inputData.data.map(row => {
        const newRow: any[] = [row[keyColIdx]]; // key column first
        sourceColIdxs.forEach(idx => {
          newRow.push(row[idx]);
        });
        return newRow;
      });

      // If we have a targetSheetId, we'd merge into existing sheet
      // For now, create/update in data library
      if (config.createIfNotExists || !config.targetSheetId) {
        // Create new sheet in data library
        const dashid = typeof window !== 'undefined' ? window.location.pathname.split('/dash/')[1]?.split('/')[0] : undefined;
        await createDataLibraryFile({
          userId: session.user.id,
          name: config.targetSheetName || `Sheet_${config.blockCode || 'output'}`,
          description: `Block-code mapped sheet${config.blockCode ? ` (${config.blockCode})` : ''}`,
          fileType: 'calculated',
          data: { columns: targetColumns, data: targetData },
          metadata: {
            rowCount: targetData.length,
            colCount: targetColumns.length,
            blockCode: config.blockCode,
            keyColumn: config.keyColumn,
            sourceNodeId: id,
          },
          workflowId: dashid,
        });

        // Update node with push status  
        setNodes(nds =>
          nds.map(n =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    pushStatus: {
                      rowsUpdated: 0,
                      rowsInserted: targetData.length,
                      totalRows: targetData.length,
                    },
                  },
                }
              : n
          )
        );

        toast.success(`Pushed ${targetData.length} rows to "${config.targetSheetName || 'Main Sheet'}"`);
      }
    } catch (err) {
      console.error("Push to sheet failed:", err);
      toast.error("Failed to push data to sheet");
    } finally {
      setIsPushing(false);
    }
  }, [inputData, session, config, id, setNodes]);

  return (
    <BaseNode variant="combine" selected={selected} className="min-w-[340px]">
      <BaseNodeHeader variant="combine">
        <BaseNodeIcon variant="combine">
          <Sheet className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Sheet Editor</BaseNodeHeaderTitle>
        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
          No Output
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
        {/* Target Sheet Name */}
        <div className="space-y-1">
          <Label className="text-xs">Target Sheet Name</Label>
          <Input
            value={config.targetSheetName ?? ''}
            onChange={e => updateConfig({ targetSheetName: e.target.value })}
            placeholder="Main Sheet"
            className="h-8 text-sm nodrag"
          />
        </div>

        {/* Block Code */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Settings2 className="size-3 text-muted-foreground" />
            Block / Subject Code
          </Label>
          <Input
            value={config.blockCode ?? ''}
            onChange={e => updateConfig({ blockCode: e.target.value })}
            placeholder="e.g. CS101"
            className="h-8 text-sm nodrag"
          />
          <p className="text-[10px] text-muted-foreground">
            Columns will be prefixed: {config.blockCode || 'CODE'}_columnName
          </p>
        </div>

        {/* Key Column */}
        <div className="space-y-1">
          <Label className="text-xs">Key Column (for row matching)</Label>
          <Select
            value={config.keyColumn}
            onValueChange={(v) => updateConfig({ keyColumn: v })}
            disabled={availableColumns.length === 0}
          >
            <SelectTrigger className="h-8 nodrag">
              <SelectValue placeholder={availableColumns.length === 0 ? "Connect upstream first" : "Select key column"} />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Create if not exists toggle */}
        <div className="flex items-center justify-between py-1 border-t border-border/40 pt-2">
          <Label className="text-xs">Create sheet if not exists</Label>
          <Switch
            checked={config.createIfNotExists ?? true}
            onCheckedChange={(v) => updateConfig({ createIfNotExists: v })}
            className="nodrag"
          />
        </div>

        {/* Column Mapping Preview */}
        {mappedColumns.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Column Mapping Preview</Label>
            <div className="max-h-[100px] overflow-auto border border-border/50 rounded-md text-[10px]">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/70">
                    <th className="px-1.5 py-1 text-left font-medium border-r border-border/40">Source</th>
                    <th className="px-1.5 py-1 text-center font-medium border-r border-border/40">→</th>
                    <th className="px-1.5 py-1 text-left font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {config.keyColumn && (
                    <tr className="border-t border-border/40 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      <td className="px-1.5 py-0.5 font-medium border-r border-border/40">{config.keyColumn}</td>
                      <td className="px-1.5 py-0.5 text-center border-r border-border/40">🔑</td>
                      <td className="px-1.5 py-0.5 font-medium">{config.keyColumn}</td>
                    </tr>
                  )}
                  {mappedColumns.map((m, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-1.5 py-0.5 border-r border-border/40">{m.source}</td>
                      <td className="px-1.5 py-0.5 text-center border-r border-border/40">→</td>
                      <td className="px-1.5 py-0.5 text-fuchsia-600 dark:text-fuchsia-400 font-medium">{m.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Push button */}
        {inputData && (
          <Button
            variant="outline"
            size="sm"
            className="w-full nodrag bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30"
            onClick={handlePushToSheet}
            disabled={isPushing || !config.keyColumn}
          >
            <Upload className="size-3.5 mr-1.5" />
            {isPushing ? 'Pushing...' : `Push ${inputData.data.length} rows to sheet`}
          </Button>
        )}

        {/* Push status */}
        {data.pushStatus && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-2 border-t border-border/40 flex items-center justify-center gap-1">
            <CheckCircle2 className="size-3.5" />
            {data.pushStatus.rowsInserted} inserted, {data.pushStatus.rowsUpdated} updated ({data.pushStatus.totalRows} total)
          </div>
        )}

        {/* Error display */}
        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-md">
            ⚠ {data.error}
          </div>
        )}

        {!inputData && (
          <div className="text-xs text-muted-foreground text-center py-3 italic">
            Run workflow to see data preview...
          </div>
        )}
      </BaseNodeContent>

      {/* Input handle only — NO output handle */}
      <NodeHandle
        variant="combine"
        type="target"
        position={Position.Left}
        id="in"
      />
    </BaseNode>
  );
});

SheetEditorNode.displayName = "SheetEditorNode";
