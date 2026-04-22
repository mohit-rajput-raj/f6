import { create } from 'zustand';

export interface Dataset {
  columns: string[];
  data: any[][];
}

export interface PushEntry {
  id: string;
  masterSheetName: string;   // target master sheet name
  sheetName: string;          // legacy / display label
  data: Dataset;
  blockCodenames: string[];   // codenames of blocks in this push (e.g. ["CO24553:Th", "CO24804:Tut"])
  pushedBy: string;
  pushedByName: string;
  pushedAt: number;
  sourceNodeId: string;
  status: 'pending' | 'merged' | 'rejected';
}

export interface MergeHistoryEntry {
  id: string;
  userName: string;
  action: 'merge' | 'reject' | 'update';
  changeSummary: string;
  timestamp: number;
  colsAdded?: number;
  rowsAffected?: number;
}

export interface MasterSheetEntry {
  name: string;
  sheetId: string | null;   // DB id
  data: Dataset | null;
  blocks: Record<string, string[]>; // codename → column names belonging to that block
}

interface MasterSheetState {
  // Multi-sheet storage keyed by name
  sheets: Record<string, MasterSheetEntry>;
  activeSheetName: string | null;

  // Push queue
  pendingPushes: PushEntry[];

  // History
  history: MergeHistoryEntry[];

  // Notification
  hasNewPush: boolean;

  // Actions
  pushData: (entry: Omit<PushEntry, 'id' | 'status'>) => void;
  mergeData: (pushId: string) => void;
  rejectPush: (pushId: string) => void;
  setActiveSheet: (name: string) => void;
  getOrCreateSheet: (name: string) => MasterSheetEntry;
  setSheetData: (name: string, data: Dataset, sheetId?: string) => void;
  setSheetId: (name: string, id: string) => void;
  loadSheets: (entries: { name: string; id: string; data: any; metadata?: any }[]) => void;
  removeSheet: (name: string) => void;
  clearPendingPushes: () => void;
  dismissNotification: () => void;
  addHistoryEntry: (entry: Omit<MergeHistoryEntry, 'id'>) => void;
  loadHistory: (entries: MergeHistoryEntry[]) => void;
  reset: () => void;
}

// ── Helper: Extract codenames from column names ──
// Columns like "CO24553:Th:Present" have codename "CO24553:Th"
function extractCodenamesFromColumns(columns: string[], baseColumns: string[]): string[] {
  const codenames = new Set<string>();
  for (const col of columns) {
    if (baseColumns.includes(col)) continue; // skip base columns
    const parts = col.split(':');
    if (parts.length >= 2) {
      codenames.add(`${parts[0]}:${parts[1]}`);
    }
  }
  return Array.from(codenames);
}

// ── Helper: Get columns belonging to a codename ──
function getColumnsForCodename(columns: string[], codename: string): string[] {
  return columns.filter(col => col.startsWith(codename + ':'));
}

