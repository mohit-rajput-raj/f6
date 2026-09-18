import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────
export interface Dataset {
  columns: string[];
  data: any[][];
}

export interface DeskTextInput {
  id: string;
  placeholder: string;
  value: string;
}

export interface DeskSheet {
  id: string;
  name: string;
  data: Dataset | null;
}

export interface CheckboxField {
  id: string;
  label: string;
  checked: boolean;
  nodeId: string;
}

export interface ActionButton {
  id: string;
  label: string;
  nodeId: string;
  triggered: boolean;
}

export interface IncomingTabData {
  id: string;
  name: string;
  fromTabName: string;
  fromBlockId?: string;
  targetTabName: string;
  data: Dataset;
  updatedAt: number;
}

// ─── Code Mapping Types ─────────────────────────────────────

export interface MergeOperationConfig {
  op: "+" | "-" | "*" | "/" | "replace";
  sourceField: string;
}

export interface CodeMappingEntry {
  id?: string;
  codePath: string;
  columnKeyMap: Record<string, number>; // key name → master col index
  mergeConfig?: Record<string, MergeOperationConfig> | null;
  filePath?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  metadata?: Record<string, any> | null;
}

export interface MergedPreviewTabData {
  codePath: string;
  columns: string[];
  data: any[][];
  updates: any[];
  columnKeyMap: Record<string, number>;
  suggestedKeys?: Record<number, string>; // col index → suggested key name
  isNew: boolean;  // true if code was never seen before (no DB mapping)
  sheetName?: string;
  dataStartRow?: number;
  mergeConfigEnabled?: boolean;
  mergeConfig?: Record<string, MergeOperationConfig> | null;
}

export interface DeskBlockState {
  id: string;
  name: string;
  blockOrder: number;
  editorWorkflowId: string;
  projectWorkflowId: string;
  parentId: string | null;
  treeDepth: number;
  reservedColumns: string[];
  textInputs: DeskTextInput[];
  sheets: DeskSheet[];
  outputPreview: Dataset | null;
  outputsByTab?: Record<string, Dataset>;
  checkboxFields: CheckboxField[];
  actionButtons: ActionButton[];
  isExecuting: boolean;
}

// ─── Store Interface ────────────────────────────────────────
interface DeskState {
  blocks: DeskBlockState[];
  projectWorkflowId: string | null;
  isLoading: boolean;
  isGuest: boolean;
  permission: "editor" | "viewer";
  isViewer: boolean;
  // masterSheetPreview: Dataset | null;

  // OCR state (kept from old store)
  ocrResult: Dataset | null;
  isOcrProcessing: boolean;

  // ─── Block-level Actions ───
  setBlocks: (blocks: DeskBlockState[]) => void;
  setProjectWorkflowId: (id: string) => void;
  setIsLoading: (v: boolean) => void;
  setIsGuest: (v: boolean) => void;
  setDeskAccess: (access: { isOwner: boolean; isGuest: boolean; permission: "editor" | "viewer" }) => void;

