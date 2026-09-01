/**
 * Syncfusion Spreadsheet Utility Functions for MasterSheet handling & JSONB persistence
 */

export interface FlatDataset {
  columns: string[];
  data: any[][];
}

/**
 * Unwraps and returns a valid Syncfusion JSON workbook object ({ Workbook: { sheets: [...] } })
 * from any raw data structure (DB record, API response, wrapped object, or jsonObject wrapper).
 */
export function unwrapSyncfusionJson(rawData: any): any {
  if (!rawData || typeof rawData !== "object") return null;

  let current = rawData;

  // 1. Unwrap DB record or API response wrapper { data: ... }
  if (
    current.data &&
    typeof current.data === "object" &&
    (current.data.Workbook || current.data.jsonObject || current.data.sheets)
  ) {
    current = current.data;
  }

  // 2. Unwrap Syncfusion saveAsJson result wrapper { jsonObject: ... }
  if (
    current.jsonObject &&
    typeof current.jsonObject === "object" &&
    (current.jsonObject.Workbook || current.jsonObject.sheets)
  ) {
    current = current.jsonObject;
  }

  // 3. Check if valid Workbook structure
  if (current.Workbook || (current.sheets && Array.isArray(current.sheets))) {
    // Return wrapped in { Workbook: ... } if sheets is top-level
    if (!current.Workbook && current.sheets) {
      return { Workbook: current };
    }
    return current;
  }

  return null;
}

/**
 * Converts a flat dataset { columns: string[], data: any[][] } into a valid Syncfusion Workbook object
 * so that openFromJson can render it as a styled spreadsheet.
 */
export function convertFlatToSyncfusionWorkbook(flatData: FlatDataset): any {
  if (!flatData || !Array.isArray(flatData.columns)) return null;

  const rows: any[] = [];

  // Header row
  if (flatData.columns.length > 0) {
    rows.push({
      cells: flatData.columns.map((col) => ({
        value: col,
        style: { fontWeight: "bold", backgroundColor: "#e2e8f0", textAlign: "center" },
      })),
    });
  }

  // Data rows
  if (Array.isArray(flatData.data)) {
    flatData.data.forEach((row) => {
      if (Array.isArray(row)) {
        rows.push({
          cells: row.map((cell) => ({
            value: cell != null ? String(cell) : "",
          })),
        });
      }
    });
  }

  return {
    Workbook: {
      sheets: [
        {
          name: "Sheet1",
          rows: rows,
          showGridLines: true,
        },
      ],
    },
  };
}

/**
 * Directly extracts workbook structure from Syncfusion instance memory
 */
export function extractSyncfusionInstanceData(ss: any): any {
  if (!ss) return null;
  const sheets = ss.sheets || ss.getActiveSheet?.();
  if (!sheets) return null;

  const sheetArray = Array.isArray(sheets) ? sheets : [sheets];
  const cleanSheets = sheetArray.map((sheet: any, idx: number) => {
    const rows = (sheet.rows || []).map((row: any) => {
      if (!row) return { cells: [] };
      return {
        cells: (row.cells || []).map((cell: any) => {
          if (!cell) return {};
          const cleaned: any = {};
          if (cell.value !== undefined && cell.value !== null) cleaned.value = cell.value;
          if (cell.style && Object.keys(cell.style).length > 0) cleaned.style = cell.style;
          if (cell.colSpan) cleaned.colSpan = cell.colSpan;
          if (cell.rowSpan) cleaned.rowSpan = cell.rowSpan;
          if (cell.formula) cleaned.formula = cell.formula;
          if (cell.format) cleaned.format = cell.format;
          if (cell.hyperlink) cleaned.hyperlink = cell.hyperlink;
          return cleaned;
        }),
      };
    });
    return {
      id: sheet.id || idx + 1,
      name: sheet.name || `Sheet${idx + 1}`,
      rows,
      index: sheet.index ?? idx,
      state: sheet.state || "Visible",
      columns: Array.isArray(sheet.columns) ? sheet.columns.map((c: any) => ({ width: c?.width, hidden: c?.hidden })) : [],
      colCount: sheet.colCount || 100,
      rowCount: sheet.rowCount || 100,
      usedRange: sheet.usedRange ? { rowIndex: sheet.usedRange.rowIndex || 0, colIndex: sheet.usedRange.colIndex || 0 } : { rowIndex: 0, colIndex: 0 },
      activeCell: typeof sheet.activeCell === 'string' ? sheet.activeCell : "A1",
      frozenRows: sheet.frozenRows || 0,
      frozenColumns: sheet.frozenColumns || 0,
      selectedRange: typeof sheet.selectedRange === 'string' ? sheet.selectedRange : "A1:A1",
      showGridLines: sheet.showGridLines !== false,
      showHeaders: sheet.showHeaders !== false,
    };
  });

  return {
    Workbook: {
      sheets: cleanSheets,
      activeSheetIndex: ss.activeSheetIndex || 0,
    },
  };
}

