'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import {
  getDataLibraryFiles,
  createDataLibraryFile,
  deleteDataLibraryFile,
} from './actions';
import {
  Database,
  Upload,
  Trash2,
  FileSpreadsheet,
  Search,
  Grid3X3,
  List,
  FolderOpen,
  Download,
  Eye,
  Plus,
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Spreadsheet from 'react-spreadsheet';

interface DataLibraryFileItem {
  id: string;
  name: string;
  description: string | null;
  fileType: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  workflowId: string | null;
}

interface PreviewData {
  columns: string[];
  data: any[][];
}

const DataLibrary = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<DataLibraryFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch files from DB
  const fetchFiles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getDataLibraryFiles(userId);
      setFiles(result as any);
    } catch (err) {
      console.error('Failed to fetch files:', err);
      toast.error('Failed to load data library');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let columns: string[] = [];
      let data: any[][] = [];

      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
        const rows = parsed.data as string[][];
        columns = rows[0] || [];
        data = rows.slice(1);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        columns = (jsonData[0] || []).map(String);
        data = jsonData.slice(1);
      } else {
        toast.error('Unsupported file type. Use .csv or .xlsx');
        setUploading(false);
        return;
      }

      await createDataLibraryFile({
        userId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileType: ext || 'csv',
        data: { columns, data },
        metadata: {
          rowCount: data.length,
          colCount: columns.length,
          fileSize: file.size,
          originalFileName: file.name,
        },
      });

      toast.success(`Uploaded "${file.name}" successfully`);
      await fetchFiles();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete handler
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!userId) return;
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
      await deleteDataLibraryFile(fileId, userId);
      toast.success(`Deleted "${fileName}"`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (previewFile === fileId) {
        setPreviewFile(null);
        setPreviewData(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Delete failed');
    }
  };

  // Download handler
  const handleDownload = async (fileId: string, fileName: string) => {
    if (!userId) return;
    try {
      const { getDataLibraryFile } = await import('./actions');
      const file = await getDataLibraryFile(fileId, userId);
      if (!file?.data) {
        toast.error('No data found');
        return;
      }
      const fileData = file.data as any;
      const header = (fileData.columns || []).join(',');
      const rows = (fileData.data || []).map((row: any[]) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed');
    }
  };

  // Preview handler
  const handlePreview = async (fileId: string) => {
    if (previewFile === fileId) {
      setPreviewFile(null);
      setPreviewData(null);
      return;
    }
    if (!userId) return;
    try {
      const { getDataLibraryFile } = await import('./actions');
      const file = await getDataLibraryFile(fileId, userId);
      if (!file?.data) {
        toast.error('No data to preview');
        return;
      }
      const d = file.data as any;
      setPreviewFile(fileId);
      setPreviewData({ columns: d.columns || [], data: (d.data || []).slice(0, 50) });
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  // Filtered files
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access the Data Library.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Database className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Library</h1>
            <p className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''} stored
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition ${viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition ${viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <List className="size-4" />
            </button>
          </div>

          {/* Upload */}
          <label>
            <Button disabled={uploading} asChild className="cursor-pointer">
              <span>
                <Upload className="size-4 mr-1" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search files..."
          className="pl-10"
        />
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <span className="text-sm">Loading files...</span>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-muted-foreground">
          <FolderOpen className="size-12 opacity-40" />
          <div className="text-center">
            <p className="text-lg font-medium mb-1">
              {searchTerm ? 'No files match your search' : 'Your Data Library is empty'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term' : 'Upload CSV or Excel files, or save workflow outputs here'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium uppercase">
                  {file.fileType}
                </span>
              </div>

              <h3 className="font-semibold text-sm truncate mb-1">{file.name}</h3>
              {file.description && (
                <p className="text-xs text-muted-foreground truncate mb-2">{file.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                {(file.metadata as any)?.rowCount !== undefined && (
                  <span>{(file.metadata as any).rowCount} rows</span>
                )}
                {(file.metadata as any)?.colCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{(file.metadata as any).colCount} cols</span>
                  </>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground mb-3">
                {new Date(file.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handlePreview(file.id)}
                >
                  <Eye className="size-3 mr-1" /> Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleDownload(file.id, file.name)}
                >
                  <Download className="size-3 mr-1" /> Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(file.id, file.name)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Size</th>
                <th className="text-left px-4 py-2 font-medium">Updated</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id} className="border-b hover:bg-muted/30 transition">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                  </td>
                  <td className="px-4 py-2.5 uppercase text-xs text-muted-foreground">
                    {file.fileType}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {(file.metadata as any)?.rowCount ?? '?'} rows × {(file.metadata as any)?.colCount ?? '?'} cols
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => handlePreview(file.id)}>
                        <Eye className="size-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDownload(file.id, file.name)}>
                        <Download className="size-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500" onClick={() => handleDelete(file.id, file.name)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview panel */}
      {previewFile && previewData && (
        <div className="border rounded-xl p-4 mt-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              Preview — {files.find((f) => f.id === previewFile)?.name}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setPreviewFile(null); setPreviewData(null); }}>
              Close
            </Button>
          </div>
          <div className="max-h-[400px] overflow-auto border rounded-lg">
            <Spreadsheet
              data={previewData.data.map(row =>
                row.map((cell: any) => ({ value: String(cell ?? '') }))
              )}
              columnLabels={previewData.columns}
              className="w-full"
            />
            {previewData.data.length >= 50 && (
              <div className="text-center text-xs text-muted-foreground py-2 border-t">
                Showing first 50 rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataLibrary;
