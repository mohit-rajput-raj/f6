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

  // 4. Single sheet snapshot structure (e.g. { name: "Sheet1", rows: [...] })
  if (current.rows && Array.isArray(current.rows)) {
    return {
      Workbook: {
        sheets: [current],
      },
    };
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
 * Extracts a complete raw 2D grid from an active Syncfusion Spreadsheet instance.
 * Preserves ALL rows (including title rows, banner headers, and multi-level headers)
 * without slicing or stripping rows.
 */
export function extractFullGridFromSyncfusion(ss: any): any[][] {
  if (!ss) return [];
  try {
    const activeSheet =
      (typeof ss.getActiveSheet === "function" ? ss.getActiveSheet() : null) ||
      (Array.isArray(ss.sheets) ? ss.sheets[ss.activeSheetIndex || 0] : null);

    const rows = activeSheet?.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

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

    // Ensure rectangular 2D array
    grid.forEach((row) => {
      while (row.length < maxCols) row.push("");
    });

    return grid;
  } catch (err) {
    console.warn("extractFullGridFromSyncfusion error:", err);
    return [];
  }
}

/**
 * Applies computed student updates to generate clean preview rows (no vertical space offset)
 */
export function applyComputedUpdatesToGrid(
  baseColumns: string[],
  baseData: any[][],
  updates: any[],
  targetPath?: string,
  groupColumns?: Array<{ col_idx: number; header: string }>
): { columns: string[]; data: any[][] } {
  const pathPrefix = targetPath || "CO24554/Th.";

  let previewColumns: string[];
  if (Array.isArray(groupColumns) && groupColumns.length > 0) {
    previewColumns = [
      "S.No",
      "Enrollment",
      "Name",
      ...groupColumns.map((g) => (g.header ? `${pathPrefix}:${g.header}` : `${pathPrefix}:Col_${g.col_idx + 1}`)),
    ];
  } else {
    previewColumns = ["S.No", "Enrollment", "Name", `${pathPrefix}:Total`, `${pathPrefix}:Attended`, `${pathPrefix}:%`];
  }

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

    if (Array.isArray(groupColumns) && groupColumns.length > 0) {
      const colVals = groupColumns.map((g) => {
        if (u.cell_updates && u.cell_updates[g.col_idx] !== undefined) {
          return u.cell_updates[g.col_idx];
        }
        if (g.col_idx === u.total_col_idx && u.total_new_value !== undefined) return u.total_new_value;
        if (g.col_idx === u.attended_col_idx && u.attended_new_value !== undefined) return u.attended_new_value;
        if (g.col_idx === u.percentage_col_idx && u.percentage_new_value !== undefined) return u.percentage_new_value;
        return "";
      });
      return [sNo, enroll, name, ...colVals];
    }

    const total = u.total_new_value !== undefined && u.total_new_value !== null ? u.total_new_value : "";
    const attended = u.attended_new_value !== undefined && u.attended_new_value !== null ? u.attended_new_value : "";
    let pct = u.percentage_new_value;
    if (pct === undefined || pct === null) {
      pct = total ? Math.round(((Number(attended) || 0) / (Number(total) || 1)) * 100) : 0;
    }

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

      // 1. Generic cell_updates map { col_idx: value }
      if (u.cell_updates && typeof u.cell_updates === "object") {
        for (const [colIdxStr, val] of Object.entries(u.cell_updates)) {
          const colIdx = parseInt(colIdxStr, 10);
          if (isNaN(colIdx) || colIdx < 0) continue;
          const colLetter = colIndexToLetter(colIdx);
          const cellAddr = `${colLetter}${rowNum}`;
          if (typeof ss.updateCell === "function") {
            ss.updateCell({ value: val }, cellAddr);
          }
        }
        return;
      }

      // 2. Fallback legacy total / attended / percentage
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
  targetPath?: string,
  dataStartRow?: number
): any {
  if (!currentSheetRaw || !Array.isArray(updates) || updates.length === 0) {
    return currentSheetRaw;
  }

  // Guard: Never write into rows before dataStartRow (defaults to 1 if not specified)
  const minRow = dataStartRow !== undefined && dataStartRow !== null ? dataStartRow : 1;
  const safeUpdates = updates.filter((u) => (u.row_idx !== undefined && u.row_idx !== null ? u.row_idx >= minRow : true));

  // 1. If it's a Syncfusion Workbook
  const unwrapped = unwrapSyncfusionJson(currentSheetRaw);
  if (unwrapped && (unwrapped.Workbook || unwrapped.sheets)) {
    const wb = JSON.parse(JSON.stringify(unwrapped));
    const sheets = wb.Workbook?.sheets || wb.sheets || [];
    if (sheets.length > 0) {
      const sheet = sheets[0];
      if (!Array.isArray(sheet.rows)) sheet.rows = [];

      safeUpdates.forEach((u) => {
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

        if (u.cell_updates && typeof u.cell_updates === "object") {
          for (const [colIdxStr, val] of Object.entries(u.cell_updates)) {
            const colIdx = parseInt(colIdxStr, 10);
            if (!isNaN(colIdx) && colIdx >= 0) {
              setCellVal(colIdx, val);
            }
          }
        } else {
          if (u.total_col_idx != null) setCellVal(u.total_col_idx, u.total_new_value);
          if (u.attended_col_idx != null) setCellVal(u.attended_col_idx, u.attended_new_value);
          if (u.percentage_col_idx != null) setCellVal(u.percentage_col_idx, u.percentage_new_value);
        }
      });

      return wb;
    }
  }

  // 2. If it's a 2D table { columns, data }
  if (currentSheetRaw.columns && Array.isArray(currentSheetRaw.data)) {
    const updatedData = currentSheetRaw.data.map((r: any[]) => [...r]);
    const cols = [...currentSheetRaw.columns];

    safeUpdates.forEach((u) => {
      const rIdx = u.row_idx;
      while (updatedData.length <= rIdx) {
        updatedData.push(new Array(cols.length).fill(""));
      }
      while (updatedData[rIdx].length < cols.length) {
        updatedData[rIdx].push("");
      }

      if (u.cell_updates && typeof u.cell_updates === "object") {
        for (const [colIdxStr, val] of Object.entries(u.cell_updates)) {
          const colIdx = parseInt(colIdxStr, 10);
          if (!isNaN(colIdx) && colIdx >= 0 && colIdx < updatedData[rIdx].length) {
            updatedData[rIdx][colIdx] = val;
          }
        }
      } else {
        if (u.total_col_idx != null && u.total_col_idx < updatedData[rIdx].length) {
          updatedData[rIdx][u.total_col_idx] = u.total_new_value;
        }
        if (u.attended_col_idx != null && u.attended_col_idx < updatedData[rIdx].length) {
          updatedData[rIdx][u.attended_col_idx] = u.attended_new_value;
        }
        if (u.percentage_col_idx != null && u.percentage_col_idx < updatedData[rIdx].length) {
          updatedData[rIdx][u.percentage_col_idx] = u.percentage_new_value;
        }
      }
    });

    return { columns: cols, data: updatedData };
  }

}


/**
 * Extracts a JSON snapshot of a single sheet from the Syncfusion instance.
 * The snapshot contains the full sheet definition (rows, cells, styles, merges, columns)
 * suitable for later restoration via `restoreSheetFromSnapshot`.
 */
export function extractSingleSheetSnapshot(
  ss: any,
  sheetNameOrIndex?: string | number
): any | null {
  if (!ss) return null;
  try {
    const sheets = ss.sheets;
    if (!Array.isArray(sheets) || sheets.length === 0) return null;

    let targetSheet: any = null;

    if (sheetNameOrIndex === undefined || sheetNameOrIndex === null) {
      // Default: active sheet
      const activeIdx = ss.activeSheetIndex || 0;
      targetSheet = sheets[activeIdx];
    } else if (typeof sheetNameOrIndex === 'number') {
      targetSheet = sheets[sheetNameOrIndex];
    } else {
      // Find by name
      targetSheet = sheets.find((s: any) => s.name === sheetNameOrIndex);
    }

    if (!targetSheet) return null;

    // Deep clone the sheet structure to avoid reference issues
    const rows = (targetSheet.rows || []).map((row: any) => {
      if (!row) return { cells: [] };
      return {
        cells: (row.cells || []).map((cell: any) => {
          if (!cell) return {};
          const cleaned: any = {};
          if (cell.value !== undefined && cell.value !== null) cleaned.value = cell.value;
          if (cell.style && Object.keys(cell.style).length > 0) cleaned.style = { ...cell.style };
          if (cell.colSpan) cleaned.colSpan = cell.colSpan;
          if (cell.rowSpan) cleaned.rowSpan = cell.rowSpan;
          if (cell.formula) cleaned.formula = cell.formula;
          if (cell.format) cleaned.format = cell.format;
          if (cell.hyperlink) cleaned.hyperlink = cell.hyperlink;
          if (cell.image) cleaned.image = cell.image;
          return cleaned;
        }),
        height: row.height,
        hidden: row.hidden,
      };
    });

    return {
      name: targetSheet.name,
      rows,
      columns: Array.isArray(targetSheet.columns)
        ? targetSheet.columns.map((c: any) => ({ width: c?.width, hidden: c?.hidden, customWidth: c?.customWidth }))
        : [],
      colCount: targetSheet.colCount || 100,
      rowCount: targetSheet.rowCount || 100,
      usedRange: targetSheet.usedRange
        ? { rowIndex: targetSheet.usedRange.rowIndex || 0, colIndex: targetSheet.usedRange.colIndex || 0 }
        : { rowIndex: 0, colIndex: 0 },
      frozenRows: targetSheet.frozenRows || 0,
      frozenColumns: targetSheet.frozenColumns || 0,
      showGridLines: targetSheet.showGridLines !== false,
      showHeaders: targetSheet.showHeaders !== false,
      // Preserve merge info
      ranges: targetSheet.ranges,
      conditionalFormats: targetSheet.conditionalFormats,
    };
  } catch (err) {
    console.warn("extractSingleSheetSnapshot error:", err);
    return null;
  }
}

/**
 * Restores a single sheet's row/cell data in a live Syncfusion instance from a snapshot.
 * Keeps all other sheets intact — only replaces the target sheet's content.
 * Uses the full workbook save/restore cycle via saveAsJson + openFromJson for maximum fidelity.
 */
export async function restoreSheetFromSnapshot(
  ss: any,
  targetSheetName: string,
  snapshotSheetData: any
): Promise<boolean> {
  if (!ss || !snapshotSheetData) return false;

  try {
    // 1. Get the full current workbook JSON
    let workbookJson: any = null;
    if (typeof ss.saveAsJson === "function") {
      const res = await ss.saveAsJson();
      workbookJson = res?.jsonObject || res;
    }

    if (!workbookJson) {
      workbookJson = extractSyncfusionInstanceData(ss);
    }

    if (!workbookJson) return false;

    // 2. Find the target sheet in the workbook and replace its rows/cells
    const sheets =
      workbookJson?.Workbook?.sheets || workbookJson?.sheets || [];

    let found = false;
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].name === targetSheetName) {
        // Replace the sheet's rows with snapshot data
        sheets[i].rows = snapshotSheetData.rows || [];
        if (snapshotSheetData.columns) sheets[i].columns = snapshotSheetData.columns;
        if (snapshotSheetData.colCount) sheets[i].colCount = snapshotSheetData.colCount;
        if (snapshotSheetData.rowCount) sheets[i].rowCount = snapshotSheetData.rowCount;
        if (snapshotSheetData.usedRange) sheets[i].usedRange = snapshotSheetData.usedRange;
        if (snapshotSheetData.frozenRows !== undefined) sheets[i].frozenRows = snapshotSheetData.frozenRows;
        if (snapshotSheetData.frozenColumns !== undefined) sheets[i].frozenColumns = snapshotSheetData.frozenColumns;
        found = true;
        break;
      }
    }

    if (!found) return false;

    // 3. Reload the entire workbook with the patched sheet
    if (typeof ss.openFromJson === "function") {
      ss.openFromJson({ file: workbookJson });
      return true;
    }

    return false;
  } catch (err) {
    console.warn("restoreSheetFromSnapshot error:", err);
    return false;
  }
}

