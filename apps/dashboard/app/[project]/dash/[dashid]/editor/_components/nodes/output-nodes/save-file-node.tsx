'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Save, Folder, FileSpreadsheet, RefreshCw, CheckCircle2, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { Switch } from "@repo/ui/components/ui/switch";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  getAllFoldersFlat,
  getFilesInFolder,
  createOrOverwriteWorkspaceFile,
  WorkspaceFolderItem,
  WorkspaceFileItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions";

interface Dataset {
  columns: string[];
  data: any[][];
}

export const SaveFileNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [folders, setFolders] = useState<WorkspaceFolderItem[]>([]);
  const [existingFiles, setExistingFiles] = useState<WorkspaceFileItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const dataset: Dataset | null = data.text || data.result || null;
  const fileName = data.fileName ?? '';
  const folderPath = data.folderPath ?? data.folderName ?? '';
  const lastSavedAt = data.lastSavedAt ?? null;
  const wasOverwritten = data.wasOverwritten ?? false;
  const autoSave = data.autoSave !== false;

  const toggleAutoSave = useCallback((checked: boolean) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, autoSave: checked } } : n
      )
    );
  }, [id, setNodes]);

  // Extract dashid from pathname
  const dashid = typeof window !== 'undefined'
    ? window.location.pathname.split('/dash/')[1]?.split('/')[0]
    : undefined;

  // Fetch available folders for this project
  const fetchFolders = useCallback(async () => {
    if (!dashid) return;
    setLoadingFolders(true);
    try {
      const res = await getAllFoldersFlat(dashid);
      setFolders(res);
    } catch (err) {
      console.error('Failed to load folders for SaveFileNode:', err);
    } finally {
      setLoadingFolders(false);
    }
  }, [dashid]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Fetch existing files inside currently selected folder path
  const fetchExistingFiles = useCallback(async (path: string) => {
    if (!dashid) return;
    setLoadingFiles(true);
    try {
      const res = await getFilesInFolder(dashid, path);
      setExistingFiles(res);
    } catch (err) {
      console.error('Failed to load existing files for SaveFileNode:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [dashid]);

  useEffect(() => {
    fetchExistingFiles(folderPath);
  }, [folderPath, fetchExistingFiles]);

  const updateFileName = useCallback((name: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, fileName: name } } : n
      )
    );
  }, [id, setNodes]);

  const updateFolderPath = useCallback((path: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, folderPath: path, folderName: path } } : n
      )
    );
  }, [id, setNodes]);

  // Save / Overwrite trigger
  const handleSaveNow = useCallback(async () => {
    if (!dataset || !dataset.columns || !dataset.data) {
      toast.error('No dataset connected to save');
      return;
    }
    const finalFileName = (fileName || data.dynamicFileName || 'output_file').trim();
    if (!finalFileName) {
      toast.error('Please specify a file name');
      return;
    }
    if (!dashid || !userId) {
      toast.error('Project or User session not found');
      return;
    }

    setSaving(true);
    try {
      const targetFolderPath = (data.dynamicFolderName || data.dynamicFolderPath || folderPath || '').trim();
      const res = await createOrOverwriteWorkspaceFile({
        dashid,
        userId,
        folderPath: targetFolderPath,
        fileName: finalFileName.endsWith('.csv') ? finalFileName : `${finalFileName}.csv`,
        data: dataset,
        fileType: 'csv',
        metadata: {
          rowCount: dataset.data.length,
          colCount: dataset.columns.length,
          sourceNodeId: id,
        },
      });

      setNodes(nds =>
        nds.map(n =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  lastSavedAt: new Date().toLocaleTimeString(),
                  wasOverwritten: res.overwritten,
                },
              }
            : n
        )
      );

      if (res.overwritten) {
        toast.success(`Overwrote existing file "${finalFileName}" in Files`);
      } else {
        toast.success(`Saved new file "${finalFileName}" to Files`);
      }
      fetchExistingFiles(targetFolderPath);
    } catch (err: any) {
      console.error('Failed to save file:', err);
      toast.error(err?.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  }, [dataset, fileName, data.dynamicFileName, data.dynamicFolderName, data.dynamicFolderPath, folderPath, dashid, userId, id, setNodes, fetchExistingFiles]);

  const rowCount = dataset?.data?.length ?? 0;
  const colCount = dataset?.columns?.length ?? 0;

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px] shadow-lg border-indigo-500/20">
        <BaseNodeHeader className="border-b flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Save className="size-4" />
            <BaseNodeHeaderTitle>Save to Files</BaseNodeHeaderTitle>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
            Output
          </span>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3.5 space-y-3">
          {/* Auto Save Toggle (Slide Button) */}
          <div className="flex items-center justify-between p-2 rounded-md border bg-muted/30 gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">Auto Save on Run</span>
                {autoSave ? (
                  <Badge className="h-4 px-1 text-[9px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-mono">
                    ON
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground font-mono">
                    OFF
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {autoSave
                  ? 'Automatically saves/overwrites to Files when workflow executes'
                  : 'Manual save only (skipped on workflow execution)'}
              </p>
            </div>
            <Switch
              checked={autoSave}
              onCheckedChange={toggleAutoSave}
              className="nodrag shrink-0 data-[state=checked]:bg-indigo-600 cursor-pointer"
            />
          </div>

          {/* Target Folder Selector or Custom Path */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Folder className="size-3.5 text-indigo-500" />
                <span>Destination Folder Path</span>
              </Label>
              <button
                onClick={fetchFolders}
                className="text-[10px] text-muted-foreground hover:text-foreground"
                title="Refresh folders"
              >
                <RefreshCw className={`size-3 ${loadingFolders ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {data.dynamicFolderName || data.dynamicFolderPath ? (
              <div className="rounded border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 font-mono">
                Port: /{data.dynamicFolderName || data.dynamicFolderPath}
              </div>
            ) : (
              <div className="space-y-1.5">
                <select
                  value={folderPath}
                  onChange={e => updateFolderPath(e.target.value)}
                  className="w-full rounded border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">📁 Root / (Files)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.path}>
                      📁 /{f.path}
                    </option>
                  ))}
                </select>
                <Input
                  value={folderPath}
                  onChange={e => updateFolderPath(e.target.value)}
                  placeholder="or type nested path e.g. A/B/C"
                  className="h-7 text-[11px] font-mono"
                />
              </div>
            )}
          </div>

          {/* File Name Section: Dropdown for existing files + Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="size-3.5 text-emerald-500" />
                <span>File Name</span>
              </Label>
              <div className="flex items-center gap-1.5">
                {fileName && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fileName);
                      setCopied(true);
                      toast.success(`Copied "${fileName}" to clipboard`);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted"
                    title="Copy file name"
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchExistingFiles(folderPath)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  title="Refresh files in folder"
                >
                  <RefreshCw className={`size-3 ${loadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {data.dynamicFileName ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-300 font-mono">
                Port: {data.dynamicFileName}
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Dropdown to pick existing file */}
                <select
                  value={existingFiles.some(f => f.name === fileName) ? fileName : ""}
                  onChange={e => {
                    if (e.target.value) {
                      updateFileName(e.target.value);
                    }
                  }}
                  className="w-full rounded border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                >
                  <option value="">
                    {loadingFiles
                      ? "Loading files..."
                      : existingFiles.length === 0
                      ? "-- No existing files in this folder --"
                      : "-- Select existing file to overwrite --"}
                  </option>
                  {existingFiles.map(f => (
                    <option key={f.id} value={f.name}>
                      📄 {f.name}
                    </option>
                  ))}
                </select>

                {/* Input for typing / editing file name */}
                <Input
                  value={fileName}
                  onChange={e => updateFileName(e.target.value)}
                  placeholder="or type file name e.g. daily_attendance.csv"
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              ⚡ Overwrites if file exists in destination folder
            </p>
          </div>

          {/* Dataset Status Pill */}
          {dataset ? (
            <div className="rounded-md border bg-muted/40 p-2 text-center text-xs">
              <span className="font-semibold text-foreground">{rowCount}</span> rows ×{' '}
              <span className="font-semibold text-foreground">{colCount}</span> columns
              {lastSavedAt && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {wasOverwritten ? 'Overwritten' : 'Saved'} at {lastSavedAt}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground text-center py-2 italic border rounded border-dashed">
              Connect dataset to &apos;data&apos; handle
            </div>
          )}

          {/* Manual Trigger Button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSaveNow}
            disabled={saving || !dataset}
          >
            <Save className="size-3.5" />
            <span>{saving ? 'Saving...' : 'Save / Overwrite to Files'}</span>
          </Button>
        </BaseNodeContent>

        {/* Input Handles (Left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="data"
          className="w-3 h-3 bg-indigo-600 top-[25%]"
          title="Dataset (columns & data)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="file-name"
          className="w-3 h-3 bg-emerald-600 top-[55%]"
          title="Dynamic File Name (Text)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="folder-name"
          className="w-3 h-3 bg-amber-600 top-[82%]"
          title="Dynamic Folder Path (e.g. A/B/C)"
        />

        {/* Pass-through Output Handle (Right) */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-indigo-600 top-[50%]"
          title="Pass-through Dataset"
        />
      </BaseNode>
    </>
  );
});

SaveFileNode.displayName = "SaveFileNode";
