'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { RefreshCcw, Pencil, X, Check } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Label } from "@repo/ui/components/ui/label";

interface UpdateMergeConfig {
  keyColumn?: string;
  columnFormulas?: Record<string, string>; // per-column custom formulas, e.g. { "total": "left + right", "percentage": "(present / total) * 100" }
  targetColumns?: string[];
}

/** Inline formula editor for a single column */
const ColumnFormulaEditor = ({
  column,
  formula,
  allColumns,
  onSave,
  onRemove,
}: {
  column: string;
  formula: string;
  allColumns: string[];
  onSave: (col: string, formula: string) => void;
  onRemove: (col: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formula);

  const handleSave = () => {
    onSave(column, draft.trim() || 'left + right');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(formula); setEditing(false); }
  };

  return (
    <div className="border rounded-lg p-2 bg-card space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate max-w-[120px]">
          {column}
        </span>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900 transition" title="Save">
                <Check className="size-3 text-green-600" />
              </button>
              <button onClick={() => { setDraft(formula); setEditing(false); }} className="p-0.5 rounded hover:bg-muted transition" title="Cancel">
                <X className="size-3 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-muted transition" title="Edit formula">
              <Pencil className="size-3 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => onRemove(column)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 transition" title="Remove column">
            <X className="size-3 text-red-400" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. left + right"
            className="w-full text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
          />
          <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5">
            <div><code className="bg-muted px-1 rounded text-amber-600">left</code> = existing value, <code className="bg-muted px-1 rounded text-amber-600">right</code> = new value</div>
            <div>Use column names: {allColumns.slice(0, 6).map(c => (
              <code key={c} className="bg-muted px-1 rounded mx-0.5">{c}</code>
            ))}{allColumns.length > 6 && <span> ...</span>}</div>
            <div>Examples: <code className="bg-muted px-1 rounded">left + right</code> · <code className="bg-muted px-1 rounded">right</code> · <code className="bg-muted px-1 rounded">(present / total) * 100</code></div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate">
          {column} = {formula || 'left + right'}
        </div>
      )}
    </div>
  );
};

export const UpdateMergeNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: UpdateMergeConfig = data.config || {};
  const leftColumns: string[] = data.leftColumns ?? [];
  const rightColumns: string[] = data.rightColumns ?? [];
  const allColumns = [...new Set([...leftColumns, ...rightColumns])];

  const columnFormulas: Record<string, string> = config.columnFormulas ?? {};
  const targetCols = config.targetColumns ?? [];

  const updateConfig = useCallback((updates: Partial<UpdateMergeConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  const addColumn = useCallback((col: string) => {
    if (targetCols.includes(col)) return;
    const newTargets = [...targetCols, col];
    const newFormulas = { ...columnFormulas, [col]: 'left + right' };
    updateConfig({ targetColumns: newTargets, columnFormulas: newFormulas });
  }, [targetCols, columnFormulas, updateConfig]);

  const removeColumn = useCallback((col: string) => {
    const newTargets = targetCols.filter(c => c !== col);
    const newFormulas = { ...columnFormulas };
    delete newFormulas[col];
    updateConfig({ targetColumns: newTargets, columnFormulas: newFormulas });
  }, [targetCols, columnFormulas, updateConfig]);

  const setFormula = useCallback((col: string, formula: string) => {
    const newFormulas = { ...columnFormulas, [col]: formula };
    updateConfig({ columnFormulas: newFormulas });
  }, [columnFormulas, updateConfig]);

  const selectAll = useCallback(() => {
    const newFormulas = { ...columnFormulas };
    allColumns.forEach(c => { if (!newFormulas[c]) newFormulas[c] = 'left + right'; });
    updateConfig({ targetColumns: [...allColumns], columnFormulas: newFormulas });
  }, [allColumns, columnFormulas, updateConfig]);

  const deselectAll = useCallback(() => {
    updateConfig({ targetColumns: [], columnFormulas: {} });
  }, [updateConfig]);

  // Columns not yet selected
  const availableColumns = allColumns.filter(c => !targetCols.includes(c));

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[340px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-amber-700 text-white">
          <RefreshCcw className="size-4" />
          <BaseNodeHeaderTitle>Update Merge</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-amber-50 dark:bg-amber-950 p-2 rounded leading-relaxed">
            Merges "New" data into "Existing" by matching a key column.
            Set a <strong>custom formula</strong> for each column — use <code className="bg-white/50 dark:bg-black/30 px-1 rounded">left</code> (existing) and <code className="bg-white/50 dark:bg-black/30 px-1 rounded">right</code> (new) as variables.
          </p>

          {/* Key Column */}
          <div className="space-y-1">
            <Label className="text-xs">Match Key Column</Label>
            <Select value={config.keyColumn} onValueChange={v => updateConfig({ keyColumn: v })} disabled={allColumns.length === 0}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={allColumns.length === 0 ? "Connect inputs" : "Select key"} />
              </SelectTrigger>
              <SelectContent>
                {allColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Formulas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Column Formulas</Label>
              {allColumns.length > 0 && (
                <div className="flex gap-1">
                  <button onClick={selectAll} className="text-[10px] px-2 py-0.5 rounded border bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 transition">
                    All
                  </button>
                  <button onClick={deselectAll} className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted transition">
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Selected columns with formulas */}
            {targetCols.length > 0 && (
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {targetCols.map(col => (
                  <ColumnFormulaEditor
                    key={col}
                    column={col}
                    formula={columnFormulas[col] ?? 'left + right'}
                    allColumns={allColumns}
                    onSave={setFormula}
                    onRemove={removeColumn}
                  />
                ))}
              </div>
            )}

            {/* Available (unselected) columns */}
            {availableColumns.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-muted-foreground mb-1">Click to add:</div>
                <div className="flex flex-wrap gap-1">
                  {availableColumns.map(col => (
                    <button
                      key={col}
                      onClick={() => addColumn(col)}
                      className="text-xs px-2 py-0.5 rounded-full border transition bg-background hover:bg-amber-100 dark:hover:bg-amber-900 hover:border-amber-400"
                    >
                      + {col}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allColumns.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3 border rounded">
                Connect inputs first
              </div>
            )}
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-amber-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows after update
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-amber-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-amber-400" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-amber-600" />
      </BaseNode>
    </>
  );
});

UpdateMergeNode.displayName = "UpdateMergeNode";
