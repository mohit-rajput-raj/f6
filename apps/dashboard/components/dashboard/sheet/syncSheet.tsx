"use client";

import React, { useRef, useState } from "react";
import {
  SpreadsheetComponent, getRangeIndexes,
} from "@syncfusion/ej2-react-spreadsheet";
import { Button } from "@/components/ui/components";

export default function Team() {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Handle file selection and open in spreadsheet
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    // Create an object that matches the OpenOptions interface
    const openOptions = { file: file };

    try {
      if (spreadsheetRef.current) {
        // Sometimes calling open() directly on the ref requires 
        // the file to be wrapped specifically
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

  // Export only the currently selected cells to CSV
  const exportSelectedToCSV = () => {
    if (!spreadsheetRef.current) {
      setExportMessage("Spreadsheet not ready");
      return;
    }

    const spreadsheet = spreadsheetRef.current;
    // Get the active sheet object
    const sheet = spreadsheet.getActiveSheet();
    // Get the current selection (e.g., "A1:C5")
    const selectedRange = sheet.selectedRange;

    if (!selectedRange) {
      setExportMessage("Please select some cells first");
      return;
    }

    setExportMessage(`Exporting selection...`);

    // getData returns a Promise<Map<string, CellModel>>
    spreadsheet.getData(selectedRange).then((cells: Map<string, any>) => {
      if (!cells || cells.size === 0) {
        setExportMessage("No data found in selection");
        return;
      }

      const rangeIndexes = getRangeIndexes(selectedRange);
      const [startRow, startCol, endRow, endCol] = rangeIndexes;

      const rowCount = endRow - startRow + 1;
      const colCount = endCol - startCol + 1;

      // Initialize grid
      const grid: string[][] = Array.from({ length: rowCount }, () => Array(colCount).fill(""));

      // Syncfusion's getData returns a Map. We iterate through it.
      cells.forEach((cell, address) => {
        const addrIndexes = getRangeIndexes(address);
        const r = addrIndexes[0] - startRow;
        const c = addrIndexes[1] - startCol;

        if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
          // Syncfusion cells store display text in 'value' or 'formattedText'
          // We prioritize 'value', then fallback to an empty string
          let rawValue = cell && cell.value !== undefined ? cell.value : "";
          grid[r][c] = String(rawValue);
        }
      });

      // Convert to CSV string
      const csvContent = grid
        .map((row) =>
          row
            .map((val) => {
              // Escape quotes and commas
              let cellContent = val.includes('"') ? val.replace(/"/g, '""') : val;
              return (val.includes(",") || val.includes('"') || val.includes("\n"))
                ? `"${cellContent}"`
                : cellContent;
            })
            .join(",")
        )
        .join("\n");

      // Download Logic
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

  return (
    <div className="flex flex-col h-full p-2 gap-2 bg-gray-50">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1">
        {/* File Upload */}
        <label
          className={`cursor-pointer px-2 py-1 border border-border rounded-lg font-medium text-text transition ${isLoading ? "bg-gray-400" : "bg-background"
            }`}
        >
          Select .xlsx / .csv file
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={isLoading}
          />
        </label>

        {/* Clear Button */}
        <Button
          onClick={handleClear}
          className={`px-2 py-1 rounded-lg font-medium text-text transition ${isLoading ? "bg-gray-400" : ""
            }`}
          disabled={isLoading}
        >
          Clear Spreadsheet
        </Button>

        {/* New Export Button */}
        <Button
          onClick={exportSelectedToCSV}
          className="px-2 py-1 rounded-lg font-medium text-text  transition"
          disabled={isLoading}
        >
          Export Selected to CSV
        </Button>

        {/* Status Messages */}
        {isLoading && (
          <span className="text-blue-600 font-medium animate-pulse">Loading file...</span>
        )}
        {exportMessage && (
          <span
            className={`font-medium ${exportMessage.includes("success") ? "text-green-600" : "text-red-600"
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
          openUrl='https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/open'
          saveUrl='https://document.syncfusion.com/web-services/spreadsheet-editor/api/spreadsheet/save'
        />
      </div>

    </div>
  );
}