'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  ChevronDown,
  FileCode,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useMasterSheetStore } from '@/stores/master-sheet-store';
import {
  openSheetInSyncfusion,
  exportSheetToExcel,
  exportSheetToCsv,
  exportSheetToJson,
} from '@/lib/sheet-utils';

const SpreadsheetComponent = dynamic(
  () => import('@syncfusion/ej2-react-spreadsheet').then((m) => m.SpreadsheetComponent),
  { ssr: false }
);

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
  const [selectedSheetForPreview, setSelectedSheetForPreview] = useState<MasterSheetItem | null>(null);
  const [deletingSheetId, setDeletingSheetId] = useState<string | null>(null);
  const [downloadingSheetId, setDownloadingSheetId] = useState<string | null>(null);
  const previewSpreadsheetRef = useRef<any>(null);

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
        setSelectedSheetForPreview(null);
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

  // Download handlers
  const handleDownloadExcel = async (sheet: MasterSheetItem) => {
    setDownloadingSheetId(sheet.id);
    try {
      const success = await exportSheetToExcel(sheet.data, sheet.name);
      if (success) {
        toast.success(`Downloaded "${sheet.name}.xlsx"`);
      } else {
        toast.error('Failed to export Excel file');
      }
    } catch (err: any) {
      console.error('Excel download error:', err);
      toast.error('Excel export failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setDownloadingSheetId(null);
    }
  };

  const handleDownloadCsv = (sheet: MasterSheetItem) => {
    const success = exportSheetToCsv(sheet.data, sheet.name);
    if (success) {
      toast.success(`Downloaded "${sheet.name}.csv"`);
    } else {
      toast.error('No data to export');
    }
  };

  const handleDownloadJson = (sheet: MasterSheetItem) => {
    const success = exportSheetToJson(sheet.data, sheet.name);
    if (success) {
      toast.success(`Downloaded "${sheet.name}.json"`);
    } else {
      toast.error('Failed to export JSON');
    }
  };

  // Preview handler
  const handlePreview = (sheet: MasterSheetItem) => {
    if (previewSheet === sheet.id) {
      setPreviewSheet(null);
      setSelectedSheetForPreview(null);
      return;
    }
    if (!sheet.data) {
      toast.error('No data to preview');
      return;
    }
    setPreviewSheet(sheet.id);
    setSelectedSheetForPreview(sheet);
  };

  const onPreviewSpreadsheetCreated = () => {
    const ss = previewSpreadsheetRef.current;
    if (!ss || !selectedSheetForPreview?.data) return;
    openSheetInSyncfusion(ss, selectedSheetForPreview.data);
  };

  useEffect(() => {
    if (!selectedSheetForPreview) return;
    const timer = setTimeout(() => {
      const ss = previewSpreadsheetRef.current;
      if (ss && selectedSheetForPreview.data) {
        openSheetInSyncfusion(ss, selectedSheetForPreview.data);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedSheetForPreview]);

  const [filterTab, setFilterTab] = useState<'all' | 'personal' | 'shared'>('all');

  // Filtered sheets by tab + search
  const filteredSheets = sheets.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === 'personal') return s.isOwner !== false;
    if (filterTab === 'shared') return s.isOwner === false;
    return true;
  });

  const personalCount = sheets.filter((s: any) => s.isOwner !== false).length;
  const sharedCount = sheets.filter((s: any) => s.isOwner === false).length;

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
              {sheets.length} master sheet{sheets.length !== 1 ? 's' : ''} across personal & shared desks
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

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs font-medium">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-md transition ${filterTab === 'all' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Sheets ({sheets.length})
          </button>
          <button
            onClick={() => setFilterTab('personal')}
            className={`px-3 py-1.5 rounded-md transition ${filterTab === 'personal' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Personal Desk Sheets ({personalCount})
          </button>
          <button
            onClick={() => setFilterTab('shared')}
            className={`px-3 py-1.5 rounded-md transition ${filterTab === 'shared' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Shared Desk Sheets ({sharedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sheets..."
            className="pl-10 h-9 text-xs"
          />
        </div>
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
              {searchTerm ? 'No sheets match your search' : 'No sheets found in this category'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term' : 'Create a project or get invited to a desk to see master sheets here.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSheets.map((sheet: any) => {
            const meta = sheet.metadata as any;
            const blockCount = meta?.blocks ? Object.keys(meta.blocks).length : 0;
            const isOwner = sheet.isOwner !== false;

            return (
              <div
                key={sheet.id}
                className="group relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-violet-300 dark:hover:border-violet-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950">
                    <FileSpreadsheet className="size-5 text-violet-600" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isOwner ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
                    {isOwner ? 'Personal Desk' : 'Shared Desk'}
                  </span>
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

                  {/* Format Download Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      >
                        {downloadingSheetId === sheet.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="size-3 text-emerald-600" />
                        )}
                        <span>Excel</span>
                        <ChevronDown className="size-2.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => handleDownloadExcel(sheet)}
                        className="text-xs flex items-center gap-2 cursor-pointer font-medium text-emerald-700 dark:text-emerald-400"
                      >
                        <FileSpreadsheet className="size-3.5 text-emerald-600" />
                        <span>Excel (.xlsx)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadCsv(sheet)}
                        className="text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="size-3.5 text-blue-500" />
                        <span>CSV (.csv)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadJson(sheet)}
                        className="text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <FileCode className="size-3.5 text-amber-500" />
                        <span>JSON (.json)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

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

                        {/* Format Download Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1.5 gap-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              title="Download (Excel, CSV, JSON)"
                            >
                              {downloadingSheetId === sheet.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <FileSpreadsheet className="size-3 text-emerald-600" />
                              )}
                              <ChevronDown className="size-2.5 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => handleDownloadExcel(sheet)}
                              className="text-xs flex items-center gap-2 cursor-pointer font-medium text-emerald-700 dark:text-emerald-400"
                            >
                              <FileSpreadsheet className="size-3.5 text-emerald-600" />
                              <span>Excel (.xlsx)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadCsv(sheet)}
                              className="text-xs flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="size-3.5 text-blue-500" />
                              <span>CSV (.csv)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadJson(sheet)}
                              className="text-xs flex items-center gap-2 cursor-pointer"
                            >
                              <FileCode className="size-3.5 text-amber-500" />
                              <span>JSON (.json)</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

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

      {/* Preview Dialog Modal Overlay using Syncfusion Spreadsheet */}
      <Dialog
        open={Boolean(previewSheet)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSheet(null);
            setSelectedSheetForPreview(null);
          }
        }}
      >
        <DialogContent className="min-w-[92%] max-w-[92%] min-h-[90vh] max-h-[90vh] flex flex-col p-6 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-violet-600" />
                {selectedSheetForPreview?.name || 'Sheet Preview'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Full Syncfusion spreadsheet preview with templates, formatting, and formulas
              </DialogDescription>
            </div>
            {selectedSheetForPreview && (
              <div className="flex items-center gap-2">
                {/* Format Download Dropdown in Preview Modal */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      {downloadingSheetId === selectedSheetForPreview.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="size-3.5 text-emerald-600" />
                      )}
                      <span>Download Excel</span>
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() => handleDownloadExcel(selectedSheetForPreview)}
                      className="text-xs flex items-center gap-2 cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <FileSpreadsheet className="size-3.5 text-emerald-600" />
                      <span>Excel (.xlsx) — Full Format</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownloadCsv(selectedSheetForPreview)}
                      className="text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="size-3.5 text-blue-500" />
                      <span>CSV (.csv) — Plain Data</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownloadJson(selectedSheetForPreview)}
                      className="text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="size-3.5 text-amber-500" />
                      <span>JSON (.json) — Template</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 border rounded-lg overflow-hidden w-full h-[65vh] min-h-[480px]">
            {selectedSheetForPreview ? (
              <SpreadsheetComponent
                ref={previewSpreadsheetRef}
                created={onPreviewSpreadsheetCreated}
                className="w-full h-full"
                height="100%"
                width="100%"
                allowEditing={false}
                allowOpen={true}
                allowSave={false}
                showFormulaBar={true}
                showRibbon={false}
                sheets={[{ name: 'Sheet1', showGridLines: true }]}
              />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No data available for preview.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SheetLibrary;
