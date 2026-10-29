/**
 * Helper utilities for Data Library dataset manipulation,
 * normalization, smart column suggestions, and local storage persistence.
 */

export interface NormalizedDataset {
  columns: string[];
  rows: any[][];
}

export type SlideshowInputType =
  | "options"
  | "text"
  | "number"
  | "date"
  | "image"
  | "time"
  | "boolean"
  | "rating"
  | "slider"
  | "color";

export interface SlideshowSession {
  fileId: string;
  columnName: string;
  inputType: SlideshowInputType;
  optionsList: string[];
  keyColIndex: number;
  answers: Record<number, string>;
  currentIndex: number;
  totalRows: number;
  updatedAt: number;
}

/**
 * Normalizes any format of stored data into consistent { columns, rows }
 */
export function normalizeDataset(raw: any): NormalizedDataset {
  if (!raw) {
    return { columns: [], rows: [] };
  }

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { columns: [], rows: [] };
    }
  }

  // Format: { columns: [...], data: [...] }
  if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.data)) {
    return {
      columns: parsed.columns.map((c: any) => String(c ?? "")),
      rows: parsed.data.map((row: any) =>
        Array.isArray(row)
          ? row.map((cell: any) => String(cell ?? ""))
          : parsed.columns.map((col: string) => String(row?.[col] ?? "")),
      ),
    };
  }

  // Format: Array of objects [{ col1: val1, ... }]
  if (Array.isArray(parsed) && parsed.length > 0) {
    if (typeof parsed[0] === "object" && !Array.isArray(parsed[0])) {
      const columns = Object.keys(parsed[0]);
      const rows = parsed.map((item: any) =>
        columns.map((col) => String(item?.[col] ?? "")),
      );
      return { columns, rows };
    }

    // Format: 2D array [[col1, col2], [val1, val2], ...]
    if (Array.isArray(parsed[0])) {
      const columns = parsed[0].map((c: any) => String(c ?? ""));
      const rows = parsed
        .slice(1)
        .map((row: any) => row.map((cell: any) => String(cell ?? "")));
      return { columns, rows };
    }
  }

  return { columns: [], rows: [] };
}

/**
 * Prepares dataset for database persistence
 */
export function serializeDataset(columns: string[], rows: any[][]) {
  return {
    columns: columns.map((c) => String(c).trim()),
    data: rows.map((r) =>
      r.map((cell) =>
        cell !== undefined && cell !== null ? String(cell) : "",
      ),
    ),
  };
}

/**
 * Formats current date for column names (defaults to Indian format DD-MM-YYYY)
 */
export function getCurrentDateColumnName(
  format: "indian" | "iso" | "slash" | "friendly" = "indian",
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  if (format === "iso") {
    return `${year}-${month}-${day}`;
  }
  if (format === "slash") {
    return `${day}/${month}/${year}`;
  }
  if (format === "friendly") {
    const monthShort = now.toLocaleString("default", { month: "short" });
    return `${day} ${monthShort} ${year}`;
  }
  // Default: Indian format DD-MM-YYYY
  return `${day}-${month}-${year}`;
}

/**
 * Format any date into Indian format DD-MM-YYYY
 */
export function formatIndianDate(date: Date | string): string {
  if (!date) return "";
  if (typeof date === "string") {
    const parts = date.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Increment previous column name intelligently (handles numbers, Indian/ISO dates, tags)
 */
export function getIncrementedColumnName(lastCol?: string): string {
  if (!lastCol || !lastCol.trim()) {
    return "Column 1";
  }

  const trimmed = lastCol.trim();

  // Check if it's an Indian date: DD-MM-YYYY
  const indianDateMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (indianDateMatch) {
    const dNum = parseInt(indianDateMatch[1], 10);
    const mNum = parseInt(indianDateMatch[2], 10) - 1;
    const yNum = parseInt(indianDateMatch[3], 10);
    const date = new Date(yNum, mNum, dNum);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() + 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${d}-${m}-${y}`;
    }
  }

  // Check if it's an ISO date: YYYY-MM-DD
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() + 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Check if it ends with numbers (e.g., "Day 1", "Session_02", "Col3")
  const numMatch = trimmed.match(/^(.*?)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1];
    const numStr = numMatch[2];
    const num = parseInt(numStr, 10);
    const nextNum = num + 1;
    // preserve padding if "01" -> "02"
    const padded = nextNum.toString().padStart(numStr.length, "0");
    return `${prefix}${padded}`;
  }

  // Check if it ends with a single letter (e.g., "Section A" -> "Section B")
  const letterMatch = trimmed.match(/^(.*?\s+)([A-Y])$/i);
  if (letterMatch) {
    const prefix = letterMatch[1];
    const charCode = letterMatch[2].charCodeAt(0);
    return `${prefix}${String.fromCharCode(charCode + 1)}`;
  }

  return `${trimmed} 2`;
}

/**
 * Decrement previous column name intelligently
 */
export function getDecrementedColumnName(lastCol?: string): string {
  if (!lastCol || !lastCol.trim()) {
    return "Column 1";
  }

  const trimmed = lastCol.trim();

  // Check if it's an Indian date: DD-MM-YYYY
  const indianDateMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (indianDateMatch) {
    const dNum = parseInt(indianDateMatch[1], 10);
    const mNum = parseInt(indianDateMatch[2], 10) - 1;
    const yNum = parseInt(indianDateMatch[3], 10);
    const date = new Date(yNum, mNum, dNum);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() - 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${d}-${m}-${y}`;
    }
  }

  // Check if it's an ISO date: YYYY-MM-DD
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() - 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Check if it ends with numbers
  const numMatch = trimmed.match(/^(.*?)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1];
    const numStr = numMatch[2];
    const num = parseInt(numStr, 10);
    const prevNum = Math.max(1, num - 1);
    const padded = prevNum.toString().padStart(numStr.length, "0");
    return `${prefix}${padded}`;
  }

  // Check if it ends with a single letter (e.g., "Section B" -> "Section A")
  const letterMatch = trimmed.match(/^(.*?\s+)([B-Z])$/i);
  if (letterMatch) {
    const prefix = letterMatch[1];
    const charCode = letterMatch[2].charCodeAt(0);
    return `${prefix}${String.fromCharCode(charCode - 1)}`;
  }

  return `${trimmed} 1`;
}