/**
 * Safely opens any sheet raw data (full Syncfusion JSON or flat 2D array) in a Syncfusion instance.
 * Uses exact microSheetAgent loadJson pattern: passes unwrapped workbook JSON directly into ss.openFromJson({ file: data }).
 */
export function openSheetInSyncfusion(ss: any, rawData: any) {
  if (!ss || !rawData) return;

  try {
    if (typeof ss.openFromJson !== "function") {
      console.warn("ss.openFromJson is not a function");
      return;
    }

    if (rawData instanceof File || rawData instanceof Blob) {
      ss.openFromJson({ file: rawData });
      return;
    }

    let targetData = unwrapSyncfusionJson(rawData) || rawData;

    // Unwrap flat table dataset { columns: [...], data: [...] }
    if (targetData.columns && Array.isArray(targetData.columns)) {
      const converted = convertFlatToSyncfusionWorkbook(targetData);
      if (converted) {
        targetData = converted;
      }
    } else if (targetData.data && targetData.data.columns && Array.isArray(targetData.data.columns)) {
      const converted = convertFlatToSyncfusionWorkbook(targetData.data);
      if (converted) {
        targetData = converted;
      }
    }

    // Pass data directly to Syncfusion openFromJson (microSheetAgent pattern)
    ss.openFromJson({ file: targetData });
  } catch (err) {
    console.warn("Error opening sheet in Syncfusion:", err);
  }
}

/**
 * Helper to extract clean Syncfusion JSON object to save into Postgres JSONB column
 */
export function extractSyncfusionSaveData(saveAsJsonResult: any): any {
  if (!saveAsJsonResult) return null;
  const jsonObject = saveAsJsonResult.jsonObject || saveAsJsonResult;
  return jsonObject;
}

/**
 * Extracts a normalized 2D table { columns: string[], data: any[][] } from any sheet representation
 * (FlatDataset, nested object, or Syncfusion Workbook JSON).
 */
