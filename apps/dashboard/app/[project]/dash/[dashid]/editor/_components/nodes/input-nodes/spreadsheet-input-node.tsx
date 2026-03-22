'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileSpreadsheet, Table2 } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

/**
 * SpreadsheetInputNode — created when user selects cells in the
 * Syncfusion spreadsheet and clicks "Export as Input Node".
 * 
 * data.text = { columns: string[], data: any[][] }
 * data.rowCount = number of rows
 * data.datasetId = id in spreadsheet store
 */
export const SpreadsheetInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();

  const dataset = data.text;
  const columns: string[] = dataset?.columns ?? [];
  const rows: any[][] = dataset?.data ?? [];

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[320px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-violet-700 text-white">
          <FileSpreadsheet className="size-4" />
          <BaseNodeHeaderTitle>Sheet Input</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {columns.length > 0 ? (
            <>
              <div className="text-xs text-violet-600 font-semibold text-center">
                {rows.length} rows × {columns.length} columns
              </div>

              {/* Column badges */}
              <div className="flex flex-wrap gap-1">
                {columns.map((col, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700"
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* Preview table */}
              <div className="max-h-[100px] overflow-auto border rounded">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-violet-50 dark:bg-violet-900/40">
                      {columns.map((col, i) => (
                        <th
                          key={i}
                          className="px-1 py-0.5 text-left font-medium border-r last:border-r-0 truncate max-w-[70px]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell: any, ci: number) => (
                          <td
                            key={ci}
                            className="px-1 py-0.5 border-r last:border-r-0 truncate max-w-[70px]"
                          >
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 3 && (
                  <div className="text-[10px] text-center text-muted-foreground py-0.5 border-t">
                    + {rows.length - 3} more rows
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-3 italic flex flex-col items-center gap-2">
              <Table2 className="size-5 opacity-50" />
              No data loaded
            </div>
          )}
        </BaseNodeContent>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-violet-600"
        />
      </BaseNode>
    </>
  );
});

SpreadsheetInputNode.displayName = "SpreadsheetInputNode";
