'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, FolderOpen, RefreshCw } from 'lucide-react';
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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  getDataLibraryFiles,
  getDataLibraryFile,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/actions";

interface FileListItem {
  id: string;
  name: string;
  fileType: string;
  metadata: any;
}

/**
 * DataLibraryInputNode — loads a dataset from the Data Library (DB-backed).
 * The user picks from their saved files/datasets.
 */
export const DataLibraryInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();
  const { setNodes } = useReactFlow();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  const dataset = data.text;
  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];
  const selectedFileId = data.dataLibraryFileId ?? null;

  // Fetch file list from DB
  const fetchFiles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getDataLibraryFiles(userId);
      setFiles(result as any);
    } catch (err) {
      console.error('Failed to fetch data library files:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Load a specific file's data
  const loadFile = useCallback(async (fileId: string) => {
    if (!userId) return;
    setLoadingFile(true);
    try {
      const file = await getDataLibraryFile(fileId, userId);
      if (!file?.data) {
        toast.error('File has no data');
        return;
      }
      const fileData = file.data as any;

      setNodes(nds =>
        nds.map(n =>
          n.id === id
            ? {
              ...n,
              data: {
                ...n.data,
                text: { columns: fileData.columns, data: fileData.data },
                dataLibraryFileId: fileId,
                inputColumns: fileData.columns,
                rowCount: fileData.data.length,
              },
            }
            : n
        )
      );
      toast.success(`Loaded "${file.name}"`);
    } catch (err) {
      console.error('Failed to load file:', err);
      toast.error('Failed to load file');
    } finally {
      setLoadingFile(false);
    }
  }, [id, setNodes, userId]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="max-w-[300px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-emerald-700 text-white">
          <Database className="size-4" />
          <BaseNodeHeaderTitle>Data Library</BaseNodeHeaderTitle>
          <button
            onClick={fetchFiles}
            className="ml-auto p-0.5 rounded hover:bg-white/20 transition"
            title="Refresh file list"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <RefreshCw className="size-3 animate-spin" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3 italic flex flex-col items-center gap-2">
              <FolderOpen className="size-5 opacity-50" />
              No files in Data Library.
              <br />
              Upload files or save workflow outputs first.
            </div>
          ) : (
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => loadFile(file.id)}
                  disabled={loadingFile}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition border ${selectedFileId === file.id
                    ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-500'
                    : 'hover:bg-muted border-transparent'
                    } ${loadingFile ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="font-medium truncate">{file.name}</div>
                  {(file.metadata as any)?.rowCount !== undefined && (
                    <div className="text-[10px] text-muted-foreground">
                      {(file.metadata as any).colCount ?? '?'} cols × {(file.metadata as any).rowCount} rows
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {columns.length > 0 && (
            <>
              <div className="text-xs text-emerald-600 font-semibold text-center border-t pt-1">
                {rows.length} rows × {columns.length} columns
              </div>
              <div className="flex flex-wrap gap-1">
                {columns.slice(0, 10).map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
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

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-emerald-600"
        />
      </BaseNode>
    </>
  );
});

DataLibraryInputNode.displayName = "DataLibraryInputNode";