export function extract2DGridFromAnySheet(sheetData: any): { columns: string[]; data: any[][] } {
  if (!sheetData) return { columns: [], data: [] };

  // 1. Direct FlatDataset { columns: [...], data: [...] }
  if (Array.isArray(sheetData.columns) && Array.isArray(sheetData.data)) {
    return { columns: sheetData.columns, data: sheetData.data };
  }

  // 2. Wrapped in data { columns: [...], data: [...] }
  if (sheetData.data && Array.isArray(sheetData.data.columns) && Array.isArray(sheetData.data.data)) {
    return { columns: sheetData.data.columns, data: sheetData.data.data };
  }

  // 3. Syncfusion Workbook format
  const wb = unwrapSyncfusionJson(sheetData) || sheetData;
  const sheets = wb?.Workbook?.sheets || wb?.sheets;
  if (Array.isArray(sheets) && sheets.length > 0) {
    const firstSheet = sheets[0];
    const rows = firstSheet?.rows || [];
    if (Array.isArray(rows) && rows.length > 0) {
      const grid: any[][] = [];
      let maxCols = 0;

      rows.forEach((r: any) => {
        const rowCells: any[] = [];
        if (r && Array.isArray(r.cells)) {
          r.cells.forEach((c: any, cIdx: number) => {
            const val = c?.value !== undefined && c?.value !== null ? c.value : "";
            rowCells[cIdx] = val;
          });
        }
        maxCols = Math.max(maxCols, rowCells.length);
        grid.push(rowCells);
      });

      // Fill in undefined entries
      grid.forEach((row) => {
        while (row.length < maxCols) row.push("");
      });

      if (grid.length > 0) {
        const headerRow = grid[0].map((v, i) => (v ? String(v) : `Col_${i + 1}`));
        const dataRows = grid.slice(1);
        return { columns: headerRow, data: dataRows };
      }
    }
  }

  return { columns: [], data: [] };
}

/**
 * Applies computed student updates to generate clean preview rows (no vertical space offset)
 */
export function applyComputedUpdatesToGrid(
  baseColumns: string[],
  baseData: any[][],
  updates: any[],
  targetPath?: string
): { columns: string[]; data: any[][] } {
  const pathPrefix = targetPath || "CO24554/Th.";
  const previewColumns = ["S.No", "Enrollment", "Name", `${pathPrefix}:Total`, `${pathPrefix}:Attended`, `${pathPrefix}:%`];

  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      columns: previewColumns,
      data: [],
    };
  }

  // Generate clean preview rows starting immediately at index 0 (S.No 1, 2, 3...)
  const previewData = updates.map((u, idx) => {
    const sNo = u.s_no !== undefined ? u.s_no : (idx + 1);
    const enroll = u.enrollment || "";
    const name = u.student_name || "";
    const total = u.total_new_value !== undefined && u.total_new_value !== null ? u.total_new_value : "";
    const attended = u.attended_new_value !== undefined && u.attended_new_value !== null ? u.attended_new_value : "";
    const pct = u.percentage_new_value || (total ? `${Math.round(((Number(attended) || 0) / (Number(total) || 1)) * 100)}%` : "0%");

    return [sNo, enroll, name, total, attended, pct];
  });

  return {
    columns: previewColumns,
    data: previewData,
  };
}

/**
 * Converts 0-based column index to Excel column letter (0 -> A, 1 -> B, 26 -> AA, etc.)
 */
export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex + 1;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Directly updates cells in an active Syncfusion Spreadsheet instance using updateCell / cell addresses.
 */
export function applyUpdatesDirectlyToSyncfusion(ss: any, updates: any[]): boolean {
  if (!ss || !Array.isArray(updates) || updates.length === 0) return false;

  try {
    updates.forEach((u) => {
      const rowNum = (u.row_idx !== undefined && u.row_idx !== null ? u.row_idx : 0) + 1;

      if (u.total_col_idx !== undefined && u.total_new_value !== undefined) {
        const colLetter = colIndexToLetter(u.total_col_idx);
        const cellAddr = `${colLetter}${rowNum}`;
        if (typeof ss.updateCell === "function") {
          ss.updateCell({ value: u.total_new_value }, cellAddr);
        }
      }

      if (u.attended_col_idx !== undefined && u.attended_new_value !== undefined) {
        const colLetter = colIndexToLetter(u.attended_col_idx);
        const cellAddr = `${colLetter}${rowNum}`;
        if (typeof ss.updateCell === "function") {
          ss.updateCell({ value: u.attended_new_value }, cellAddr);
        }
      }

      if (u.percentage_col_idx !== undefined && u.percentage_new_value !== undefined) {
        const colLetter = colIndexToLetter(u.percentage_col_idx);
        const cellAddr = `${colLetter}${rowNum}`;
        if (typeof ss.updateCell === "function") {
          ss.updateCell({ value: u.percentage_new_value }, cellAddr);
        }
      }
    });

    return true;
  } catch (err) {
    console.warn("Direct updateCell failed:", err);
    return false;
  }
}