// ── Helper: Merge block data into existing sheet ──
function mergeBlocksIntoSheet(
  existing: MasterSheetEntry,
  pushData: Dataset,
  blockCodenames: string[],
  keyColumn: string
): { data: Dataset; blocks: Record<string, string[]> } {
  const existingData = existing.data;
  const existingBlocks = { ...existing.blocks };

  if (!existingData || existingData.columns.length === 0) {
    // No existing data — use push data as-is
    const newBlocks: Record<string, string[]> = {};
    for (const code of blockCodenames) {
      newBlocks[code] = getColumnsForCodename(pushData.columns, code);
    }
    return { data: { ...pushData }, blocks: newBlocks };
  }

  // Determine base columns (non-prefixed columns like Enrollment, Name)
  const baseColumns = existingData.columns.filter(col => {
    const parts = col.split(':');
    return parts.length < 2; // no colon prefix means it's a base column
  });

  // Also include base columns from push data that might not be in existing
  const pushBaseColumns = pushData.columns.filter(col => {
    const parts = col.split(':');
    return parts.length < 2;
  });

  const allBaseColumns = [...new Set([...baseColumns, ...pushBaseColumns])];

  // For each codename in this push, determine columns to add/replace
  const columnsToRemove = new Set<string>();
  const newBlockEntries: Record<string, string[]> = {};

  for (const code of blockCodenames) {
    const newCols = getColumnsForCodename(pushData.columns, code);
    newBlockEntries[code] = newCols;

    // If this codename already existed, mark its old columns for removal
    if (existingBlocks[code]) {
      for (const oldCol of existingBlocks[code]) {
        columnsToRemove.add(oldCol);
      }
    }
  }

  // Build new column list: base + existing blocks (minus removed) + new block columns
  const keptExistingCols = existingData.columns.filter(col => !columnsToRemove.has(col));
  const newPrefixedCols: string[] = [];
  for (const code of blockCodenames) {
    for (const col of newBlockEntries[code]) {
      if (!keptExistingCols.includes(col)) {
        newPrefixedCols.push(col);
      }
    }
  }

  const mergedColumns = [...keptExistingCols, ...newPrefixedCols];

  // Build row map from existing data using key column
  const keyIdx = existingData.columns.indexOf(keyColumn);
  const pushKeyIdx = pushData.columns.indexOf(keyColumn);

  if (keyIdx === -1 && pushKeyIdx === -1) {
    // Can't merge by key — just return push data
    const blocks: Record<string, string[]> = {};
    for (const code of blockCodenames) {
      blocks[code] = getColumnsForCodename(pushData.columns, code);
    }
    return { data: { ...pushData }, blocks };
  }

  const effectiveKeyIdx = keyIdx >= 0 ? keyIdx : 0;

  // Map: keyValue → row array (sized to mergedColumns)
  const rowMap = new Map<string, any[]>();
  const keyOrder: string[] = [];

  // Add existing rows
  for (const row of existingData.data) {
    const key = String(row[effectiveKeyIdx] ?? '');
    const newRow = new Array(mergedColumns.length).fill(null);

    // Copy values from existing columns to their new positions
    for (let i = 0; i < existingData.columns.length; i++) {
      const col = existingData.columns[i];
      if (columnsToRemove.has(col)) continue;
      const newIdx = mergedColumns.indexOf(col);
      if (newIdx >= 0) {
        newRow[newIdx] = row[i];
      }
    }

    rowMap.set(key, newRow);
    if (!keyOrder.includes(key)) keyOrder.push(key);
  }

  // Merge push data rows
  const effectivePushKeyIdx = pushKeyIdx >= 0 ? pushKeyIdx : 0;

  for (const row of pushData.data) {
    const key = String(row[effectivePushKeyIdx] ?? '');
    let targetRow = rowMap.get(key);

    if (!targetRow) {
      targetRow = new Array(mergedColumns.length).fill(null);
      rowMap.set(key, targetRow);
      keyOrder.push(key);
    }

    // Fill in push data columns
    for (let i = 0; i < pushData.columns.length; i++) {
      const col = pushData.columns[i];
      const newIdx = mergedColumns.indexOf(col);
      if (newIdx >= 0) {
        targetRow[newIdx] = row[i];
      }
    }
  }

  // Build final data array preserving order
  const mergedData: any[][] = [];
  for (const key of keyOrder) {
    const row = rowMap.get(key);
    if (row) mergedData.push(row);
  }

  // Update blocks registry
  const updatedBlocks = { ...existingBlocks };
  for (const code of blockCodenames) {
    updatedBlocks[code] = newBlockEntries[code];
  }

  return {
    data: { columns: mergedColumns, data: mergedData },
    blocks: updatedBlocks,
  };
}

