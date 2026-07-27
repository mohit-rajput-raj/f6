'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import {
  getMasterSheets,
  deleteMasterSheet,
} from '../data-library/master-sheet-actions';
import {
  Database,
  Trash2,
  FileSpreadsheet,
  Search,
  Grid3X3,
  List,
  FolderOpen,
  Download,
  Eye,
  Table,
  Loader2,
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@repo/ui/components/ui/dialog';
import Spreadsheet from 'react-spreadsheet';
import { toast } from 'sonner';
import { useMasterSheetStore } from '@/stores/master-sheet-store';

interface MasterSheetItem {
  id: string;
  name: string;
  data: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

import { useParams } from 'next/navigation';

const SheetLibrary = () => {
  const params = useParams();
  const dashid = params?.dashid as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const [sheets, setSheets] = useState<MasterSheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewSheet, setPreviewSheet] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: string[]; data: any[][] } | null>(null);
  const [deletingSheetId, setDeletingSheetId] = useState<string | null>(null);

  const { loadSheets, setActiveSheet } = useMasterSheetStore();

  // Fetch sheets from DB for this desk (dashid)
  const fetchSheets = useCallback(async () => {
    if (!dashid && !userId) return;
    setLoading(true);
    try {
      const result = await getMasterSheets(dashid, userId, userEmail || undefined);
      setSheets(result as any);
    } catch (err) {
      console.error('Failed to fetch sheets:', err);
      toast.error('Failed to load sheet library');
    } finally {
      setLoading(false);
    }
  }, [dashid, userId, userEmail]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);


  // Delete handler
  const handleDelete = async (sheetId: string, sheetName: string) => {
    if (!userId) return;
    if (!confirm(`Delete "${sheetName}"? This cannot be undone.`)) return;

    setDeletingSheetId(sheetId);
    try {
      await deleteMasterSheet(sheetId, userId);
      toast.success(`Deleted "${sheetName}"`);
      setSheets((prev) => prev.filter((s) => s.id !== sheetId));
      if (previewSheet === sheetId) {
        setPreviewSheet(null);
        setPreviewData(null);
      }
      // Also remove from store
      useMasterSheetStore.getState().removeSheet(sheetName);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Delete failed');
    } finally {
      setDeletingSheetId(null);
    }
  };

  // Download handler
  const handleDownload = (sheet: MasterSheetItem) => {
    const d = sheet.data as any;
    if (!d?.columns || !d?.data) {
      toast.error('No data to download');
      return;
    }
    const header = d.columns.join(',');
    const rows = d.data.map((row: any[]) =>
      row
        .map((cell: any) => {
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
    link.download = `${sheet.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Preview handler
  const handlePreview = (sheet: MasterSheetItem) => {
    if (previewSheet === sheet.id) {
      setPreviewSheet(null);
      setPreviewData(null);
      return;
    }
    const d = sheet.data as any;
    if (!d?.columns || !d?.data) {
      toast.error('No data to preview');
      return;
    }
    setPreviewSheet(sheet.id);
    setPreviewData({ columns: d.columns, data: d.data.slice(0, 50) });
  };

  // Load into editor panel
  const handleLoadToPanel = (sheet: MasterSheetItem) => {
    loadSheets([{
      name: sheet.name,
      id: sheet.id,
      data: sheet.data,
      metadata: sheet.metadata,
    }]);
    setActiveSheet(sheet.name);
    toast.success(`Loaded "${sheet.name}" — switch to Editor > Master Sheet tab to view`);
  };

  // Filtered sheets
  const filteredSheets = sheets.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access the Sheet Library.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Table className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sheet Library</h1>
            <p className="text-sm text-muted-foreground">
              {sheets.length} master sheet{sheets.length !== 1 ? 's' : ''} stored
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
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search sheets..."
          className="pl-10"
        />
      </div>

      {/* Sheet list */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            <span className="text-sm">Loading sheets...</span>
          </div>
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-muted-foreground">
          <FolderOpen className="size-12 opacity-40" />
          <div className="text-center">
            <p className="text-lg font-medium mb-1">
              {searchTerm ? 'No sheets match your search' : 'Your Sheet Library is empty'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term' : 'Run a workflow with Block Concat and merge data to create master sheets'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSheets.map((sheet) => {
            const meta = sheet.metadata as any;
            const blockCount = meta?.blocks ? Object.keys(meta.blocks).length : 0;

            return (
              <div
                key={sheet.id}
                className="group relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-violet-300 dark:hover:border-violet-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950">
                    <FileSpreadsheet className="size-5 text-violet-600" />
                  </div>
                  {blockCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-medium">
                      {blockCount} blocks
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-sm truncate mb-1">{sheet.name}</h3>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {meta?.rowCount !== undefined && (
                    <span>{meta.rowCount} rows</span>
                  )}
                  {meta?.colCount !== undefined && (
                    <>
                      <span>•</span>
                      <span>{meta.colCount} cols</span>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground mb-3">
                  {new Date(sheet.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handlePreview(sheet)}
                  >
                    <Eye className="size-3 mr-1" /> Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleLoadToPanel(sheet)}
                  >
                    <Table className="size-3 mr-1" /> Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDownload(sheet)}
                  >
                    <Download className="size-3 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    disabled={deletingSheetId === sheet.id}
                    onClick={() => handleDelete(sheet.id, sheet.name)}
                  >
                    {deletingSheetId === sheet.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Blocks</th>
                <th className="text-left px-4 py-2 font-medium">Size</th>
                <th className="text-left px-4 py-2 font-medium">Updated</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSheets.map((sheet) => {
                const meta = sheet.metadata as any;
                const blockCount = meta?.blocks ? Object.keys(meta.blocks).length : 0;

                return (
                  <tr key={sheet.id} className="border-b hover:bg-muted/30 transition">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-violet-600 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{sheet.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {blockCount} blocks
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {meta?.rowCount ?? '?'} rows × {meta?.colCount ?? '?'} cols
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(sheet.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => handlePreview(sheet)}>
                          <Eye className="size-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => handleLoadToPanel(sheet)}>
                          <Table className="size-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDownload(sheet)}>
                          <Download className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-500"
                          disabled={deletingSheetId === sheet.id}
                          onClick={() => handleDelete(sheet.id, sheet.name)}
                        >
                          {deletingSheetId === sheet.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Dialog Modal Overlay */}
      <Dialog
        open={Boolean(previewSheet)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSheet(null);
            setPreviewData(null);
          }
        }}
      >
        <DialogContent className="min-w-[90%] max-w-[90%]  min-h-[96%] max-h-[96%]  flex flex-col p-6 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-violet-600" />
                {sheets.find((s) => s.id === previewSheet)?.name || 'Sheet Preview'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {previewData
                  ? `${previewData.columns.length} columns • ${previewData.data.length} rows preview`
                  : 'Loading preview...'}
              </DialogDescription>
            </div>
          </DialogHeader>

          {previewData ? (
            <div className="flex-1 overflow-auto border rounded-lg w-full">
              <Spreadsheet
                data={previewData.data.map((row) =>
                  row.map((cell: any) => ({ value: String(cell ?? '') }))
                )}
                columnLabels={previewData.columns}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No data available for preview.
            </div>
          )}

          {previewData && previewData.data.length >= 50 && (
            <div className="text-center text-xs text-muted-foreground pt-1 border-t">
              Showing first 50 rows
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SheetLibrary;
