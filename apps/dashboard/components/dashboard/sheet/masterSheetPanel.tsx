"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  SpreadsheetComponent,
} from "@syncfusion/ej2-react-spreadsheet";
import { Button } from "@/components/ui/components";
import { useMasterSheetStore, PushEntry, MergeHistoryEntry, MasterSheetEntry } from "@/stores/master-sheet-store";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  getMasterSheets,
  upsertMasterSheetByName,
  addMasterSheetHistory,
} from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";

export default function MasterSheetPanel() {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const { data: sessionData } = useSession();
  const [activeTab, setActiveTab] = useState<'sheet' | 'pending' | 'history'>('sheet');
  const [loaded, setLoaded] = useState(false);

  const {
    sheets,
    activeSheetName,
    pendingPushes,
    history,
    hasNewPush,
    mergeData,
    rejectPush,
    setActiveSheet,
    loadSheets,
    dismissNotification,
  } = useMasterSheetStore();

  const pendingList = pendingPushes.filter(p => p.status === 'pending');
  const sheetNames = Object.keys(sheets);
  const activeEntry: MasterSheetEntry | null = activeSheetName ? sheets[activeSheetName] ?? null : null;
  const currentSheet = activeEntry?.data ?? null;

  // Load sheets from DB on mount
  useEffect(() => {
    if (!sessionData?.user?.id || loaded) return;
    const loadFromDb = async () => {
      try {
        const dbSheets = await getMasterSheets(sessionData.user.id);
        if (dbSheets && dbSheets.length > 0) {
          loadSheets(dbSheets.map(s => ({
            name: s.name,
            id: s.id,
            data: s.data as any,
            metadata: s.metadata as any,
          })));
        }
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load master sheets:', err);
        setLoaded(true);
      }
    };
    loadFromDb();
  }, [sessionData?.user?.id, loaded, loadSheets]);

  // Load current sheet into spreadsheet
  const loadSheetToSpreadsheet = useCallback(() => {
    if (!spreadsheetRef.current || !currentSheet) return;
    const ss = spreadsheetRef.current;

    // Write headers
    currentSheet.columns.forEach((col, colIdx) => {
      const cellAddr = `${colLetter(colIdx)}1`;
      ss.updateCell({ value: col, style: { fontWeight: 'bold', backgroundColor: '#e2e8f0' } }, cellAddr);
    });

    // Write data
    currentSheet.data.forEach((row, rowIdx) => {
      row.forEach((cell: any, colIdx: number) => {
        const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`;
        ss.updateCell({ value: String(cell ?? '') }, cellAddr);
      });
    });
  }, [currentSheet]);

  useEffect(() => {
    if (activeTab === 'sheet' && currentSheet) {
      setTimeout(loadSheetToSpreadsheet, 300);
    }
  }, [activeTab, currentSheet, loadSheetToSpreadsheet, activeSheetName]);

  // Merge handler — merges locally then saves to DB
  const handleMerge = async (pushId: string) => {
    const push = pendingList.find(p => p.id === pushId);
    if (!push) return;

    // Merge in store (block-based append/overwrite)
    mergeData(pushId);

    // Save to DB
    const userId = sessionData?.user?.id;
    const userName = sessionData?.user?.name ?? 'Unknown';
    if (!userId) return;

    try {
      const store = useMasterSheetStore.getState();
      const targetName = push.masterSheetName || push.sheetName || 'Master Sheet';
      const sheetEntry = store.sheets[targetName];
      if (!sheetEntry) return;

      const saved = await upsertMasterSheetByName({
        userId,
        name: targetName,
        data: sheetEntry.data,
        metadata: {
          rowCount: sheetEntry.data?.data.length,
          colCount: sheetEntry.data?.columns.length,
          blocks: sheetEntry.blocks,
          lastMergedAt: new Date().toISOString(),
        },
      });

      // Update sheetId in store
      if (saved.id && !sheetEntry.sheetId) {
        useMasterSheetStore.getState().setSheetId(targetName, saved.id);
      }

      await addMasterSheetHistory({
        masterSheetId: saved.id,
        userId,
        userName,
        action: 'merge',
        dataAfter: sheetEntry.data,
        changeSummary: `Merged blocks [${push.blockCodenames.join(', ')}] → "${targetName}" (${push.data.data.length} rows)`,
      });

      toast.success(`Merged into "${targetName}" and saved!`);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Merge saved locally but DB save failed');
    }
  };

  const handleReject = (pushId: string) => {
    rejectPush(pushId);
    toast.info('Push rejected');
  };

  const handlePrint = () => {
    if (!currentSheet || !activeSheetName) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${activeSheetName}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:10px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:4px 6px;text-align:left}
        th{background:#e2e8f0;font-weight:bold}
      </style></head><body>
      <h2>${activeSheetName}</h2>
      <table>
        <thead><tr>${currentSheet.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${currentSheet.data.map(row =>
          `<tr>${row.map((c: any) => `<td>${c ?? ''}</td>`).join('')}</tr>`
        ).join('')}</tbody>
      </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-900">
      {/* Notification Banner */}
      {hasNewPush && pendingList.length > 0 && (
        <div className="flex items-center gap-2 p-2 mx-2 mt-2 rounded-lg bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950 dark:to-amber-950 border border-orange-200 dark:border-orange-800 animate-in slide-in-from-top">
          <span className="text-lg">🔔</span>
          <span className="text-xs font-medium text-orange-800 dark:text-orange-200 flex-1">
            {pendingList.length} new data push{pendingList.length > 1 ? 'es' : ''} — Review and merge?
          </span>
          <Button
            onClick={() => setActiveTab('pending')}
            className="px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded"
          >
            Review
          </Button>
          <button
            onClick={dismissNotification}
            className="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-tabs: sheet / pending / history */}
      <div className="flex gap-1 px-2 pt-2 border-b pb-1">
        {(['sheet', 'pending', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-xs rounded-t font-medium transition ${
              activeTab === tab
                ? 'bg-background border border-b-0 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'sheet' && '📊 Sheet'}
            {tab === 'pending' && `📥 Pending (${pendingList.length})`}
            {tab === 'history' && '📜 History'}
          </button>
        ))}

        {currentSheet && activeTab === 'sheet' && (
          <div className="ml-auto flex gap-1">
            <Button onClick={handlePrint} className="px-2 py-1 text-xs bg-background shadow-sm rounded">
              🖨 Print
            </Button>
          </div>
        )}
      </div>

      {/* Sheet Tab */}
      {activeTab === 'sheet' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Master Sheet Tabs Bar (like the reference image) */}
          <div className="flex items-center border-b bg-background px-1 min-h-[32px] overflow-x-auto shrink-0">
            <div className="flex items-center gap-0.5">
              {sheetNames.length === 0 ? (
                <span className="text-xs text-muted-foreground px-2 py-1">No sheets yet</span>
              ) : (
                sheetNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setActiveSheet(name)}
                    className={`px-3 py-1.5 text-[11px] font-medium border rounded-t-md transition-colors whitespace-nowrap ${
                      activeSheetName === name
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 border-b-0 relative -mb-px'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Spreadsheet */}
          <div className="flex-1 min-h-0 w-full overflow-hidden" id="master-sheet-print-area">
            {currentSheet && currentSheet.columns.length > 0 ? (
              <SpreadsheetComponent
                ref={spreadsheetRef}
                className="w-full h-full"
                height="100%"
                width="100%"
                allowOpen={false}
                allowSave={true}
                saveUrl="https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/save"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <span className="text-4xl">📋</span>
                <span className="text-sm">
                  {sheetNames.length > 0 && activeSheetName
                    ? `"${activeSheetName}" has no data yet`
                    : 'No master sheet data yet'}
                </span>
                <span className="text-xs">Run a workflow with Block Concat node to push data here</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="flex-1 overflow-y-auto space-y-2 p-2">
          {pendingList.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No pending pushes
            </div>
          ) : (
            pendingList.map(push => (
              <PushCard key={push.id} push={push} onMerge={handleMerge} onReject={handleReject} />
            ))
          )}

          {/* Show already merged/rejected */}
          {pendingPushes.filter(p => p.status !== 'pending').length > 0 && (
            <div className="border-t pt-2 mt-4">
              <div className="text-xs text-muted-foreground font-medium mb-1">Recent actions</div>
              {pendingPushes.filter(p => p.status !== 'pending').slice(0, 5).map(push => (
                <div key={push.id} className={`text-[10px] px-2 py-1 rounded mb-1 ${
                  push.status === 'merged'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                }`}>
                  {push.status === 'merged' ? '✅' : '❌'} {push.masterSheetName || push.sheetName} — {push.data.data.length} rows
                  {push.blockCodenames.length > 0 && ` [${push.blockCodenames.join(', ')}]`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto space-y-1 p-2">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No history yet
            </div>
          ) : (
            history.map(entry => (
              <HistoryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Push review card
function PushCard({ push, onMerge, onReject }: { push: PushEntry; onMerge: (id: string) => void; onReject: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-background space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{push.masterSheetName || push.sheetName || 'Unnamed Sheet'}</div>
          <div className="text-[10px] text-muted-foreground">
            by {push.pushedByName} • {new Date(push.pushedAt).toLocaleTimeString()}
          </div>
          {push.blockCodenames.length > 0 && (
            <div className="flex gap-0.5 mt-0.5 flex-wrap">
              {push.blockCodenames.map((code, i) => (
                <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button onClick={() => setExpanded(!expanded)} className="px-2 py-1 text-xs bg-background shadow-sm rounded">
            {expanded ? 'Hide' : 'Preview'}
          </Button>
          <Button onClick={() => onMerge(push.id)} className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded">
            ✅ Merge
          </Button>
          <Button onClick={() => onReject(push.id)} className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded">
            ❌ Reject
          </Button>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {push.data.columns.length} columns • {push.data.data.length} rows
      </div>

      {expanded && (
        <div className="max-h-[200px] overflow-auto border rounded text-[10px]">
          <table className="w-full">
            <thead>
              <tr className="bg-muted sticky top-0">
                {push.data.columns.map((col, i) => (
                  <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {push.data.data.slice(0, 20).map((row, ri) => (
                <tr key={ri} className="border-t hover:bg-muted/50">
                  {row.map((cell: any, ci: number) => (
                    <td key={ci} className="px-2 py-0.5 whitespace-nowrap">{cell ?? ''}</td>
                  ))}
                </tr>
              ))}
              {push.data.data.length > 20 && (
                <tr><td colSpan={push.data.columns.length} className="px-2 py-1 text-center text-muted-foreground italic">
                  ... and {push.data.data.length - 20} more rows
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// History entry card
function HistoryCard({ entry }: { entry: MergeHistoryEntry }) {
  const icon = entry.action === 'merge' ? '✅' : entry.action === 'reject' ? '❌' : '📝';
  const bg = entry.action === 'merge'
    ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
    : entry.action === 'reject'
    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
    : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';

  return (
    <div className={`border rounded-lg px-3 py-2 ${bg}`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-xs font-medium flex-1">{entry.changeSummary}</span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        by {entry.userName}
        {entry.colsAdded !== undefined && ` • ${entry.colsAdded} cols`}
        {entry.rowsAffected !== undefined && ` • ${entry.rowsAffected} rows`}
      </div>
    </div>
  );
}

// Utility: column index to letter (0=A, 1=B, ..., 26=AA)
function colLetter(idx: number): string {
  let result = '';
  let n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}
