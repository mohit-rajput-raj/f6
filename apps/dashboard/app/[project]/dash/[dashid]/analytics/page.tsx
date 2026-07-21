'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useState, useEffect } from 'react';
import type { SpreadsheetComponent } from '@syncfusion/ej2-react-spreadsheet';

// Dynamically import the SpreadsheetComponent with SSR disabled
const Spreadsheet = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
);

export default function Analytics() {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onCreated = () => {
    const ss = spreadsheetRef.current;
    if (!ss) return;

    // 1. Merge Header rows
    ss.merge('C1:AP1');
    ss.merge('C2:AP2');
    ss.merge('C3:AP3');
    ss.merge('C4:AP4');
    ss.merge('C5:AP5');

    // 2. Merge Column Headers (Row 6 to 9)
    ss.merge('A6:A9');
    ss.merge('B6:B9');
    ss.merge('C6:C9');
    ss.merge('AN6:AN9');
    ss.merge('AO6:AO9');
    ss.merge('AP6:AP9');

    // 3. Merge Subject Row headers (Row 7)
    ss.merge('D7:F7');
    ss.merge('G7:L7');
    ss.merge('M7:R7');
    ss.merge('S7:X7');
    ss.merge('Y7:AA7');
    ss.merge('AB7:AG7');
    ss.merge('AH7:AJ7');
    ss.merge('AK7:AM7');

    // 4. Merge Component Row headers (Row 8)
    ss.merge('D8:F8');
    ss.merge('G8:I8');
    ss.merge('J8:L8');
    ss.merge('M8:O8');
    ss.merge('P8:R8');
    ss.merge('S8:U8');
    ss.merge('V8:X8');
    ss.merge('Y8:AA8');
    ss.merge('AB8:AD8');
    ss.merge('AE8:AG8');
    ss.merge('AH8:AJ8');
    ss.merge('AK8:AM8');

    // 5. Alignments and styles for headers
    ss.cellFormat({ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }, 'C1:AP5');
    ss.cellFormat({ color: '#ff0000' }, 'C5:AP5'); // Red short attendance warning text

    // B6:B9 and C6:C9 styling
    ss.cellFormat({ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }, 'A6:C9');

    // Subject & Component Row Header styling
    ss.cellFormat({ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }, 'D7:AM8');

    // Detail headers (Row 9) styling
    ss.cellFormat({ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }, 'D9:AP9');

    // Spacer row (Row 6) green cells
    const greenSpacerCells = ['F6', 'I6', 'L6', 'O6', 'R6', 'U6', 'X6', 'AA6', 'AD6', 'AG6', 'AJ6', 'AM6'];
    greenSpacerCells.forEach(cell => {
      ss.cellFormat({ backgroundColor: '#c6efce' }, cell);
    });

    // Detail Percentage headers (Row 9) green cells
    const greenHeaders = ['F9', 'I9', 'L9', 'O9', 'R9', 'U9', 'X9', 'AA9', 'AD9', 'AG9', 'AJ9', 'AM9'];
    greenHeaders.forEach(cell => {
      ss.cellFormat({ backgroundColor: '#c6efce' }, cell);
    });

    // Totals columns headers (Row 6 to 9 merged)
    ss.cellFormat({ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }, 'AN6:AP9');
    ss.cellFormat({ backgroundColor: '#c6efce' }, 'AP6:AP9');

    // Data rows styles (Row 10 to 12)
    ss.cellFormat({ textAlign: 'center' }, 'A10:B12');
    ss.cellFormat({ textAlign: 'left' }, 'C10:C12');
    ss.cellFormat({ textAlign: 'center' }, 'D10:AP12');

    // Green styling for percentage data cells
    const greenDataRanges = [
      'F10:F12', 'I10:I12', 'L10:L12', 'O10:O12', 'R10:R12', 'U10:U12',
      'X10:X12', 'AA10:AA12', 'AD10:AD12', 'AG10:AG12', 'AJ10:AJ12',
      'AM10:AM12', 'AP10:AP12'
    ];
    greenDataRanges.forEach(range => {
      ss.cellFormat({ backgroundColor: '#e2efda', fontWeight: 'bold' }, range);
    });

    // Make overall totals column bold
    ss.cellFormat({ fontWeight: 'bold' }, 'AN10:AP12');
  };

  // Define the sheet data model programmatically to keep it SSR-safe
  const sheetsData = [
    {
      name: 'Attendance Sheet',
      frozenRows: 9,
      frozenColumns: 3,
      showGridLines: true,
      columns: [
        { width: 45 },  // A: S.No
        { width: 100 }, // B: Enrollment
        { width: 160 }, // C: Name
        // Subjects D to AM (36 columns)
        ...Array(36).fill({ width: 55 }),
        // Totals AN to AP (3 columns)
        { width: 80 },  // AN: Total Classes Held
        { width: 80 },  // AO: Total Classes Attended
        { width: 80 }   // AP: Percentage
      ],
      rows: [
        // Row 1 (Index 0): Department of Computer Engineering
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' },
            { value: 'Department of Computer Engineering', style: { fontWeight: 'bold', fontSize: '12pt' } }
          ]
        },
        // Row 2 (Index 1): SESSION : JULY 2025- DEC 2025 Semester "B"
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' },
            { value: 'SESSION : JULY 2025- DEC 2025 Semester "B"', style: { fontWeight: 'bold', fontSize: '11pt' } }
          ]
        },
        // Row 3 (Index 2): B.Tech. II YEAR ATTENDANCE SHEET
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' },
            { value: 'B.Tech. II YEAR ATTENDANCE SHEET', style: { fontWeight: 'bold', fontSize: '11pt' } }
          ]
        },
        // Row 4 (Index 3): SECTION: B
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' },
            { value: 'SECTION: B', style: { fontWeight: 'bold', fontSize: '11pt' } }
          ]
        },
        // Row 5 (Index 4): SHORT ATTENDANCE LIST(NOT ELIGIBLE FOR MST-1)
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' },
            { value: 'SHORT ATTENDANCE LIST(NOT ELIGIBLE FOR MST-1)', style: { fontWeight: 'bold', fontSize: '10pt', color: '#ff0000' } }
          ]
        },
        // Row 6 (Index 5): Spacer row (with green cells above percentages)
        {
          height: 20,
          cells: [
            { value: '' }, { value: '' }, { value: '' }, // A-C
            // D, E, F (CO24553)
            { value: '' }, { value: '' }, { value: '' },
            // G, H, I (CO24804 Tut)
            { value: '' }, { value: '' }, { value: '' },
            // J, K, L (CO24804 Lab)
            { value: '' }, { value: '' }, { value: '' },
            // M, N, O (CO24009 Th)
            { value: '' }, { value: '' }, { value: '' },
            // P, Q, R (CO24009 Lab)
            { value: '' }, { value: '' }, { value: '' },
            // S, T, U (CO24___ Th)
            { value: '' }, { value: '' }, { value: '' },
            // V, W, X (CO24___ Lab)
            { value: '' }, { value: '' }, { value: '' },
            // Y, Z, AA (MA24554 Th)
            { value: '' }, { value: '' }, { value: '' },
            // AB, AC, AD (EC24519 Th)
            { value: '' }, { value: '' }, { value: '' },
            // AE, AF, AG (EC24519 Lab)
            { value: '' }, { value: '' }, { value: '' },
            // AH, AI, AJ (HU24881 Th)
            { value: '' }, { value: '' }, { value: '' },
            // AK, AL, AM (HUM2051 Th)
            { value: '' }, { value: '' }, { value: '' },
            // AN, AO, AP (Totals)
            { value: '' }, { value: '' }, { value: '' }
          ]
        },
        // Row 7 (Index 6): Subject Row
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' }, { value: '' }, // A-C
            // D7:F7 merged
            { value: 'CO24553:Dis' }, { value: '' }, { value: '' },
            // G7:L7 merged
            { value: 'CO24804: Mobile' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
            // M7:R7 merged
            { value: 'CO24009: Data Structures' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
            // S7:X7 merged
            { value: 'CO24___:Agile Software' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
            // Y7:AA7 merged
            { value: 'MA24554:' }, { value: '' }, { value: '' },
            // AB7:AG7 merged
            { value: 'EC24519: Digital' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
            // AH7:AJ7 merged
            { value: 'HU24881:' }, { value: '' }, { value: '' },
            // AK7:AM7 merged
            { value: 'HUM2051:' }, { value: '' }, { value: '' },
            { value: '' }, { value: '' }, { value: '' } // AN-AP
          ]
        },
        // Row 8 (Index 7): Component Row
        {
          height: 25,
          cells: [
            { value: '' }, { value: '' }, { value: '' }, // A-C
            // D8:F8 merged
            { value: 'Th' }, { value: '' }, { value: '' },
            // G8:I8 Tut, J8:L8 Lab
            { value: 'Tut.' }, { value: '' }, { value: '' },
            { value: 'Lab' }, { value: '' }, { value: '' },
            // M8:O8 Th, P8:R8 Lab
            { value: 'Th' }, { value: '' }, { value: '' },
            { value: 'Lab' }, { value: '' }, { value: '' },
            // S8:U8 Th, V8:X8 Lab
            { value: 'Th' }, { value: '' }, { value: '' },
            { value: 'Lab' }, { value: '' }, { value: '' },
            // Y8:AA8 Th
            { value: 'Th' }, { value: '' }, { value: '' },
            // AB8:AD8 Th, AE8:AG8 Lab
            { value: 'Th' }, { value: '' }, { value: '' },
            { value: 'Lab' }, { value: '' }, { value: '' },
            // AH8:AJ8 Th
            { value: 'Th' }, { value: '' }, { value: '' },
            // AK8:AM8 Th
            { value: 'Th' }, { value: '' }, { value: '' },
            { value: '' }, { value: '' }, { value: '' } // AN-AP
          ]
        },
        // Row 9 (Index 8): Detail Header Row
        {
          height: 120,
          cells: [
            { value: 'S.No' },
            { value: 'Enrollment' },
            { value: 'Name' },
            // D to AM
            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Tut.' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Labs' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Labs' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Labs' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Labs' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            { value: 'Total Classes' },
            { value: 'Total attended' },
            { value: 'Percentage' },

            // AN-AP
            { value: 'Total Classes Held' },
            { value: 'Total Classes Attended' },
            { value: 'Percentage' }
          ]
        },
        // Row 10 (Index 9): Data Row 1
        {
          height: 25,
          cells: [
            { value: '1' }, { value: '0801CS241095' }, { value: 'NAVNEET TRIPATHI' },
            // CO24553
            { value: '14' }, { value: '6' }, { formula: '=IF(D10>0, ROUND((E10/D10)*100, 0), 0)' },
            // CO24804
            { value: '10' }, { value: '2' }, { formula: '=IF(G10>0, ROUND((H10/G10)*100, 0), 0)' },
            { value: '5' }, { value: '2' }, { formula: '=IF(J10>0, ROUND((K10/J10)*100, 0), 0)' },
            // CO24009
            { value: '12' }, { value: '12' }, { formula: '=IF(M10>0, ROUND((N10/M10)*100, 0), 0)' },
            { value: '5' }, { value: '2' }, { formula: '=IF(P10>0, ROUND((Q10/P10)*100, 0), 0)' },
            // CO24___
            { value: '13' }, { value: '5' }, { formula: '=IF(S10>0, ROUND((T10/S10)*100, 0), 0)' },
            { value: '5' }, { value: '5' }, { formula: '=IF(V10>0, ROUND((W10/V10)*100, 0), 0)' },
            // MA24554
            { value: '20' }, { value: '7' }, { formula: '=IF(Y10>0, ROUND((Z10/Y10)*100, 0), 0)' },
            // EC24519
            { value: '11' }, { value: '5' }, { formula: '=IF(AB10>0, ROUND((AC10/AB10)*100, 0), 0)' },
            { value: '5' }, { value: '2' }, { formula: '=IF(AE10>0, ROUND((AF10/AE10)*100, 0), 0)' },
            // HU24881
            { value: '10' }, { value: '3' }, { formula: '=IF(AH10>0, ROUND((AI10/AH10)*100, 0), 0)' },
            // HUM2051
            { value: '10' }, { value: '0' }, { formula: '=IF(AK10>0, ROUND((AL10/AK10)*100, 0), 0)' },
            // Totals
            { formula: '=D10+G10+J10+M10+P10+S10+V10+Y10+AB10+AE10+AH10+AK10' },
            { formula: '=E10+H10+K10+N10+Q10+T10+W10+Z10+AC10+AF10+AI10+AL10' },
            { formula: '=IF(AN10>0, ROUND((AO10/AN10)*100, 0), 0)' }
          ]
        },
        // Row 11 (Index 10): Data Row 2
        {
          height: 25,
          cells: [
            { value: '2' }, { value: '0801CS241097' }, { value: 'NEHA KOUL' },
            // CO24553
            { value: '14' }, { value: '6' }, { formula: '=IF(D11>0, ROUND((E11/D11)*100, 0), 0)' },
            // CO24804
            { value: '10' }, { value: '2' }, { formula: '=IF(G11>0, ROUND((H11/G11)*100, 0), 0)' },
            { value: '5' }, { value: '1' }, { formula: '=IF(J11>0, ROUND((K11/J11)*100, 0), 0)' },
            // CO24009
            { value: '12' }, { value: '10' }, { formula: '=IF(M11>0, ROUND((N11/M11)*100, 0), 0)' },
            { value: '5' }, { value: '2' }, { formula: '=IF(P11>0, ROUND((Q11/P11)*100, 0), 0)' },
            // CO24___
            { value: '13' }, { value: '5' }, { formula: '=IF(S11>0, ROUND((T11/S11)*100, 0), 0)' },
            { value: '5' }, { value: '4' }, { formula: '=IF(V11>0, ROUND((W11/V11)*100, 0), 0)' },
            // MA24554
            { value: '20' }, { value: '6' }, { formula: '=IF(Y11>0, ROUND((Z11/Y11)*100, 0), 0)' },
            // EC24519
            { value: '11' }, { value: '3' }, { formula: '=IF(AB11>0, ROUND((AC11/AB11)*100, 0), 0)' },
            { value: '5' }, { value: '1' }, { formula: '=IF(AE11>0, ROUND((AF11/AE11)*100, 0), 0)' },
            // HU24881
            { value: '10' }, { value: '5' }, { formula: '=IF(AH11>0, ROUND((AI11/AH11)*100, 0), 0)' },
            // HUM2051
            { value: '10' }, { value: '4' }, { formula: '=IF(AK11>0, ROUND((AL11/AK11)*100, 0), 0)' },
            // Totals
            { formula: '=D11+G11+J11+M11+P11+S11+V11+Y11+AB11+AE11+AH11+AK11' },
            { formula: '=E11+H11+K11+N11+Q11+T11+W11+Z11+AC11+AF11+AI11+AL11' },
            { formula: '=IF(AN11>0, ROUND((AO11/AN11)*100, 0), 0)' }
          ]
        },
        // Row 12 (Index 11): Data Row 3
        {
          height: 25,
          cells: [
            { value: '3' }, { value: '0801CS241116' }, { value: 'ROHIT SHAKYAWAR' },
            // CO24553
            { value: '14' }, { value: '6' }, { formula: '=IF(D12>0, ROUND((E12/D12)*100, 0), 0)' },
            // CO24804
            { value: '10' }, { value: '0' }, { formula: '=IF(G12>0, ROUND((H12/G12)*100, 0), 0)' },
            { value: '5' }, { value: '1' }, { formula: '=IF(J12>0, ROUND((K12/J12)*100, 0), 0)' },
            // CO24009
            { value: '12' }, { value: '12' }, { formula: '=IF(M12>0, ROUND((N12/M12)*100, 0), 0)' },
            { value: '5' }, { value: '2' }, { formula: '=IF(P12>0, ROUND((Q12/P12)*100, 0), 0)' },
            // CO24___
            { value: '13' }, { value: '4' }, { formula: '=IF(S12>0, ROUND((T12/S12)*100, 0), 0)' },
            { value: '5' }, { value: '4' }, { formula: '=IF(V12>0, ROUND((W12/V12)*100, 0), 0)' },
            // MA24554
            { value: '20' }, { value: '6' }, { formula: '=IF(Y12>0, ROUND((Z12/Y12)*100, 0), 0)' },
            // EC24519
            { value: '11' }, { value: '5' }, { formula: '=IF(AB12>0, ROUND((AC12/AB12)*100, 0), 0)' },
            { value: '5' }, { value: '3' }, { formula: '=IF(AE12>0, ROUND((AF12/AE12)*100, 0), 0)' },
            // HU24881
            { value: '10' }, { value: '3' }, { formula: '=IF(AH12>0, ROUND((AI12/AH12)*100, 0), 0)' },
            // HUM2051
            { value: '10' }, { value: '0' }, { formula: '=IF(AK12>0, ROUND((AL12/AK12)*100, 0), 0)' },
            // Totals
            { formula: '=D12+G12+J12+M12+P12+S12+V12+Y12+AB12+AE12+AH12+AK12' },
            { formula: '=E12+H12+K12+N12+Q12+T12+W12+Z12+AC12+AF12+AI12+AL12' },
            { formula: '=IF(AN12>0, ROUND((AO12/AN12)*100, 0), 0)' }
          ]
        }
      ]
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