"use client";

import React, { useRef, useState, useEffect } from "react";
import Analytics from "@/components/SpreadSheetTemplet";
import AttendanceMergePanel from "@/components/AttendanceMergePanel";
import { Button } from "@/components/ui/button";
import {
  useSpreadsheetsList,
  useSpreadsheet,
  useCreateSpreadsheet,
  useUpdateSpreadsheet,
  useDeleteSpreadsheet,
} from "@/hooks/useSpreadsheets";
import { Plus, Save, Trash2, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function Page() {
  const spreadsheetRef = useRef<{
    getJson: () => Promise<any>;
    loadJson: (data: any) => void;
    getDataGrid: () => Promise<any[][]>;
    updateCell: (rowIdx: number, colIdx: number, value: any, formula?: string) => void;
    getSubjectsList: () => Promise<{ subject: string; component: string }[]>;
  } | null>(null);
  const loadedSheetIdRef = useRef<string | null>(null);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState("My Attendance Sheet");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries & Mutations
  const { data: sheetsList, isLoading: isLoadingList, error: listError } = useSpreadsheetsList();
  const { data: activeSheet, isLoading: isLoadingSheet, error: sheetError } = useSpreadsheet(selectedId);

  const createMutation = useCreateSpreadsheet();
  const updateMutation = useUpdateSpreadsheet();
  const deleteMutation = useDeleteSpreadsheet();

  // Load the spreadsheet data when selected sheet changes
  useEffect(() => {
    if (activeSheet && spreadsheetRef.current) {
      if (loadedSheetIdRef.current !== activeSheet.id) {
        loadedSheetIdRef.current = activeSheet.id;
        spreadsheetRef.current.loadJson(activeSheet.data);
        setSheetName(activeSheet.name);
      }
    }
  }, [activeSheet]);

  // Handle Save / Update
  const handleSave = async () => {
    if (!spreadsheetRef.current) return;
    
    setSaveStatus("saving");
    setErrorMsg(null);
    
    try {
      const jsonData = await spreadsheetRef.current.getJson();
      if (!jsonData) {
        throw new Error("Could not extract spreadsheet JSON data.");
      }

      if (selectedId) {
        // Update existing
        await updateMutation.mutateAsync({
          id: selectedId,
          name: sheetName,
          data: jsonData,
        });
      } else {
        // Create new
        const newSheet = await createMutation.mutateAsync({
          name: sheetName,
          data: jsonData,
        });
        loadedSheetIdRef.current = newSheet.id;
        setSelectedId(newSheet.id);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus("error");
      setErrorMsg(err.message || "Failed to save spreadsheet.");
    }
  };

  // Handle Create New (clears selectedId and sets back to new name)
  const handleCreateNew = () => {
    setSelectedId(null);
    setSheetName("New Spreadsheet");
    // Reload/refresh default page state
    window.location.reload();
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Are you sure you want to delete this spreadsheet?")) return;

    try {
      await deleteMutation.mutateAsync(selectedId);
      setSelectedId(null);
      setSheetName("My Attendance Sheet");
      window.location.reload();
    } catch (err: any) {
      alert("Error deleting spreadsheet: " + err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Premium Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Supabase Spreadsheet Editor
              </h1>
              <p className="text-sm text-slate-500">
                Manage, edit, and persist Syncfusion spreadsheets to Supabase Database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Spreadsheet Selector dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sheet-select" className="text-sm font-medium text-slate-600">
                Active Sheet:
              </label>
              {isLoadingList ? (
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading list...
                </div>
              ) : (
                <select
                  id="sheet-select"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  value={selectedId || ""}
                  onChange={(e) => setSelectedId(e.target.value || null)}
                >
                  <option value="">-- Template (Unsaved) --</option>
                  {sheetsList?.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sheet Name Input */}
            <input
              type="text"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none w-48 font-semibold"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Spreadsheet Name"
            />

            {/* Actions */}
            <Button
              onClick={handleSave}
              disabled={saveStatus === "saving" || isLoadingSheet}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {selectedId ? "Update Sheet" : "Save as New"}
                </>
              )}
            </Button>

            {selectedId && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-medium transition-all flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleCreateNew}
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Sheet
            </Button>
          </div>
        </div>
      </header>

      {/* Info messages */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-4">
        {saveStatus === "saved" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm flex items-center gap-2">
            ✓ Spreadsheet successfully saved to Supabase!
          </div>
        )}
        {saveStatus === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error: {errorMsg || "Failed to communicate with Supabase. Make sure your database table exists."}
          </div>
        )}
        {(listError || sheetError) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm flex flex-col gap-1">
            <span className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Database Sync Warning:
            </span>
            <span className="text-xs">
              Make sure you have created the <code>spreadsheets</code> table in your Supabase database using the SQL query below.
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6 flex flex-col gap-6">
        {isLoadingSheet ? (
          <div className="flex flex-col items-center justify-center h-[600px] border border-dashed border-slate-200 rounded-xl bg-white gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Loading spreadsheet data from Supabase...</p>
          </div>
        ) : (
          <>
            <AttendanceMergePanel spreadsheetRef={spreadsheetRef} onMerged={handleSave} />
            <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
              <Analytics spreadsheetRef={spreadsheetRef} />
            </div>
          </>
        )}
        
        {/* SQL Help Section */}
        <section className="mt-8 bg-slate-800 text-slate-300 rounded-xl p-6 shadow-sm border border-slate-700">
          <h2 className="text-md font-bold text-white mb-2 flex items-center gap-2">
            💾 Supabase Setup Instructions
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            If you haven't already, run this SQL query in your <strong>Supabase SQL Editor</strong> to create the necessary table:
          </p>
          <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto border border-slate-950 font-mono">
{`CREATE TABLE spreadsheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) or make it public for development:
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read and write access" ON spreadsheets
  FOR ALL USING (true) WITH CHECK (true);`}
          </pre>
        </section>
      </main>
    </div>
  );
}