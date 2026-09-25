export interface TileItem {
  id: string;
  label: string;
  imageBase64: string;
  fileName: string;
  /** 0-indexed row range [start, end] inclusive (Y-axis) */
  rowRange: [number, number];
  /** 0-indexed column range [start, end] inclusive (X-axis) */
  colRange: [number, number];
  /** Whether this tile image fragment includes the table header row */
  hasHeader: boolean;
  status: "idle" | "scanning" | "ready" | "error";
  error?: string;
  extractedCols?: string[];
  extractedData?: (string | null)[][];
  detectedRowsCount?: number;
  detectedColsCount?: number;
  color: string;
}

export type OverlapStrategy = "prefer_longest" | "prefer_first" | "prefer_latest";
export type StitchMode = "coordinate" | "sequential_rows" | "key_column";

export interface PromptDirectives {
  customPrompt: string;
  dotToA: boolean;
  leaveUnclearBlank: boolean;
  handleCrossOuts: boolean;
  parseMultiTierDates: boolean;
  includeBottomNotes: boolean;
}

export interface TiledGridConfig {
  totalRows: number;
  totalCols: number;
  autoFitToExtracted: boolean;
  overlapStrategy: OverlapStrategy;
  trimDuplicateHeaders: boolean;
  stitchMode: StitchMode;
  keyColumnName?: string;
  directives: PromptDirectives;
}

export interface StitchedResult {
  columns: string[];
  data: (string | null)[][];
  stats: {
    totalRows: number;
    totalCols: number;
    filledCells: number;
    totalCells: number;
    tilesUsed: number;
    uncoveredCells: number;
  };
  tileCellSourceMap: (string | null)[][]; // tile id for each cell
}

export const TILE_PALETTE = [
  { name: "Indigo", bg: "bg-indigo-500/15", border: "border-indigo-500/40", text: "text-indigo-600 dark:text-indigo-400", hex: "#6366f1" },
  { name: "Emerald", bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", hex: "#10b981" },
  { name: "Amber", bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b" },
  { name: "Rose", bg: "bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e" },
  { name: "Sky", bg: "bg-sky-500/15", border: "border-sky-500/40", text: "text-sky-600 dark:text-sky-400", hex: "#0ea5e9" },
  { name: "Purple", bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-600 dark:text-purple-400", hex: "#a855f7" },
  { name: "Cyan", bg: "bg-cyan-500/15", border: "border-cyan-500/40", text: "text-cyan-600 dark:text-cyan-400", hex: "#06b6d4" },
  { name: "Orange", bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-600 dark:text-orange-400", hex: "#f97316" },
  { name: "Teal", bg: "bg-teal-500/15", border: "border-teal-500/40", text: "text-teal-600 dark:text-teal-400", hex: "#14b8a6" },
];