  addBlock: (block: DeskBlockState) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, partial: Partial<DeskBlockState>) => void;
  updateBlockName: (blockId: string, name: string) => void;

  // ─── Per-block Text Input Actions ───
  addTextInput: (
    blockId: string,
    placeholder?: string,
    inputId?: string,
  ) => DeskTextInput;
  removeTextInput: (blockId: string, inputId: string) => void;
  updateTextInputValue: (
    blockId: string,
    inputId: string,
    value: string,
  ) => void;
  updateTextInputPlaceholder: (
    blockId: string,
    inputId: string,
    placeholder: string,
  ) => void;
  getTextInputById: (
    blockId: string,
    inputId: string,
  ) => DeskTextInput | undefined;

  // ─── Per-block Sheet Actions ───
  addSheet: (blockId: string, name?: string, sheetId?: string) => DeskSheet;
  removeSheet: (blockId: string, sheetId: string) => void;
  updateSheetData: (blockId: string, sheetId: string, data: Dataset) => void;
  clearSheetData: (blockId: string, sheetId: string) => void;
  updateSheetName: (blockId: string, sheetId: string, name: string) => void;
  getSheetById: (blockId: string, sheetId: string) => DeskSheet | undefined;

  // ─── Per-block Output Preview ───
  setBlockOutput: (blockId: string, data: Dataset | null) => void;
  setTabOutput: (blockId: string, tabIdOrName: string, data: Dataset | null) => void;
  incomingDataByTab: Record<string, IncomingTabData[]>;
  addIncomingTabData: (targetTabIdentifier: string, item: Omit<IncomingTabData, 'updatedAt'>) => void;
  getIncomingDataForTab: (tabIdOrName?: string) => IncomingTabData[];
  clearIncomingDataForTab: (tabIdOrName: string, id?: string) => void;

  // ─── Per-block Checkbox Actions ───
  addCheckboxField: (blockId: string, field: CheckboxField) => void;
  removeCheckboxField: (blockId: string, fieldId: string) => void;
  toggleCheckbox: (blockId: string, fieldId: string) => void;

  // ─── Per-block Action Button Actions ───
  addActionButton: (blockId: string, button: ActionButton) => void;
  removeActionButton: (blockId: string, buttonId: string) => void;
  triggerActionButton: (blockId: string, buttonId: string) => void;
  resetActionButton: (blockId: string, buttonId: string) => void;
  updateActionButtonLabel: (blockId: string, buttonId: string, label: string) => void;

  // ─── Per-block Execution ───
  setBlockExecuting: (blockId: string, v: boolean) => void;

  // ─── Master Sheet & AI Merged Preview ───
  masterSheetPreview: Dataset | null;
  mergedPreview: (Dataset & { updates?: any[]; alignment?: any; dataStartRow?: number; groupColumns?: any[]; sheetName?: string; targetPath?: string; stackName?: string }) | null;
  activeMasterSheetData: any | null;
  setMasterSheetPreview: (data: Dataset | null) => void;
  setMergedPreview: (data: (Dataset & { updates?: any[]; alignment?: any; dataStartRow?: number; groupColumns?: any[]; sheetName?: string; targetPath?: string; stackName?: string }) | null) => void;
  setDeskMasterSheetData: (data: any) => void;

  // ─── Code Mapping State & Actions ───
  codeMappings: Record<string, CodeMappingEntry>;
  mergedPreviewTabs: MergedPreviewTabData[];
  activePreviewTabCode: string | null;
  setCodeMappings: (mappings: Record<string, CodeMappingEntry>) => void;
  upsertCodeMapping: (codePath: string, entry: CodeMappingEntry) => void;
  removeCodeMapping: (codePath: string) => void;
  setMergedPreviewTabs: (tabs: MergedPreviewTabData[]) => void;
  addMergedPreviewTab: (tab: MergedPreviewTabData) => void;
  updateMergedPreviewTab: (codePath: string, partial: Partial<MergedPreviewTabData>) => void;
  removeMergedPreviewTab: (codePath: string) => void;
  setActivePreviewTabCode: (codePath: string | null) => void;
  updateTabColumnKey: (codePath: string, colIndex: number, keyName: string) => void;
  setTabMergeConfigEnabled: (codePath: string, enabled: boolean) => void;

  // ─── OCR Actions ───
  setOcrResult: (data: Dataset | null) => void;
  setOcrProcessing: (v: boolean) => void;

  // ─── Reset ───
  reset: () => void;
}

// ─── Helper: update block in array ──────────────────────────
function mapBlock(
  blocks: DeskBlockState[],
  blockId: string,
  fn: (b: DeskBlockState) => DeskBlockState,
): DeskBlockState[] {
  return blocks.map((b) => (b.id === blockId ? fn(b) : b));
}