/**
 * Counts the row and column dimensions of a sheet snapshot.
 */
export function countSheetRowsCols(sheetData: any): { rowCount: number; colCount: number } {
  if (!sheetData) return { rowCount: 0, colCount: 0 };

  const rows = sheetData.rows || [];
  let rowCount = 0;
  let maxCols = 0;

  for (const row of rows) {
    if (!row || !row.cells) continue;
    const nonEmptyCells = row.cells.filter(
      (c: any) => c && (c.value !== undefined && c.value !== null && c.value !== "")
    );
    if (nonEmptyCells.length > 0) {
      rowCount++;
      maxCols = Math.max(maxCols, row.cells.length);
    }
  }

  return { rowCount, colCount: maxCols };
}

/**
 * Exports any sheet representation (Syncfusion workbook JSON or flat dataset)
 * to an Excel (.xlsx) file, preserving all sheets, values, formulas, formatting, and merged cells.
 */
export async function exportSheetToExcel(rawData: any, fileName: string): Promise<boolean> {
  if (!rawData) return false;
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Check if Syncfusion workbook format
    const unwrapped = unwrapSyncfusionJson(rawData) || rawData;
    const sheets = unwrapped?.Workbook?.sheets || unwrapped?.sheets;

    if (Array.isArray(sheets) && sheets.length > 0) {
      // Process each sheet from Syncfusion workbook
      sheets.forEach((sheet: any, sIdx: number) => {
        const rawName = sheet?.name || `Sheet${sIdx + 1}`;
        const sheetName = String(rawName).replace(/[\\/?*[\]:]/g, "_").substring(0, 31);
        const ws: any = {};
        const rows = sheet?.rows || [];
        let maxR = 0;
        let maxC = 0;
        const merges: any[] = [];

        rows.forEach((row: any, rIdx: number) => {
          if (!row || !Array.isArray(row.cells)) return;
          row.cells.forEach((cell: any, cIdx: number) => {
            if (!cell) return;
            const hasVal = cell.value !== undefined && cell.value !== null && cell.value !== "";
            const hasFormula = Boolean(cell.formula);

            if (hasVal || hasFormula) {
              const cellObj: any = {};
              if (hasVal) {
                const val = cell.value;
                if (typeof val === "number") {
                  cellObj.t = "n";
                  cellObj.v = val;
                } else if (typeof val === "boolean") {
                  cellObj.t = "b";
                  cellObj.v = val;
                } else if (val instanceof Date) {
                  cellObj.t = "d";
                  cellObj.v = val;
                } else {
                  cellObj.t = "s";
                  cellObj.v = String(val);
                }
              }

              if (hasFormula) {
                const formula = String(cell.formula).trim();
                cellObj.f = formula.startsWith("=") ? formula.substring(1) : formula;
              }

              const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
              ws[cellRef] = cellObj;
              maxR = Math.max(maxR, rIdx);
              maxC = Math.max(maxC, cIdx);
            }

            // Cell merges
            const colSpan = cell.colSpan || 1;
            const rowSpan = cell.rowSpan || 1;
            if (colSpan > 1 || rowSpan > 1) {
              merges.push({
                s: { r: rIdx, c: cIdx },
                e: { r: rIdx + rowSpan - 1, c: cIdx + colSpan - 1 },
              });
              maxR = Math.max(maxR, rIdx + rowSpan - 1);
              maxC = Math.max(maxC, cIdx + colSpan - 1);
            }
          });
        });

        ws["!ref"] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(0, maxR), c: Math.max(0, maxC) },
        });

        if (merges.length > 0) {
          ws["!merges"] = merges;
        }

        if (Array.isArray(sheet?.columns) && sheet.columns.length > 0) {
          ws["!cols"] = sheet.columns.map((c: any) => ({
            wpx: c?.width || 80,
          }));
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    } else {
      // Flat dataset fallback
      const grid = extract2DGridFromAnySheet(rawData);
      if (grid.columns.length === 0 && grid.data.length === 0) {
        return false;
      }
      const aoa = [grid.columns, ...grid.data];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    }

    const cleanName = (fileName || "sheet").replace(/[/\\?%*:|"<>]/g, "-");
    const outName = cleanName.endsWith(".xlsx") ? cleanName : `${cleanName}.xlsx`;
    XLSX.writeFile(wb, outName);
    return true;
  } catch (err) {
    console.error("exportSheetToExcel failed:", err);
    return false;
  }
}

/**
 * Exports any sheet representation to CSV file.
 */
export function exportSheetToCsv(rawData: any, fileName: string): boolean {
  try {
    const grid = extract2DGridFromAnySheet(rawData);
    if (grid.columns.length === 0 && grid.data.length === 0) {
      return false;
    }
    const header = grid.columns.join(",");
    const rows = grid.data.map((row: any[]) =>
      row
        .map((cell: any) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (fileName || "sheet").replace(/[/\\?%*:|"<>]/g, "-");
    link.download = cleanName.endsWith(".csv") ? cleanName : `${cleanName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("exportSheetToCsv failed:", err);
    return false;
  }
}

/**
 * Exports raw sheet JSON template.
 */
export function exportSheetToJson(rawData: any, fileName: string): boolean {
  try {
    if (!rawData) return false;
    const json = JSON.stringify(rawData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (fileName || "sheet").replace(/[/\\?%*:|"<>]/g, "-");
    link.download = cleanName.endsWith(".json") ? cleanName : `${cleanName}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("exportSheetToJson failed:", err);
    return false;
  }
}
