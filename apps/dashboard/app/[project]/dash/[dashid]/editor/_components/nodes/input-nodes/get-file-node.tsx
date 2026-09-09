'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FolderOpen, FileSpreadsheet, RefreshCw, Copy, Check } from 'lucide-react';
import Papa from 'papaparse';
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
import { Label } from "@repo/ui/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  getAllFoldersFlat,
  getFilesInFolder,
  getWorkspaceFileByPath,
  WorkspaceFolderItem,
  WorkspaceFileItem,
} from "@/app/[project]/dash/[dashid]/files/_actions/files-actions";

export const GetFileNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const { data: session } = useSession();

  const [folders, setFolders] = useState<WorkspaceFolderItem[]>([]);
  const [filesInFolder, setFilesInFolder] = useState<WorkspaceFileItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedFolderPath = data.folderPath ?? data.folderName ?? '';
  const selectedFileName = data.fileName ?? '';
  const dataset = data.text || data.result || null;
  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];

  // Extract dashid from pathname
  const dashid = typeof window !== 'undefined'
    ? window.location.pathname.split('/dash/')[1]?.split('/')[0]
    : undefined;

  // Copy file name handler
  const handleCopyFileName = useCallback(() => {
    const fName = selectedFileName || data.dynamicFileName;
    if (!fName) {
      toast.error('No file selected to copy');
      return;
    }
    navigator.clipboard.writeText(fName);
    setCopied(true);
    toast.success(`Copied "${fName}" to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedFileName, data.dynamicFileName]);

  // 1. Fetch folders flat list
  const fetchFolders = useCallback(async () => {
    if (!dashid) return;
    setLoadingFolders(true);
    try {
      const res = await getAllFoldersFlat(dashid);
      setFolders(res);
    } catch (err) {
      console.error('Failed to load folders for GetFileNode:', err);
    } finally {
      setLoadingFolders(false);
    }
  }, [dashid]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // 2. Fetch files inside selected folder path
  const fetchFiles = useCallback(async (path: string) => {
    if (!dashid) return;
    setLoadingFiles(true);
    try {
      const res = await getFilesInFolder(dashid, path);
      setFilesInFolder(res);
    } catch (err) {
      console.error('Failed to load files for GetFileNode:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [dashid]);

  useEffect(() => {
    fetchFiles(selectedFolderPath);
  }, [selectedFolderPath, fetchFiles]);

  // Select folder path handler
  const handleFolderChange = useCallback((path: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                folderPath: path,
                folderName: path,
                fileName: '', // Reset selected file
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // Select file handler
  const handleFileChange = useCallback((fName: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                fileName: fName,
              },
            }
          : n
      )
    );
  }, [id, setNodes]);

  // Load file data
  const loadFileContent = useCallback(async (targetFileName?: string) => {
    const fName = targetFileName || selectedFileName || data.dynamicFileName;
    if (!fName || !dashid) {
      toast.error('Please select or specify a file');
      return;
    }

    setLoadingFileContent(true);
    try {
      const fFolder = (data.dynamicFolderName || data.dynamicFolderPath || selectedFolderPath || '').trim();
      const fileRecord = await getWorkspaceFileByPath({
        dashid,
        folderPath: fFolder,
        fileName: fName,
      });

      if (!fileRecord?.data) {
        toast.error(`File "${fName}" not found in path "${fFolder || 'Root'}"`);
        return;
      }

      // Robust extraction for any data format:
      let fileData: { columns: string[]; data: any[][] } = { columns: [], data: [] };
      const raw = fileRecord.data;

      if (raw && Array.isArray(raw.columns) && Array.isArray(raw.data)) {
        fileData = raw;
      } else if (raw?.data && Array.isArray(raw.data.columns) && Array.isArray(raw.data.data)) {
        fileData = raw.data;
      } else if (typeof raw === 'string') {
        const parsed = Papa.parse(raw, { skipEmptyLines: true });
        const pRows = (parsed.data as any[][]) || [];
        if (pRows.length > 0) {
          const cols = pRows[0].map((c: any, i: number) => (c ? String(c).trim() : `Col_${i + 1}`));
          fileData = { columns: cols, data: pRows.slice(1) };
        }
      } else if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (first && typeof first === 'object' && !Array.isArray(first)) {
          const cols = Object.keys(first);
          const rws = raw.map((item: any) => cols.map(c => (item[c] !== undefined && item[c] !== null ? item[c] : '')));
          fileData = { columns: cols, data: rws };
        }
      }

      setNodes(nds =>
        nds.map(n =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  text: fileData,
                  result: fileData,
                  columns: fileData.columns || [],
                  rowCount: fileData.data?.length ?? 0,
                  fileName: fileRecord.name,
                  folderPath: fileRecord.folderPath,
                },
              }
            : n
        )
      );

      toast.success(`Loaded "${fileRecord.name}" (${fileData.data?.length ?? 0} rows)`);
    } catch (err: any) {
      console.error('Failed to load file content:', err);
      toast.error(err?.message || 'Failed to load file content');
    } finally {
      setLoadingFileContent(false);
    }
  }, [selectedFileName, data.dynamicFileName, data.dynamicFolderName, data.dynamicFolderPath, dashid, selectedFolderPath, id, setNodes]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px] shadow-lg border-teal-500/20">
        <BaseNodeHeader className="border-b flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            <BaseNodeHeaderTitle>Get from Files</BaseNodeHeaderTitle>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
            Input
          </span>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3.5 space-y-3">
          {/* Folder Path Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FolderOpen className="size-3.5 text-teal-500" />
                <span>Source Folder Path</span>
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
              <div className="rounded border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/30 px-2.5 py-1.5 text-xs text-teal-600 dark:text-teal-300 font-mono">
                Port: /{data.dynamicFolderName || data.dynamicFolderPath}
              </div>
            ) : (
              <select
                value={selectedFolderPath}
                onChange={e => handleFolderChange(e.target.value)}
                className="w-full rounded border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">📁 Root / (Files)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.path}>
                    📁 /{f.path}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="size-3.5 text-emerald-500" />
                <span>Select File</span>
              </Label>
              <div className="flex items-center gap-1.5">
                {(selectedFileName || data.dynamicFileName) && (
                  <button
                    type="button"
                    onClick={handleCopyFileName}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-muted font-medium cursor-pointer"
                    title="Copy file name"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy name</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchFiles(selectedFolderPath)}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Refresh file list"
                >
                  <RefreshCw className={`size-3 ${loadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {data.dynamicFileName ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-300 font-mono flex items-center justify-between">
                <span>Port: {data.dynamicFileName}</span>
                <button
                  type="button"
                  onClick={handleCopyFileName}
                  className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                  title="Copy file name"
                >
                  {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={selectedFileName}
                  onChange={e => {
                    handleFileChange(e.target.value);
                    loadFileContent(e.target.value);
                  }}
                  className="w-full rounded border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                >
                  <option value="">
                    {loadingFiles
                      ? "Loading files..."
                      : filesInFolder.length === 0
                      ? "-- No files in this folder --"
                      : "-- Choose file --"}
                  </option>
                  {filesInFolder.map(f => (
                    <option key={f.id} value={f.name}>
                      📄 {f.name}
                    </option>
                  ))}
                </select>

                {selectedFileName && (
                  <div className="flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                    <span className="truncate max-w-[210px] text-foreground font-medium">{selectedFileName}</span>
                    <button
                      type="button"
                      onClick={handleCopyFileName}
                      className="hover:text-foreground p-0.5 rounded hover:bg-muted/80 flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer"
                      title="Copy file name to clipboard"
                    >
                      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dataset Status / Columns Preview */}
          {rows.length > 0 ? (
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-2 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-foreground">{rows.length} rows loaded</span>
                <span className="text-muted-foreground">{columns.length} columns</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {columns.map((col, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground text-center py-2 italic border rounded border-dashed">
              No file loaded yet
            </div>
          )}

          {/* Load / Refresh Button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => loadFileContent()}
            disabled={loadingFileContent}
          >
            <RefreshCw className={`size-3.5 ${loadingFileContent ? 'animate-spin' : ''}`} />
            <span>{loadingFileContent ? 'Loading...' : 'Load / Refresh File'}</span>
          </Button>
        </BaseNodeContent>

        {/* Input Handles (Left - Optional Dynamic overrides) */}
        <Handle
          type="target"
          position={Position.Left}
          id="folder-name"
          className="w-3 h-3 bg-amber-600 top-[35%]"
          title="Dynamic Folder Path (e.g. A/B/C)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="file-name"
          className="w-3 h-3 bg-emerald-600 top-[65%]"
          title="Dynamic File Name"
        />

        {/* Output Handle (Right) */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-teal-600 top-[50%]"
          title="Dataset (columns & data)"
        />
      </BaseNode>
    </>
  );
});

GetFileNode.displayName = "GetFileNode";