// ─── Store (NO persist — all state from DB) ─────────────────
export const useDeskStore = create<DeskState>()((set, get) => ({
  blocks: [],
  projectWorkflowId: null,
  isLoading: true,
  isGuest: false,
  permission: "editor",
  isViewer: false,
  masterSheetPreview: null,
  mergedPreview: null,
  activeMasterSheetData: null,
  ocrResult: null,
  isOcrProcessing: false,
  incomingDataByTab: {},
  codeMappings: {},
  mergedPreviewTabs: [],
  activePreviewTabCode: null,

  // ─── Top-level setters ─────────────────────────────────────
  setBlocks: (blocks) => set({ blocks }),
  setProjectWorkflowId: (id) => set({ projectWorkflowId: id }),
  setIsLoading: (v) => set({ isLoading: v }),
  setIsGuest: (v) => set({ isGuest: v }),
  setDeskAccess: (access) =>
    set({
      isGuest: access.isGuest,
      permission: access.permission,
      isViewer: access.permission === "viewer",
    }),

  addBlock: (block) => set((s) => ({ blocks: [...s.blocks, block] })),
  removeBlock: (blockId) =>
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== blockId) })),
  updateBlock: (blockId, partial) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({ ...b, ...partial })),
    })),
  updateBlockName: (blockId, name) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({ ...b, name })),
    })),

  // ─── Text Input Actions ────────────────────────────────────
  addTextInput: (blockId, placeholder, inputId) => {
    const id = inputId || crypto.randomUUID();
    const newInput: DeskTextInput = {
      id,
      placeholder:
        placeholder ||
        `Field ${(get().blocks.find((b) => b.id === blockId)?.textInputs.length ?? 0) + 1}`,
      value: "",
    };
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => {
        if (b.textInputs.find((t) => t.id === id)) return b;
        return { ...b, textInputs: [...b.textInputs, newInput] };
      }),
    }));
    return newInput;
  },

  removeTextInput: (blockId, inputId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        textInputs: b.textInputs.filter((t) => t.id !== inputId),
      })),
    })),

  updateTextInputValue: (blockId, inputId, value) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        textInputs: b.textInputs.map((t) =>
          t.id === inputId ? { ...t, value } : t,
        ),
      })),
    })),

  updateTextInputPlaceholder: (blockId, inputId, placeholder) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        textInputs: b.textInputs.map((t) =>
          t.id === inputId ? { ...t, placeholder } : t,
        ),
      })),
    })),

  getTextInputById: (blockId, inputId) => {
    const block = get().blocks.find((b) => b.id === blockId);
    return block?.textInputs.find((t) => t.id === inputId);
  },

  // ─── Sheet Actions ─────────────────────────────────────────
  addSheet: (blockId, name, sheetId) => {
    const id = sheetId || crypto.randomUUID();
    const newSheet: DeskSheet = {
      id,
      name:
        name ||
        `Sheet ${(get().blocks.find((b) => b.id === blockId)?.sheets.length ?? 0) + 1}`,
      data: null,
    };
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => {
        if (b.sheets.find((sh) => sh.id === id)) return b;
        return { ...b, sheets: [...b.sheets, newSheet] };
      }),
    }));
    return newSheet;
  },

  removeSheet: (blockId, sheetId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        sheets: b.sheets.filter((sh) => sh.id !== sheetId),
      })),
    })),

  updateSheetData: (blockId, sheetId, data) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        outputPreview: null,
        sheets: b.sheets.map((sh) =>
          sh.id === sheetId ? { ...sh, data } : sh,
        ),
      })),
    })),

  clearSheetData: (blockId, sheetId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        outputPreview: null,
        sheets: b.sheets.map((sh) =>
          sh.id === sheetId ? { ...sh, data: null } : sh,
        ),
      })),
    })),

  updateSheetName: (blockId, sheetId, name) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        sheets: b.sheets.map((sh) =>
          sh.id === sheetId ? { ...sh, name } : sh,
        ),
      })),
    })),

  getSheetById: (blockId, sheetId) => {
    const block = get().blocks.find((b) => b.id === blockId);
    return block?.sheets.find((sh) => sh.id === sheetId);
  },

  // ─── Output Preview ───────────────────────────────────────
  setBlockOutput: (blockId, data) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        outputPreview: data,
      })),
    })),

  setTabOutput: (blockId, tabIdOrName, data) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => {
        const currentOutputs = b.outputsByTab || {};
        if (data === null) {
          const { [tabIdOrName]: _, ...rest } = currentOutputs;
          return { ...b, outputsByTab: rest };
        }
        return {
          ...b,
          outputsByTab: {
            ...currentOutputs,
            [tabIdOrName]: data,
          },
        };
      }),
    })),

  addIncomingTabData: (targetTabIdentifier, item) => {
    if (!targetTabIdentifier) return;
    const cleanTarget = targetTabIdentifier.trim();
    const key = cleanTarget.toLowerCase();
    const newItem: IncomingTabData = { ...item, updatedAt: Date.now() };

    set((state) => {
      const existingList = state.incomingDataByTab[key] || [];
      const filtered = existingList.filter(
        (e) => e.id !== newItem.id && !(e.name === newItem.name && e.fromTabName === newItem.fromTabName)
      );
      const updatedList = [newItem, ...filtered];

      const matchedBlock = state.blocks.find(
        (b) => b.id.toLowerCase() === key || b.name.toLowerCase() === key
      );

      const nextMap = {
        ...state.incomingDataByTab,
        [key]: updatedList,
        [cleanTarget]: updatedList,
      };

      if (matchedBlock) {
        nextMap[matchedBlock.id] = updatedList;
        nextMap[matchedBlock.name.toLowerCase()] = updatedList;
      }

      return { incomingDataByTab: nextMap };
    });
  },

  getIncomingDataForTab: (tabIdOrName) => {
    if (!tabIdOrName) return [];
    const state = get();
    const clean = tabIdOrName.trim();
    const key = clean.toLowerCase();

    const results: IncomingTabData[] = [];
    const seenIds = new Set<string>();

    const addItems = (list?: IncomingTabData[]) => {
      if (!list) return;
      for (const item of list) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
        }
      }
    };

    // Direct key matches
    addItems(state.incomingDataByTab[key]);
    addItems(state.incomingDataByTab[clean]);

    // Check if tabIdOrName matches any block ID or block name
    const block = state.blocks.find((b) => b.id === clean || b.name.toLowerCase() === key);
    if (block) {
      addItems(state.incomingDataByTab[block.id]);
      addItems(state.incomingDataByTab[block.name.toLowerCase()]);
      addItems(state.incomingDataByTab[block.name]);
    }

    return results;
  },

  clearIncomingDataForTab: (tabIdOrName, id) => {
    const clean = tabIdOrName.trim();
    const key = clean.toLowerCase();
    set((state) => {
      const matchedBlock = state.blocks.find(
        (b) => b.id.toLowerCase() === key || b.name.toLowerCase() === key || b.id === clean || b.name === clean
      );

      const filterList = (list?: IncomingTabData[]) => {
        if (!list) return [];
        return id ? list.filter((i) => i.id !== id) : [];
      };

      const nextMap = { ...state.incomingDataByTab };
      nextMap[key] = filterList(state.incomingDataByTab[key]);
      nextMap[clean] = filterList(state.incomingDataByTab[clean]);

      if (matchedBlock) {
        nextMap[matchedBlock.id] = filterList(state.incomingDataByTab[matchedBlock.id]);
        nextMap[matchedBlock.name.toLowerCase()] = filterList(state.incomingDataByTab[matchedBlock.name.toLowerCase()]);
        nextMap[matchedBlock.name] = filterList(state.incomingDataByTab[matchedBlock.name]);
      }

      return { incomingDataByTab: nextMap };
    });
  },

  // ─── Checkbox Actions ──────────────────────────────────────
  addCheckboxField: (blockId, field) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => {
        if (b.checkboxFields.find((f) => f.id === field.id)) return b;
        return { ...b, checkboxFields: [...b.checkboxFields, field] };
      }),
    })),

  removeCheckboxField: (blockId, fieldId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        checkboxFields: b.checkboxFields.filter((f) => f.id !== fieldId),
      })),
    })),

  toggleCheckbox: (blockId, fieldId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        checkboxFields: b.checkboxFields.map((f) =>
          f.id === fieldId ? { ...f, checked: !f.checked } : f,
        ),
      })),
    })),

  // ─── Action Button Actions ─────────────────────────────────
  addActionButton: (blockId, button) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => {
        const buttons = b.actionButtons ?? [];
        if (buttons.find((a) => a.id === button.id)) return b;
        return { ...b, actionButtons: [...buttons, button] };
      }),
    })),

  removeActionButton: (blockId, buttonId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        actionButtons: (b.actionButtons ?? []).filter((a) => a.id !== buttonId),
      })),
    })),

  triggerActionButton: (blockId, buttonId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        actionButtons: (b.actionButtons ?? []).map((a) =>
          a.id === buttonId ? { ...a, triggered: true } : a
        ),
      })),
    })),

  resetActionButton: (blockId, buttonId) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        actionButtons: (b.actionButtons ?? []).map((a) =>
          a.id === buttonId ? { ...a, triggered: false } : a
        ),
      })),
    })),

  updateActionButtonLabel: (blockId, buttonId, label) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        actionButtons: (b.actionButtons ?? []).map((a) =>
          a.id === buttonId ? { ...a, label } : a
        ),
      })),
    })),

  // ─── Execution ─────────────────────────────────────────────
  setBlockExecuting: (blockId, v) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, blockId, (b) => ({
        ...b,
        isExecuting: v,
      })),
    })),

  // ─── Master Sheet & Merged Preview ──────────────────────────
  setMasterSheetPreview: (data) => set({ masterSheetPreview: data }),
  setMergedPreview: (data) => set({ mergedPreview: data }),
  setDeskMasterSheetData: (data) => set({ activeMasterSheetData: data }),

  // ─── Code Mapping Actions ─────────────────────────────────
  setCodeMappings: (mappings) => set({ codeMappings: mappings }),

  upsertCodeMapping: (codePath, entry) =>
    set((s) => ({
      codeMappings: {
        ...s.codeMappings,
        [codePath]: entry,
      },
    })),

  removeCodeMapping: (codePath) =>
    set((s) => {
      const { [codePath]: _, ...rest } = s.codeMappings;
      return { codeMappings: rest };
    }),

  setMergedPreviewTabs: (tabs) =>
    set({
      mergedPreviewTabs: tabs,
      activePreviewTabCode: tabs.length > 0 ? tabs[0].codePath : null,
    }),

  addMergedPreviewTab: (tab) =>
    set((s) => {
      const exists = s.mergedPreviewTabs.find((t) => t.codePath === tab.codePath);
      if (exists) {
        // Update existing tab
        return {
          mergedPreviewTabs: s.mergedPreviewTabs.map((t) =>
            t.codePath === tab.codePath ? { ...t, ...tab } : t
          ),
        };
      }
      return {
        mergedPreviewTabs: [...s.mergedPreviewTabs, tab],
        activePreviewTabCode: s.activePreviewTabCode || tab.codePath,
      };
    }),

  updateMergedPreviewTab: (codePath, partial) =>
    set((s) => ({
      mergedPreviewTabs: s.mergedPreviewTabs.map((t) =>
        t.codePath === codePath ? { ...t, ...partial } : t
      ),
    })),

  removeMergedPreviewTab: (codePath) =>
    set((s) => {
      const filtered = s.mergedPreviewTabs.filter((t) => t.codePath !== codePath);
      return {
        mergedPreviewTabs: filtered,
        activePreviewTabCode:
          s.activePreviewTabCode === codePath
            ? filtered[0]?.codePath || null
            : s.activePreviewTabCode,
      };
    }),

  setActivePreviewTabCode: (codePath) => set({ activePreviewTabCode: codePath }),

  updateTabColumnKey: (codePath, colIndex, keyName) =>
    set((s) => ({
      mergedPreviewTabs: s.mergedPreviewTabs.map((t) => {
        if (t.codePath !== codePath) return t;
        return {
          ...t,
          columnKeyMap: {
            ...t.columnKeyMap,
            [keyName]: colIndex,
          },
        };
      }),
    })),

  setTabMergeConfigEnabled: (codePath, enabled) =>
    set((s) => ({
      mergedPreviewTabs: s.mergedPreviewTabs.map((t) =>
        t.codePath === codePath ? { ...t, mergeConfigEnabled: enabled } : t
      ),
    })),

  // ─── OCR ───────────────────────────────────────────────────
  setOcrResult: (data) => set({ ocrResult: data }),
  setOcrProcessing: (v) => set({ isOcrProcessing: v }),

  // ─── Reset ─────────────────────────────────────────────────
  reset: () =>
    set({
      blocks: [],
      projectWorkflowId: null,
      isLoading: true,
      isGuest: false,
      masterSheetPreview: null,
      mergedPreview: null,
      activeMasterSheetData: null,
      ocrResult: null,
      isOcrProcessing: false,
      codeMappings: {},
      mergedPreviewTabs: [],
      activePreviewTabCode: null,
    }),
}));