/**
 * Auto-detect primary key / label column index
 */
export function detectKeyColumnIndex(columns: string[]): number {
  if (!columns || columns.length === 0) return 0;

  const keyKeywords = [
    "id",
    "roll",
    "rollno",
    "roll_no",
    "reg",
    "empid",
    "emp_id",
    "name",
    "username",
    "key",
    "code",
  ];

  for (const keyword of keyKeywords) {
    const idx = columns.findIndex(
      (col) => col.toLowerCase().replace(/[^a-z0-9]/g, "") === keyword,
    );
    if (idx !== -1) return idx;
  }

  // Fallback: look for partial match
  for (const keyword of keyKeywords) {
    const idx = columns.findIndex((col) => col.toLowerCase().includes(keyword));
    if (idx !== -1) return idx;
  }

  return 0; // Default to first column
}

// Local Storage Session Management
const LOCAL_STORAGE_PREFIX = "datalib_slideshow_";

export function getSlideshowStorageKey(fileId: string): string {
  return `${LOCAL_STORAGE_PREFIX}${fileId}`;
}

export function getStoredSlideshow(fileId: string): SlideshowSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getSlideshowStorageKey(fileId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read slideshow from localStorage:", e);
    return null;
  }
}

export function saveStoredSlideshow(session: SlideshowSession): void {
  if (typeof window === "undefined") return;
  try {
    session.updatedAt = Date.now();
    localStorage.setItem(
      getSlideshowStorageKey(session.fileId),
      JSON.stringify(session),
    );
  } catch (e) {
    console.error("Failed to save slideshow to localStorage:", e);
  }
}

export function clearStoredSlideshow(fileId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getSlideshowStorageKey(fileId));
  } catch (e) {
    console.error("Failed to clear slideshow from localStorage:", e);
  }
}

export function hasStoredSlideshow(fileId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(getSlideshowStorageKey(fileId)) !== null;
  } catch {
    return false;
  }
}

export type DetectedColumnType =
  | "text"
  | "number"
  | "date"
  | "image"
  | "options"
  | "progressbar"
  | "boolean"
  | "rating";

export function isDateValue(val: any): boolean {
  if (typeof val !== "string" && typeof val !== "number") return false;
  const s = String(val).trim();
  if (!s || s.length < 6) return false;
  // Exclude pure short numbers like 12345
  if (/^\d+$/.test(s) && s.length <= 6) return false;
  // Match standard date formats: YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY, ISO strings
  const datePattern =
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$|^\d{4}-\d{2}-\d{2}T/;
  if (!datePattern.test(s)) return false;
  const timestamp = Date.parse(s);
  return !isNaN(timestamp);
}

export function getColumnType(
  columnName: string,
  colIndex: number,
  columnTypes?: Record<string, string>,
  sampleValues: any[] = [],
): DetectedColumnType {
  // 1. Explicit metadata setting always takes absolute priority
  if (columnTypes && columnTypes[columnName]) {
    const raw = columnTypes[columnName].toLowerCase().trim();
    if (raw === "progressbar" || raw === "progress" || raw === "slider")
      return "progressbar";
    if (raw === "date") return "date";
    if (raw === "image" || raw === "file") return "image";
    if (raw === "options" || raw === "status") return "options";
    if (raw === "number") return "number";
    if (raw === "rating") return "rating";
    if (raw === "boolean") return "boolean";
    if (raw === "text") return "text";
  }

  const lower = (columnName || "").toLowerCase().trim();

  // Progress Bar heuristic:
  if (
    lower === "progress" ||
    lower.includes("progress bar") ||
    lower === "progressbar" ||
    lower.endsWith("%")
  ) {
    return "progressbar";
  }

  // Image heuristic based on content:
  const hasImages = sampleValues.some(
    (v) =>
      typeof v === "string" &&
      (v.startsWith("http://") ||
        v.startsWith("https://") ||
        v.startsWith("data:image/") ||
        /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(v)),
  );
  if (hasImages) return "image";

  // Check if all non-empty sample values are attendance markers / status codes (e.g. P, A, Present, Absent)
  const nonNull = sampleValues
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  const isAttendance =
    nonNull.length > 0 &&
    nonNull.every((v) =>
      [
        "P",
        "A",
        "L",
        "H",
        "PR",
        "AB",
        "PRESENT",
        "ABSENT",
        "PASS",
        "FAIL",
      ].includes(v.toUpperCase()),
    );
  if (isAttendance) {
    return "options";
  }

  // Date heuristic: NEVER check only the column name! Must have actual date-formatted values
  const hasRealDateValues =
    nonNull.length > 0 && nonNull.some((v) => isDateValue(v));
  if (
    hasRealDateValues &&
    (lower.includes("date") ||
      lower.includes("dob") ||
      lower.includes("deadline"))
  ) {
    return "date";
  }

  return "text";
}
