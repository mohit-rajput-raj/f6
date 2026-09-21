'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Sparkles,
  ScanText,
  Upload,
  FileSpreadsheet,
  Braces,
  Save,
  Check,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Table as TableIcon,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Badge } from '@repo/ui/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui/components/ui/tabs';
import { toast } from 'sonner';
import Spreadsheet from 'react-spreadsheet';
import { scanTableImageAction } from '../ocr-actions';
import { createDataLibraryFile } from '../actions';
import {
  saveEncryptedOcrDraft,
  loadEncryptedOcrDraft,
  clearEncryptedOcrDraft,
} from '../lib/secure-ocr-storage';

interface OcrTableExtractorProps {
  dashid: string;
  userId: string;
  onSaveSuccess: () => Promise<void> | void;
  onCloseDrawer?: () => void;
  isInDrawer?: boolean;
}

export const OcrTableExtractor: React.FC<OcrTableExtractorProps> = ({
  dashid,
  userId,
  onSaveSuccess,
  onCloseDrawer,
  isInDrawer = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Extracted data state
  const [datasetName, setDatasetName] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  // react-spreadsheet represents data as an array of rows: { value: string }[][]
  const [spreadsheetCells, setSpreadsheetCells] = useState<{ value: string }[][]>([]);
  const [jsonFormat, setJsonFormat] = useState<'columns_data' | 'records'>('columns_data');
  const [copied, setCopied] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore encrypted draft from localStorage on mount
  useEffect(() => {
    if (!dashid) return;
    try {
      const draft = loadEncryptedOcrDraft(dashid);
      if (draft && (draft.columns?.length > 0 || draft.imagePreview)) {
        setDatasetName(draft.datasetName || '');
        setFileName(draft.fileName || '');
        setImagePreview(draft.imagePreview || null);
        setColumns(draft.columns || []);
        setSpreadsheetCells(draft.spreadsheetCells || []);
        setHasRestoredDraft(true);
      }
    } catch (err) {
      console.warn('Could not restore OCR draft:', err);
    }
  }, [dashid]);

  // Persist encrypted draft automatically to localStorage
  useEffect(() => {
    if (!dashid) return;
    if (columns.length === 0 && !imagePreview) return;

    const timer = setTimeout(() => {
      saveEncryptedOcrDraft(dashid, {
        datasetName,
        fileName,
        imagePreview,
        columns,
        spreadsheetCells,
        updatedAt: Date.now(),
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [dashid, datasetName, fileName, imagePreview, columns, spreadsheetCells]);

  // Blank cells counter
  const blankCellsCount = useMemo(() => {
    let count = 0;
    spreadsheetCells.forEach((row) => {
      row.forEach((cell) => {
        if (!cell || !cell.value || cell.value.trim() === '') {
          count++;
        }
      });
    });
    return count;
  }, [spreadsheetCells]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP)');
      return;
    }

    setFileName(file.name);
    const defaultName =
      file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'OCR Extracted Table';
    setDatasetName(defaultName);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcrScan(base64, defaultName);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file (PNG, JPG, WEBP)');
      return;
    }

    setFileName(file.name);
    const defaultName =
      file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'OCR Extracted Table';
    setDatasetName(defaultName);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcrScan(base64, defaultName);
    };
    reader.readAsDataURL(file);
  };

  // Scan trigger
  const triggerOcrScan = async (base64Image: string, fallbackName: string) => {
    setIsScanning(true);
    try {
      const res = await scanTableImageAction(base64Image);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to extract table data');
      }

      const extractedCols = res.data.columns || [];
      const extractedRows = res.data.data || [];

      if (extractedCols.length === 0 && extractedRows.length === 0) {
        toast.error('No table structure detected in the image. Please try a clearer image.');
        return;
      }

      setColumns(extractedCols);
      // Map to react-spreadsheet format
      const formatted = extractedRows.map((row) =>
        extractedCols.map((_, colIdx) => ({
          value: row[colIdx] !== null && row[colIdx] !== undefined ? String(row[colIdx]) : '',
        }))
      );
      setSpreadsheetCells(formatted);
      setDatasetName(fallbackName || `OCR Table - ${new Date().toLocaleDateString()}`);
      setHasRestoredDraft(false);

      toast.success(
        `Extracted ${extractedCols.length} columns & ${extractedRows.length} rows (${res.source === 'pyp' ? 'Python pyp server' : 'AI Vision fallback'})`
      );
    } catch (err: any) {
      console.error('OCR Error:', err);
      toast.error(err.message || 'Error processing OCR');
    } finally {
      setIsScanning(false);
    }
  };

  // Cell change handler in Spreadsheet
  const handleSpreadsheetChange = useCallback((newData: (({ value: string } | undefined)[])[]) => {
    const normalized = newData.map((row) =>
      (row || []).map((cell) => ({ value: cell?.value ?? '' }))
    );
    setSpreadsheetCells(normalized);
  }, []);

  // Add Row
  const handleAddRow = () => {
    if (columns.length === 0) {
      setColumns(['Column 1']);
      setSpreadsheetCells([[{ value: '' }]]);
      return;
    }
    const newRow = columns.map(() => ({ value: '' }));
    setSpreadsheetCells((prev) => [...prev, newRow]);
  };

  // Add Column
  const handleAddColumn = () => {
    const newColName = `Column ${columns.length + 1}`;
    setColumns((prev) => [...prev, newColName]);
    setSpreadsheetCells((prev) => prev.map((row) => [...row, { value: '' }]));
  };

  // Remove Column
  const handleRemoveColumn = (colIndex: number) => {
    if (columns.length <= 1) {
      toast.error('At least one column is required');
      return;
    }
    setColumns((prev) => prev.filter((_, idx) => idx !== colIndex));
    setSpreadsheetCells((prev) => prev.map((row) => row.filter((_, idx) => idx !== colIndex)));
  };

  // Rename column header
  const handleColumnNameChange = (index: number, newName: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[index] = newName;
      return next;
    });
  };

  // Current extracted data as array of arrays
  const rawDataRows = useMemo(() => {
    return spreadsheetCells.map((row) =>
      columns.map((_, i) => (row[i]?.value !== undefined ? String(row[i].value) : ''))
    );
  }, [spreadsheetCells, columns]);

  // Current extracted data as JSON string
  const jsonPreviewString = useMemo(() => {
    if (jsonFormat === 'columns_data') {
      return JSON.stringify(
        {
          columns,
          data: rawDataRows,
        },
        null,
        2
      );
    } else {
      const records = rawDataRows.map((row) => {
        const obj: Record<string, string> = {};
        columns.forEach((col, idx) => {
          obj[col || `col_${idx + 1}`] = row[idx] ?? '';
        });
        return obj;
      });
      return JSON.stringify(records, null, 2);
    }
  }, [columns, rawDataRows, jsonFormat]);

  // Copy JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonPreviewString);
    setCopied(true);
    toast.success('JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear previous data / Reset
  const handleClearPreviousData = () => {
    setImagePreview(null);
    setFileName('');
    setColumns([]);
    setSpreadsheetCells([]);
    setDatasetName('');
    setHasRestoredDraft(false);
    clearEncryptedOcrDraft(dashid);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Previous extraction data cleared');
  };

  // Save to Data Library
  const handleSaveToLibrary = async () => {
    if (!userId) {
      toast.error('You must be logged in to save');
      return;
    }
    if (columns.length === 0) {
      toast.error('No table data to save');
      return;
    }

    const title = datasetName.trim() || 'OCR Extracted Table';
    setIsSaving(true);
    try {
      await createDataLibraryFile({
        userId,
        name: title,
        description: `Extracted via OCR from ${fileName || 'table image'} (${columns.length} cols × ${rawDataRows.length} rows)`,
        fileType: 'json',
        data: {
          columns,
          data: rawDataRows,
        },
        metadata: {
          rowCount: rawDataRows.length,
          colCount: columns.length,
          source: 'ocr',
          originalFileName: fileName,
          extractedAt: new Date().toISOString(),
        },
        workflowId: dashid,
      });

      toast.success(`"${title}" saved to Data Library successfully!`);
      // Clear encrypted draft after successful save
      clearEncryptedOcrDraft(dashid);
      setImagePreview(null);
      setFileName('');
      setColumns([]);
      setSpreadsheetCells([]);
      setDatasetName('');
      setHasRestoredDraft(false);

      await onSaveSuccess();
      if (onCloseDrawer) {
        onCloseDrawer();
      }
    } catch (err: any) {
      console.error('Failed to save to library:', err);
      toast.error(err?.message || 'Failed to save dataset');
    } finally {
      setIsSaving(false);
    }
  };

  const hasData = columns.length > 0;

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isInDrawer
          ? 'space-y-4'
          : 'rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden'
      }`}
    >
      {/* Top Banner / Header (when rendered standalone) */}
      {!isInDrawer && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm shadow-purple-500/20">
              <ScanText className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  AI Table OCR & Extraction
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-purple-300 text-purple-600 dark:border-purple-800 dark:text-purple-300 px-1.5 py-0"
                >
                  <Sparkles className="size-2.5 mr-1" /> Vision Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Extract printed or digital tables from images into editable spreadsheets and JSON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(imagePreview || hasData) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPreviousData}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                title="Clear previous extraction data and saved draft"
              >
                <Trash2 className="size-3.5" /> Clear Data
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-8 w-8 p-0"
              title={isOpen ? 'Collapse OCR section' : 'Expand OCR section'}
            >
              {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Persistence and Actions Bar inside Drawer */}
      {isInDrawer && (
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] gap-1 border-primary/20 bg-primary/5 text-primary"
            >
              <Lock className="size-3" />
              <span>Encrypted Auto-Save Active</span>
            </Badge>
            {hasRestoredDraft && (
              <Badge
                variant="secondary"
                className="text-[11px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
              >
                <ShieldCheck className="size-3" />
                <span>Restored unsaved draft</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(imagePreview || hasData) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearPreviousData}
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Clear Previous Data</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {(isOpen || isInDrawer) && (
        <div className={isInDrawer ? 'space-y-4' : 'p-5 space-y-4'}>
          {/* Upload Dropzone (when no data or when scanning) */}
          {!columns.length && !isScanning && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="size-7" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                Drop table image here, or{' '}
                <span className="text-primary underline underline-offset-2">browse files</span>
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Supports PNG, JPG, or WEBP. Clear photos or screenshots of financial tables, invoices,
                catalogues, or spreadsheets work best.
              </p>
            </div>
          )}

          {/* Scanning Progress State */}
          {isScanning && (
            <div className="border rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 bg-muted/10">
              <div className="relative">
                <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground animate-pulse shadow-md">
                  <ScanText className="size-7 animate-bounce" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-sm -z-10 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Processing Table Image</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  AI vision model is detecting table structure, headers, and all cell values...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Extracting JSON & formatting spreadsheet</span>
              </div>
            </div>
          )}

          {/* Result Workbench (when table data is available) */}
          {columns.length > 0 && !isScanning && (
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative size-11 rounded-lg overflow-hidden border bg-background shrink-0 shadow-2xs">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Source Table"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-5 m-auto text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="Dataset Name"
                      className="h-9 text-sm font-semibold bg-background max-w-md"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Badge variant="secondary" className="text-xs py-1 px-2.5 font-medium">
                    {columns.length} cols × {spreadsheetCells.length} rows
                  </Badge>

                  {blankCellsCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs py-1 px-2 border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-1"
                      title={`${blankCellsCount} cells were returned empty. Click on cells to edit them directly.`}
                    >
                      <AlertCircle className="size-3" />
                      {blankCellsCount} empty cell{blankCellsCount > 1 ? 's' : ''}
                    </Badge>
                  )}

                  <Button
                    onClick={handleClearPreviousData}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                    title="Clear previous data"
                  >
                    <Trash2 className="size-3" />
                    <span>Clear</span>
                  </Button>

                  <Button
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5 font-medium px-3.5"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save to Library'}</span>
                  </Button>
                </div>
              </div>

              {/* Informational Banner */}
              {blankCellsCount > 0 && (
                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Some cells are empty because OCR couldn't clearly recognize them. You can click
                      and type in the spreadsheet table below to edit or fill them before saving.
                    </span>
                  </div>
                </div>
              )}

              {/* Dual Previews Tabs: Spreadsheet & JSON */}
              <Tabs defaultValue="spreadsheet" className="w-full">
                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                  <TabsList className="h-8 bg-muted/60 p-0.5">
                    <TabsTrigger value="spreadsheet" className="text-xs h-7 gap-1.5 px-3 font-medium">
                      <TableIcon className="size-3.5" />
                      Spreadsheet Editor
                    </TabsTrigger>
                    <TabsTrigger value="json" className="text-xs h-7 gap-1.5 px-3 font-medium">
                      <Braces className="size-3.5" />
                      JSON Preview
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Row
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Column
                    </Button>
                  </div>
                </div>

                {/* Spreadsheet View */}
                <TabsContent value="spreadsheet" className="mt-3">
                  <div className="border rounded-xl bg-background overflow-hidden shadow-2xs">
                    {/* Header Columns Editor */}
                    <div className="flex items-center gap-2 p-2.5 bg-muted/30 border-b overflow-x-auto text-xs">
                      <span className="font-semibold text-muted-foreground uppercase text-[10px] shrink-0 px-1">
                        Headers:
                      </span>
                      {columns.map((col, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-background border rounded-md px-2 py-0.5 shrink-0 shadow-2xs"
                        >
                          <input
                            type="text"
                            value={col}
                            onChange={(e) => handleColumnNameChange(idx, e.target.value)}
                            className="bg-transparent border-none text-xs font-medium focus:outline-none w-24"
                            placeholder={`Col ${idx + 1}`}
                          />
                          {columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveColumn(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 cursor-pointer"
                              title="Delete column"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Interactive React Spreadsheet */}
                    <div className="max-h-[380px] overflow-auto p-2">
                      <Spreadsheet
                        data={spreadsheetCells}
                        onChange={handleSpreadsheetChange}
                        columnLabels={columns}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* JSON View */}
                <TabsContent value="json" className="mt-3">
                  <div className="border rounded-xl bg-background overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Format:</span>
                        <div className="flex rounded-lg border bg-background p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setJsonFormat('columns_data')}
                            className={`px-2.5 py-0.5 text-xs rounded-md transition cursor-pointer ${
                              jsonFormat === 'columns_data'
                                ? 'bg-muted font-semibold text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Columns & Rows
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonFormat('records')}
                            className={`px-2.5 py-0.5 text-xs rounded-md transition cursor-pointer ${
                              jsonFormat === 'records'
                                ? 'bg-muted font-semibold text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Object Records
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJson}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                        <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                      </Button>
                    </div>

                    <pre className="max-h-[380px] overflow-auto p-4 text-xs font-mono bg-muted/10 text-foreground">
                      {jsonPreviewString}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OcrTableExtractor;