/**
 * Applies computed student updates in-place into the full MasterSheet (Syncfusion Workbook or 2D Table)
 * preserving all title rows, headers, merges, and styles.
 */
export function applyUpdatesToMasterSheet(
  currentSheetRaw: any,
  updates: any[],
  targetPath?: string
): any {
  if (!currentSheetRaw || !Array.isArray(updates) || updates.length === 0) {
    return currentSheetRaw;
  }

  // 1. If it's a Syncfusion Workbook
  const unwrapped = unwrapSyncfusionJson(currentSheetRaw);
  if (unwrapped && (unwrapped.Workbook || unwrapped.sheets)) {
    const wb = JSON.parse(JSON.stringify(unwrapped));
    const sheets = wb.Workbook?.sheets || wb.sheets || [];
    if (sheets.length > 0) {
      const sheet = sheets[0];
      if (!Array.isArray(sheet.rows)) sheet.rows = [];

      updates.forEach((u) => {
        const rIdx = u.row_idx;
        if (rIdx === undefined || rIdx === null) return;

        // Ensure row exists
        while (sheet.rows.length <= rIdx) {
          sheet.rows.push({ cells: [] });
        }
        const row = sheet.rows[rIdx];
        if (!Array.isArray(row.cells)) row.cells = [];

        // Helper to set cell value
        const setCellVal = (colIdx: number, val: any) => {
          if (colIdx === undefined || colIdx === null || colIdx < 0) return;
          while (row.cells.length <= colIdx) {
            row.cells.push({});
          }
          if (!row.cells[colIdx]) row.cells[colIdx] = {};
          row.cells[colIdx].value = val;
        };

        if (u.auto_populated) {
          if (u.s_no) setCellVal(0, u.s_no);
          if (u.enrollment && u.enrollment_col_idx != null) setCellVal(u.enrollment_col_idx, u.enrollment);
          if (u.student_name && u.name_col_idx != null) setCellVal(u.name_col_idx, u.student_name);
        }

        if (u.total_col_idx != null) setCellVal(u.total_col_idx, u.total_new_value);
        if (u.attended_col_idx != null) setCellVal(u.attended_col_idx, u.attended_new_value);
        if (u.percentage_col_idx != null) setCellVal(u.percentage_col_idx, u.percentage_new_value);
      });

      return wb;
    }
  }

  // 2. If it's a 2D table { columns, data }
  if (currentSheetRaw.columns && Array.isArray(currentSheetRaw.data)) {
    const updatedData = currentSheetRaw.data.map((r: any[]) => [...r]);
    const cols = [...currentSheetRaw.columns];

    updates.forEach((u) => {
      const rIdx = u.row_idx;
      while (updatedData.length <= rIdx) {
        updatedData.push(new Array(cols.length).fill(""));
      }
      while (updatedData[rIdx].length < cols.length) {
        updatedData[rIdx].push("");
      }

      if (u.total_col_idx != null && u.total_col_idx < updatedData[rIdx].length) {
        updatedData[rIdx][u.total_col_idx] = u.total_new_value;
      }
      if (u.attended_col_idx != null && u.attended_col_idx < updatedData[rIdx].length) {
        updatedData[rIdx][u.attended_col_idx] = u.attended_new_value;
      }
      if (u.percentage_col_idx != null && u.percentage_col_idx < updatedData[rIdx].length) {
        updatedData[rIdx][u.percentage_col_idx] = u.percentage_new_value;
      }
    });

    return { columns: cols, data: updatedData };
  }

  return currentSheetRaw;
}


