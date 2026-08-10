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

