"use client";

import React, { useRef, useState } from "react";
import {
  SpreadsheetComponent, getRangeIndexes,
} from "@syncfusion/ej2-react-spreadsheet";
import { Button } from "@/components/ui/components";
import { useSpreadsheetStore } from "@/stores/spreadsheet-store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { EditorCanvasTypes } from "@/lib/types";
import { toast } from "sonner";

export default function Team() {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const { addInputDataset, outputDatasets } = useSpreadsheetStore();
  const { setNodes, pushHistory } = useEditorWorkFlow();

  // Handle file selection and open in spreadsheet
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const openOptions = { file: file };

    try {
      if (spreadsheetRef.current) {
        spreadsheetRef.current.open(openOptions);
      }
    } catch (err) {
      console.error("Upload Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the spreadsheet
  const handleClear = () => {
    if (spreadsheetRef.current) {
      spreadsheetRef.current.open({ file: undefined });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setExportMessage(null);
  };

  // ─── Export selected cells as an Input Node on the canvas ───
  const exportAsInputNode = () => {
    if (!spreadsheetRef.current) {
      setExportMessage("Spreadsheet not ready");
      return;
    }

    const spreadsheet = spreadsheetRef.current;
    const sheet = spreadsheet.getActiveSheet();
    const selectedRange = sheet.selectedRange;

    if (!selectedRange) {
      setExportMessage("Please select some cells first");
      return;
    }

    setExportMessage("Exporting selection as input node...");

    spreadsheet.getData(selectedRange).then((cells: Map<string, any>) => {
      if (!cells || cells.size === 0) {
        setExportMessage("No data found in selection");
        return;
      }

      const rangeIndexes = getRangeIndexes(selectedRange);
      const [startRow, startCol, endRow, endCol] = rangeIndexes;

      const rowCount = endRow - startRow + 1;
      const colCount = endCol - startCol + 1;

      // Build grid from selection
      const grid: string[][] = Array.from({ length: rowCount }, () =>
        Array(colCount).fill("")
      );

      cells.forEach((cell, address) => {
        const addrIndexes = getRangeIndexes(address);
        const r = addrIndexes[0] - startRow;
        const c = addrIndexes[1] - startCol;

        if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
          let rawValue = cell && cell.value !== undefined ? cell.value : "";
          grid[r][c] = String(rawValue);
        }
      });

      // First row = column headers, rest = data
      const columns = grid[0] || [];
      const data = grid.slice(1);

      if (columns.length === 0) {
        setExportMessage("Selection must have at least a header row");
        return;
      }

      const datasetId = crypto.randomUUID();
      const datasetName = `Sheet Selection (${columns.length} cols × ${data.length} rows)`;

      // Store in Zustand
      addInputDataset({
        id: datasetId,
        name: datasetName,
        columns,
        data,
        createdAt: Date.now(),
      });

      // Create a node on the canvas
      pushHistory();
      setNodes((nds) => [
        ...nds,
        {
          id: datasetId,
          type: "SpreadsheetInputNode" as EditorCanvasTypes,
          position: {
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50,
          },
          data: {
            title: "Sheet Input",
            description: datasetName,
            completed: false,
            current: false,
            metadata: {},
            type: "SpreadsheetInputNode" as EditorCanvasTypes,
            // Store the parsed dataset directly
            text: { columns, data },
            datasetId,
            inputColumns: columns,
            rowCount: data.length,
          },
        },
      ]);

      setExportMessage(
        `✓ Created input node: ${columns.length} columns × ${data.length} rows`
      );
      try { toast.success(`Input node created: ${data.length} rows`); } catch {}
    }).catch((err) => {
      console.error("Export Error:", err);
      setExportMessage("Export failed. See console.");
    });
  };

  // ─── Export selected cells to CSV download ───
  const exportSelectedToCSV = () => {
    if (!spreadsheetRef.current) {
      setExportMessage("Spreadsheet not ready");
      return;
    }

    const spreadsheet = spreadsheetRef.current;
    const sheet = spreadsheet.getActiveSheet();
    const selectedRange = sheet.selectedRange;

    if (!selectedRange) {
      setExportMessage("Please select some cells first");
      return;
    }

    spreadsheet.getData(selectedRange).then((cells: Map<string, any>) => {
      if (!cells || cells.size === 0) {
        setExportMessage("No data found in selection");
        return;
      }

      const rangeIndexes = getRangeIndexes(selectedRange);
      const [startRow, startCol, endRow, endCol] = rangeIndexes;
      const rowCount = endRow - startRow + 1;
      const colCount = endCol - startCol + 1;

      const grid: string[][] = Array.from({ length: rowCount }, () =>
        Array(colCount).fill("")
      );

      cells.forEach((cell, address) => {
        const addrIndexes = getRangeIndexes(address);
        const r = addrIndexes[0] - startRow;
        const c = addrIndexes[1] - startCol;

        if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
          let rawValue = cell && cell.value !== undefined ? cell.value : "";
          grid[r][c] = String(rawValue);
        }
      });

      const csvContent = grid
        .map((row) =>
          row
            .map((val) => {
              let cellContent = val.includes('"')
                ? val.replace(/"/g, '""')
                : val;
              return val.includes(",") || val.includes('"') || val.includes("\n")
                ? `"${cellContent}"`
                : cellContent;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `selection-${new Date().getTime()}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setExportMessage(`Success! Exported ${rowCount}x${colCount} grid.`);
    }).catch((err) => {
      console.error("Export Error:", err);
      setExportMessage("Export failed. See console.");
    });
  };

  // ─── Load output datasets into new sheets ───
  const loadOutputToSheet = (datasetId: string) => {
    const dataset = outputDatasets.find((d) => d.id === datasetId);
    if (!dataset || !spreadsheetRef.current) return;

    const spreadsheet = spreadsheetRef.current;

    // Write column headers to row 1
    dataset.columns.forEach((col, colIdx) => {
      spreadsheet.updateCell(
        { value: col, style: { fontWeight: 'bold' } },
        `${String.fromCharCode(65 + colIdx)}1`
      );
    });

    // Write data starting from row 2
    dataset.data.forEach((row, rowIdx) => {
      row.forEach((cell: any, colIdx: number) => {
        spreadsheet.updateCell(
          { value: String(cell ?? '') },
          `${String.fromCharCode(65 + colIdx)}${rowIdx + 2}`
        );
      });
    });

    try { toast.success(`Output loaded into spreadsheet: ${dataset.data.length} rows`); } catch {}
  };

  return (
    <div className="flex flex-col h-full p-2 gap-2 bg-gray-50 dark:bg-zinc-900">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1">
        {/* File Upload */}
        <label
          className={`cursor-pointer px-2 py-1 text-xs border border-border rounded-lg font-medium transition ${
            isLoading ? "bg-gray-400" : "bg-background hover:bg-muted"
          }`}
        >
          📂 Open .xlsx / .csv
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={isLoading}
          />
        </label>

        <Button
          onClick={handleClear}
          className="px-2 py-1 text-xs rounded-lg font-medium transition"
          disabled={isLoading}
        >
          Clear
        </Button>

        <Button
          onClick={exportSelectedToCSV}
          className="px-2 py-1 text-xs rounded-lg font-medium transition"
          disabled={isLoading}
        >
          📥 Export CSV
        </Button>

        {/* KEY BUTTON: Export selection as Input Node */}
        <Button
          onClick={exportAsInputNode}
          className="px-2 py-1 text-xs rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          disabled={isLoading}
        >
          🔗 Export as Input Node
        </Button>

        {/* Load output datasets back into spreadsheet */}
        {outputDatasets.length > 0 && (
          <div className="flex gap-1">
            {outputDatasets.map((ds) => (
              <Button
                key={ds.id}
                onClick={() => loadOutputToSheet(ds.id)}
                className="px-2 py-1 text-xs rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                📤 Load "{ds.name}" to sheet
              </Button>
            ))}
          </div>
        )}

        {/* Status Messages */}
        {isLoading && (
          <span className="text-blue-600 text-xs font-medium animate-pulse">
            Loading...
          </span>
        )}
        {exportMessage && (
          <span
            className={`text-xs font-medium ${
              exportMessage.includes("✓") || exportMessage.includes("Success")
                ? "text-green-600"
                : "text-orange-600"
            }`}
          >
            {exportMessage}
          </span>
        )}
      </div>

      {/* Spreadsheet Area */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <SpreadsheetComponent
          ref={spreadsheetRef}
          className="w-full h-full"
          height="100%"
          width="100%"
          allowOpen={true}
          allowSave={true}
          openUrl="https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/open"
          saveUrl="https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/save"
        />
      </div>
    </div>
  );
}