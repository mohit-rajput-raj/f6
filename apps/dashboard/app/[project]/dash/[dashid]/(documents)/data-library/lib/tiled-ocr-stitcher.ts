import { TileItem, TiledGridConfig, StitchedResult } from "../components/tiled-ocr-types";

/**
 * Stitch multiple OCR tile results into a single unified spreadsheet grid.
 * Supports:
 * 1. "sequential_rows": Append chunks vertically in order (e.g. rows 1-10, then 11-13, then 14-200).
 * 2. "key_column": Match and join rows by primary key column (e.g. S.N., Roll No, or Name).
 * 3. "coordinate": Explicit 2D [rowRange, colRange] bounds with smart overlap resolution.
 */
export function stitchTiledOcr(
  tiles: TileItem[],
  config: TiledGridConfig,
): StitchedResult {
  // Filter tiles that have ready data
  const readyTiles = tiles.filter(
    (t) => t.status === "ready" && t.extractedData && t.extractedData.length > 0,
  );

  if (readyTiles.length === 0) {
    return {
      columns: [],
      data: [],
      stats: {
        totalRows: 0,
        totalCols: 0,
        filledCells: 0,
        totalCells: 0,
        tilesUsed: 0,
        uncoveredCells: 0,
      },
      tileCellSourceMap: [],
    };
  }

  // MODE 1: Sequential Vertical Chunks (Arbitrary Rows: 1-10, 11-13, 14-200...)
  if (config.stitchMode === "sequential_rows") {
    // 1. Resolve master columns from tiles that provide headers
    let masterCols: string[] = [];
    const tileWithHeaders = readyTiles.find((t) => t.hasHeader && t.extractedCols?.length) || readyTiles[0];
    if (tileWithHeaders?.extractedCols) {
      masterCols = [...tileWithHeaders.extractedCols];
    }

    // Expand masterCols if any other tile has more columns
    readyTiles.forEach((tile) => {
      const colCount = Math.max(
        tile.extractedCols?.length || 0,
        ...(tile.extractedData?.map((r) => r.length) || [0]),
      );
      while (masterCols.length < colCount) {
        masterCols.push(`Column ${masterCols.length + 1}`);
      }
    });

    const masterRows: (string | null)[][] = [];
    const sourceMap: (string | null)[][] = [];

    readyTiles.forEach((tile) => {
      const tileData = tile.extractedData || [];
      tileData.forEach((row) => {
        const paddedRow: (string | null)[] = Array(masterCols.length).fill("");
        row.forEach((cell, idx) => {
          if (idx < masterCols.length) {
            paddedRow[idx] = cell !== null && cell !== undefined ? String(cell).trim() : "";
          }
        });
        masterRows.push(paddedRow);
        sourceMap.push(Array(masterCols.length).fill(tile.id));
      });
    });

    let filled = 0;
    masterRows.forEach((r) => r.forEach((c) => { if (c) filled++; }));

    return {
      columns: masterCols,
      data: masterRows,
      stats: {
        totalRows: masterRows.length,
        totalCols: masterCols.length,
        filledCells: filled,
        totalCells: masterRows.length * masterCols.length,
        tilesUsed: readyTiles.length,
        uncoveredCells: masterRows.length * masterCols.length - filled,
      },
      tileCellSourceMap: sourceMap,
    };
  }

  // MODE 2: Key-Column Join (Smart Alignment by S.N., Roll No, or ID)
  if (config.stitchMode === "key_column" && config.keyColumnName) {
    const keyCol = config.keyColumnName.toLowerCase().trim();

    // Collect all unique column names across all tiles
    const allCols: string[] = [];
    readyTiles.forEach((tile) => {
      (tile.extractedCols || []).forEach((c) => {
        const clean = c.trim();
        if (clean && !allCols.some((x) => x.toLowerCase() === clean.toLowerCase())) {
          allCols.push(clean);
        }
      });
    });

    // If no distinct columns found, fallback to coordinate mode
    if (allCols.length > 0) {
      // Map rows by Key Value
      const rowsByKey = new Map<string, { row: (string | null)[]; sourceTileId: string }>();

      readyTiles.forEach((tile) => {
        const tileCols = (tile.extractedCols || []).map((c) => c.toLowerCase().trim());
        let keyIdx = tileCols.indexOf(keyCol);
        if (keyIdx === -1) {
          // Try finding substring match (e.g. "roll" or "s.n." or "sn")
          keyIdx = tileCols.findIndex((c) => c.includes(keyCol) || keyCol.includes(c));
        }

        const tileData = tile.extractedData || [];
        tileData.forEach((row, rIdx) => {
          const keyValue = keyIdx !== -1 && row[keyIdx] ? String(row[keyIdx]).trim() : `row_${rIdx}`;
          if (!keyValue) return;

          let record = rowsByKey.get(keyValue);
          if (!record) {
            record = {
              row: Array(allCols.length).fill(""),
              sourceTileId: tile.id,
            };
            rowsByKey.set(keyValue, record);
          }

          // Populate columns
          (tile.extractedCols || []).forEach((cName, cIdx) => {
            const masterIdx = allCols.findIndex((x) => x.toLowerCase() === cName.toLowerCase().trim());
            if (masterIdx !== -1 && row[cIdx]) {
              record!.row[masterIdx] = String(row[cIdx]).trim();
            }
          });
        });
      });

      const masterRows = Array.from(rowsByKey.values()).map((v) => v.row);
      const sourceMap = Array.from(rowsByKey.values()).map((v) => Array(allCols.length).fill(v.sourceTileId));

      let filled = 0;
      masterRows.forEach((r) => r.forEach((c) => { if (c) filled++; }));

      return {
        columns: allCols,
        data: masterRows,
        stats: {
          totalRows: masterRows.length,
          totalCols: allCols.length,
          filledCells: filled,
          totalCells: masterRows.length * allCols.length,
          tilesUsed: readyTiles.length,
          uncoveredCells: masterRows.length * allCols.length - filled,
        },
        tileCellSourceMap: sourceMap,
      };
    }
  }

  // MODE 3: 2D Coordinate Bounds Stitching
  let maxTargetRow = config.totalRows - 1;
  let maxTargetCol = config.totalCols - 1;

  readyTiles.forEach((tile) => {
    const tileRows = tile.extractedData?.length || 0;
    const tileCols = Math.max(
      tile.extractedCols?.length || 0,
      ...(tile.extractedData?.map((r) => r.length) || [0]),
    );

    const specifiedRowEnd = Math.max(tile.rowRange[0], tile.rowRange[1]);
    const specifiedColEnd = Math.max(tile.colRange[0], tile.colRange[1]);

    if (config.autoFitToExtracted) {
      const dynamicRowEnd = tile.rowRange[0] + Math.max(0, tileRows - 1);
      const dynamicColEnd = tile.colRange[0] + Math.max(0, tileCols - 1);
      maxTargetRow = Math.max(maxTargetRow, specifiedRowEnd, dynamicRowEnd);
      maxTargetCol = Math.max(maxTargetCol, specifiedColEnd, dynamicColEnd);
    } else {
      maxTargetRow = Math.max(maxTargetRow, specifiedRowEnd);
      maxTargetCol = Math.max(maxTargetCol, specifiedColEnd);
    }
  });

  const finalRowCount = Math.max(1, maxTargetRow + 1);
  const finalColCount = Math.max(1, maxTargetCol + 1);

  // Initialize master data grid and tile source map
  const masterGrid: (string | null)[][] = Array.from({ length: finalRowCount }, () =>
    Array(finalColCount).fill(""),
  );
  const sourceMap: (string | null)[][] = Array.from({ length: finalRowCount }, () =>
    Array(finalColCount).fill(null),
  );

  // Resolve Column Headers
  const columnHeaders: string[] = Array(finalColCount).fill("");

  // Sort tiles: prioritize tiles with hasHeader = true, and tiles closest to row 0
  const headerTiles = [...readyTiles].sort((a, b) => {
    if (a.hasHeader && !b.hasHeader) return -1;
    if (!a.hasHeader && b.hasHeader) return 1;
    return a.rowRange[0] - b.rowRange[0];
  });

  headerTiles.forEach((tile) => {
    const tileCols = tile.extractedCols || [];
    const colStart = tile.colRange[0];

    tileCols.forEach((headerName, offset) => {
      const targetCol = colStart + offset;
      if (targetCol < finalColCount && headerName && headerName.trim()) {
        const cleanName = headerName.trim();
        if (
          !columnHeaders[targetCol] ||
          columnHeaders[targetCol].startsWith("Column_") ||
          columnHeaders[targetCol].startsWith("Column ")
        ) {
          columnHeaders[targetCol] = cleanName;
        }
      }
    });
  });

  // Ensure every column has a name
  for (let c = 0; c < finalColCount; c++) {
    if (!columnHeaders[c] || !columnHeaders[c].trim()) {
      columnHeaders[c] = `Column ${c + 1}`;
    }
  }

  // Place Data Cells from each tile into the master grid
  readyTiles.forEach((tile) => {
    const tileData = tile.extractedData || [];
    const rStart = tile.rowRange[0];
    const cStart = tile.colRange[0];

    tileData.forEach((row, rOffset) => {
      const targetRow = rStart + rOffset;
      if (targetRow >= finalRowCount) return;

      row.forEach((cellVal, cOffset) => {
        const targetCol = cStart + cOffset;
        if (targetCol >= finalColCount) return;

        const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : "";
        const existingVal = masterGrid[targetRow][targetCol] || "";

        if (!existingVal) {
          masterGrid[targetRow][targetCol] = strVal;
          if (strVal) sourceMap[targetRow][targetCol] = tile.id;
        } else if (strVal) {
          if (config.overlapStrategy === "prefer_longest") {
            if (strVal.length > existingVal.length) {
              masterGrid[targetRow][targetCol] = strVal;
              sourceMap[targetRow][targetCol] = tile.id;
            }
          } else if (config.overlapStrategy === "prefer_latest") {
            masterGrid[targetRow][targetCol] = strVal;
            sourceMap[targetRow][targetCol] = tile.id;
          }
        }
      });
    });
  });

  let filledCells = 0;
  const totalCells = finalRowCount * finalColCount;

  for (let r = 0; r < finalRowCount; r++) {
    for (let c = 0; c < finalColCount; c++) {
      if (masterGrid[r][c] && String(masterGrid[r][c]).trim() !== "") {
        filledCells++;
      }
    }
  }

  return {
    columns: columnHeaders,
    data: masterGrid,
    stats: {
      totalRows: finalRowCount,
      totalCols: finalColCount,
      filledCells,
      totalCells,
      tilesUsed: readyTiles.length,
      uncoveredCells: totalCells - filledCells,
    },
    tileCellSourceMap: sourceMap,
  };
}
