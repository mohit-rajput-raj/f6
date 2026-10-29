'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, RefreshCw, FolderOpen } from 'lucide-react';
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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  getMasterSheets,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";

interface MasterSheetItem {
  id: string;
  name: string;
  data: any;
  metadata: any;
}

/**
 * MasterSheetLibraryNode — loads an existing MasterSheet from the DB library.
 * The user picks from saved master sheets, or connects a sheet name via input port.
 * If the name doesn't match any sheet, outputs an empty dataset (auto-create happens downstream).
 */
export const MasterSheetLibraryNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();
  const { setNodes } = useReactFlow();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const [sheets, setSheets] = useState<MasterSheetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const dataset = data.text;
  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];
  const selectedSheetId = data.masterSheetId ?? null;
  const resolvedName = data.resolvedSheetName || data.config?.sheetName || '';

  // Fetch master sheets from DB
  const fetchSheets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getMasterSheets(userId, userEmail ?? undefined);
      setSheets(result as MasterSheetItem[]);
    } catch (err) {
      console.error('Failed to fetch master sheets:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  // Load a specific sheet's data
  const loadSheet = useCallback(async (sheet: MasterSheetItem) => {
    setLoadingSheet(true);
    try {
      const sheetData = sheet.data as any;
      if (!sheetData || !sheetData.columns) {
        toast.error('Sheet has no data');
        setLoadingSheet(false);
        return;
      }

      setNodes(nds =>
        nds.map(n =>
          n.id === id
            ? {
              ...n,
              data: {
                ...n.data,
                text: { columns: sheetData.columns, data: sheetData.data },
                masterSheetId: sheet.id,
                masterSheetName: sheet.name,
                inputColumns: sheetData.columns,
                rowCount: sheetData.data?.length ?? 0,
              },
            }
            : n
        )
      );
      toast.success(`Loaded "${sheet.name}"`);
    } catch (err) {
      console.error('Failed to load master sheet:', err);
      toast.error('Failed to load master sheet');
    } finally {
      setLoadingSheet(false);
    }
  }, [id, setNodes]);

  // When a name comes via port, try to find and auto-load matching sheet
  useEffect(() => {
    if (resolvedName && sheets.length > 0 && !loadingSheet) {
      const match = sheets.find(s => s.name.toLowerCase() === resolvedName.toLowerCase());
      if (match && match.id !== selectedSheetId) {
        loadSheet(match);
      }
    }
  }, [resolvedName, sheets, selectedSheetId]);

  return (
    <BaseNode variant="input" className="min-w-[290px] max-w-[320px]">
      <BaseNodeHeader variant="input">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="input">
            <Database className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>MasterSheet Library</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <button
            onClick={fetchSheets}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition cursor-pointer nodrag"
            title="Refresh sheet list"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {/* Resolved name indicator */}
          {resolvedName && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedSheetId ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] text-muted-foreground">
                Sheet: <span className="font-semibold text-foreground">{resolvedName}</span>
              </span>
            </div>
          )}

          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <RefreshCw className="size-3 animate-spin" />
              Loading sheets...
            </div>
          ) : sheets.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3 italic flex flex-col items-center gap-2">
              <FolderOpen className="size-5 opacity-50" />
              No master sheets found.
              <br />
              Push data from workflow or create from Sheet Library.
            </div>
          ) : (
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {sheets.map(sheet => (
                <button
                  key={sheet.id}
                  onClick={() => loadSheet(sheet)}
                  disabled={loadingSheet}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition border ${selectedSheetId === sheet.id
                    ? 'bg-orange-100 dark:bg-orange-900 border-orange-500'
                    : 'hover:bg-muted border-transparent'
                    } ${loadingSheet ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="font-medium truncate">{sheet.name}</div>
                  {(sheet.data as any)?.columns && (
                    <div className="text-[10px] text-muted-foreground">
                      {(sheet.data as any)?.columns?.length ?? '?'} cols × {(sheet.data as any)?.data?.length ?? 0} rows
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {columns.length > 0 && (
            <>
              <div className="text-xs text-orange-600 font-semibold text-center border-t pt-1">
                {rows.length} rows × {columns.length} columns
              </div>
              <div className="flex flex-wrap gap-1">
                {columns.slice(0, 10).map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700"
                  >
                    {col}
                  </span>
                ))}
                {columns.length > 10 && (
                  <span className="text-[10px] text-muted-foreground">+{columns.length - 10} more</span>
                )}
              </div>
            </>
          )}
        </BaseNodeContent>

      <NodeHandle
        variant="input"
        type="target"
        position={Position.Left}
        id="sheet-name"
        style={{ top: '50%' }}
      />
      <div className="absolute left-[-4px] text-[8px] text-sky-500 font-medium" style={{ top: '45%', transform: 'translateX(-100%)' }}>
        Sheet Name
      </div>

      <NodeHandle
        variant="input"
        type="source"
        position={Position.Right}
        id="out"
      />
    </BaseNode>
  );
});

MasterSheetLibraryNode.displayName = "MasterSheetLibraryNode";
