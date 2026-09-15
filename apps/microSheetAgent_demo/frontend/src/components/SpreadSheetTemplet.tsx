'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useState, useEffect } from 'react';
import type { SpreadsheetComponent } from '@syncfusion/ej2-react-spreadsheet';

import { registerLicense } from "@syncfusion/ej2-base";

const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY;
if (licenseKey) {
  registerLicense(licenseKey.trim().replace(/^['"]|['"]$/g, ""));
}

// Dynamically import the SpreadsheetComponent with SSR disabled
const Spreadsheet = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
);

interface AnalyticsProps {
  spreadsheetRef: React.MutableRefObject<{
    getJson: () => Promise<any>;
    loadJson: (data: any) => void;
    getDataGrid: () => Promise<any[][]>;
    updateCell: (rowIdx: number, colIdx: number, value: any, formula?: string) => void;
    getSubjectsList: () => Promise<{ subject: string; component: string }[]>;
  } | null>;
  initialData?: any;
}

export default function Analytics({ spreadsheetRef: parentRef, initialData }: AnalyticsProps) {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onCreated = () => {
    const ss = spreadsheetRef.current;
    if (!ss) return;

    if (parentRef) {
      parentRef.current = {
        getJson: async () => {
          if (spreadsheetRef.current) {
            const data = await spreadsheetRef.current.saveAsJson() as { jsonObject: any };
            return data.jsonObject;
          }
          return null;
        },
        loadJson: (data: any) => {
          if (spreadsheetRef.current && data) {
            try {
              spreadsheetRef.current.openFromJson({ file: data });
            } catch (err) {
              console.error("Error opening JSON in spreadsheet:", err);
            }
          }
        },
        getDataGrid: async () => {
          if (spreadsheetRef.current) {
            const data = await spreadsheetRef.current.saveAsJson() as { jsonObject: any };
            const sheet = data.jsonObject?.Workbook?.sheets?.[0];
            if (!sheet || !sheet.rows) return [];
            
            const grid: any[][] = [];
            sheet.rows.forEach((row: any, rIdx: number) => {
              grid[rIdx] = [];
              if (row && row.cells) {
                row.cells.forEach((cell: any, cIdx: number) => {
                  grid[rIdx][cIdx] = cell ? cell.value : null;
                });
              }
            });
            return grid;
          }
          return [];
        },
        updateCell: (rowIdx: number, colIdx: number, value: any, formula?: string) => {
          if (spreadsheetRef.current) {
            // Helper to convert indices to address (e.g. 0,0 -> A1)
            let temp, letter = '';
            let tempCol = colIdx;
            while (tempCol >= 0) {
              temp = tempCol % 26;
              letter = String.fromCharCode(temp + 65) + letter;
              tempCol = Math.floor(tempCol / 26) - 1;
            }
            const address = letter + (rowIdx + 1);
            if (formula) {
              spreadsheetRef.current.updateCell({ formula: formula }, address, true);
            } else {
              spreadsheetRef.current.updateCell({ value: value, formula: '' }, address, true);
            }
          }
        },
        getSubjectsList: async () => {
          if (!spreadsheetRef.current) return [];
          const data = await spreadsheetRef.current.saveAsJson() as { jsonObject: any };
          const sheet = data.jsonObject?.Workbook?.sheets?.[0];
          if (!sheet || !sheet.rows) return [];
          
          const rows = sheet.rows;
          let detailRowIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 12); i++) {
            const row = rows[i];
            if (row && row.cells) {
              const cellsText = row.cells.map((c: any) => String(c?.value || '').toLowerCase());
              if (cellsText.some((text: string) => text.includes("enroll") || text.includes("name"))) {
                detailRowIdx = i;
                break;
              }
            }
          }
          
          if (detailRowIdx === -1 || detailRowIdx < 2) {
            return [
              { subject: "CO24553:Math", component: "Theory" },
              { subject: "CO24804:Java", component: "Theory" },
              { subject: "CO24804:Java", component: "Lab" }
            ];
          }
          
          const subjectRow = rows[detailRowIdx - 2];
          const componentRow = rows[detailRowIdx - 1];
          const subjects: { subject: string, component: string }[] = [];
          
          if (subjectRow && subjectRow.cells && componentRow && componentRow.cells) {
            let currentSubject = "";
            for (let c = 3; c < Math.min(subjectRow.cells.length, componentRow.cells.length); c++) {
              const subCell = subjectRow.cells[c];
              const compCell = componentRow.cells[c];
              
              if (subCell && subCell.value) {
                currentSubject = String(subCell.value).trim();
              }
              
              if (compCell && compCell.value && currentSubject) {
                const compVal = String(compCell.value).trim();
                if (!compVal.toLowerCase().includes("percent") && 
                    !compVal.toLowerCase().includes("total") && 
                    !compVal.toLowerCase().includes("class")) {
                  
                  const exists = subjects.some(s => s.subject === currentSubject && s.component === compVal);
                  if (!exists && currentSubject.toLowerCase() !== "name" && currentSubject.toLowerCase() !== "enrollment") {
                    subjects.push({ subject: currentSubject, component: compVal });
                  }
                }
              }
            }
          }
          
          return subjects.length > 0 ? subjects : [
            { subject: "CO24553:Math", component: "Theory" },
            { subject: "CO24804:Java", component: "Theory" },
            { subject: "CO24804:Java", component: "Lab" }
          ];
        }
      };
    }

    if (initialData) {
      try {
        ss.openFromJson({ file: initialData });
      } catch (err) {
        console.error("Error opening initialData in spreadsheet:", err);
      }
      return;
    }


    // Default template formatting removed
  };

  // Blank default sheet configuration
  const sheetsData = [
    {
      name: 'Sheet1',
      showGridLines: true,
    }
  ];

  // Prevent render until client-side hydration is complete
  if (!isMounted) return <div className="p-4 text-sm text-zinc-500">Loading spreadsheet...</div>;

  return (
    <div style={{ height: '800px', width: '100%', padding: '16px' }}>
      <Spreadsheet
        ref={spreadsheetRef}
        created={onCreated}
        showRibbon={true}
        showFormulaBar={true}
        sheets={sheetsData}
      />
    </div>
  );
}