export const useMasterSheetStore = create<MasterSheetState>((set, get) => ({
  sheets: {},
  activeSheetName: null,
  pendingPushes: [],
  history: [],
  hasNewPush: false,

  pushData: (entry) => {
    const push: PushEntry = {
      ...entry,
      id: crypto.randomUUID(),
      status: 'pending',
    };
    set((state) => ({
      pendingPushes: [...state.pendingPushes, push],
      hasNewPush: true,
    }));
  },

  mergeData: (pushId) => {
    const state = get();
    const push = state.pendingPushes.find((p) => p.id === pushId);
    if (!push) return;

    const targetName = push.masterSheetName || push.sheetName || 'Master Sheet';

    // Get or create sheet entry
    const existingSheet: MasterSheetEntry = state.sheets[targetName] || {
      name: targetName,
      sheetId: null,
      data: null,
      blocks: {},
    };

    // Determine key column (first column of existing or push data)
    const keyColumn = existingSheet.data?.columns[0] || push.data.columns[0] || '';

    // Determine block codenames
    let codenames = push.blockCodenames;
    if (!codenames || codenames.length === 0) {
      // Auto-detect from column prefixes
      const baseColumns = push.data.columns.filter(col => !col.includes(':'));
      codenames = extractCodenamesFromColumns(push.data.columns, baseColumns);
      if (codenames.length === 0) {
        codenames = ['__default__'];
      }
    }

    // Merge blocks
    const merged = mergeBlocksIntoSheet(existingSheet, push.data, codenames, keyColumn);

    const updatedSheet: MasterSheetEntry = {
      ...existingSheet,
      name: targetName,
      data: merged.data,
      blocks: merged.blocks,
    };

    // History entry
    const historyEntry: MergeHistoryEntry = {
      id: crypto.randomUUID(),
      userName: push.pushedByName,
      action: 'merge',
      changeSummary: `Merged ${codenames.join(', ')} → "${targetName}" (${push.data.data.length} rows)`,
      timestamp: Date.now(),
      colsAdded: push.data.columns.length,
      rowsAffected: push.data.data.length,
    };

    set((state) => ({
      sheets: {
        ...state.sheets,
        [targetName]: updatedSheet,
      },
      activeSheetName: state.activeSheetName || targetName,
      pendingPushes: state.pendingPushes.map((p) =>
        p.id === pushId ? { ...p, status: 'merged' as const } : p
      ),
      history: [historyEntry, ...state.history],
      hasNewPush: state.pendingPushes.filter((p) => p.id !== pushId && p.status === 'pending').length > 0,
    }));
  },

  rejectPush: (pushId) => {
    const state = get();
    const push = state.pendingPushes.find((p) => p.id === pushId);

    const historyEntry: MergeHistoryEntry = {
      id: crypto.randomUUID(),
      userName: push?.pushedByName ?? 'Unknown',
      action: 'reject',
      changeSummary: `Rejected push from "${push?.sheetName ?? 'Unknown'}"`,
      timestamp: Date.now(),
    };

    set((state) => ({
      pendingPushes: state.pendingPushes.map((p) =>
        p.id === pushId ? { ...p, status: 'rejected' as const } : p
      ),
      history: [historyEntry, ...state.history],
      hasNewPush: state.pendingPushes.filter((p) => p.id !== pushId && p.status === 'pending').length > 0,
    }));
  },

  setActiveSheet: (name) => set({ activeSheetName: name }),

  getOrCreateSheet: (name) => {
    const state = get();
    if (state.sheets[name]) return state.sheets[name];

    const entry: MasterSheetEntry = {
      name,
      sheetId: null,
      data: null,
      blocks: {},
    };
    set((s) => ({
      sheets: { ...s.sheets, [name]: entry },
    }));
    return entry;
  },

  setSheetData: (name, data, sheetId) => {
    set((state) => ({
      sheets: {
        ...state.sheets,
        [name]: {
          ...(state.sheets[name] || { name, sheetId: null, blocks: {} }),
          data,
          ...(sheetId ? { sheetId } : {}),
        },
      },
    }));
  },

  setSheetId: (name, id) => {
    set((state) => ({
      sheets: {
        ...state.sheets,
        [name]: {
          ...(state.sheets[name] || { name, data: null, blocks: {} }),
          sheetId: id,
        },
      },
    }));
  },

  loadSheets: (entries) => {
    const sheets: Record<string, MasterSheetEntry> = {};
    for (const entry of entries) {
      const data = entry.data as Dataset | null;
      // Reconstruct blocks from column prefixes
      const blocks: Record<string, string[]> = {};
      if (data && data.columns) {
        const baseColumns = data.columns.filter((col: string) => !col.includes(':'));
        const codenames = extractCodenamesFromColumns(data.columns, baseColumns);
        for (const code of codenames) {
          blocks[code] = getColumnsForCodename(data.columns, code);
        }
      }
      sheets[entry.name] = {
        name: entry.name,
        sheetId: entry.id,
        data,
        blocks,
      };
    }
    set((state) => ({
      sheets: { ...state.sheets, ...sheets },
      activeSheetName: state.activeSheetName || Object.keys(sheets)[0] || null,
    }));
  },

  removeSheet: (name) => {
    set((state) => {
      const { [name]: _, ...rest } = state.sheets;
      return {
        sheets: rest,
        activeSheetName: state.activeSheetName === name
          ? (Object.keys(rest)[0] || null)
          : state.activeSheetName,
      };
    });
  },

  clearPendingPushes: () =>
    set({
      pendingPushes: [],
      hasNewPush: false,
    }),

  dismissNotification: () => set({ hasNewPush: false }),

  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [{ ...entry, id: crypto.randomUUID() }, ...state.history],
    })),

  loadHistory: (entries) => set({ history: entries }),

  reset: () =>
    set({
      sheets: {},
      activeSheetName: null,
      pendingPushes: [],
      history: [],
      hasNewPush: false,
    }),
}));
