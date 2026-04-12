"use client";

import { memo, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { MultiSelect } from "@/components/ui/multi-select";

export const CountNode = memo(({ id, data }: { id: string; data: any }) => {
  const handleDelete = useDeleteNode();
  const { setNodes, pushHistory } = useEditorWorkFlow();

  const config = data.config || {};
  const valueToCount = config.valueToCount || "";
  const resultColumn = config.resultColumn ?? "";

  // Optional: letting users pick which columns to search, defaults to all if empty
  const selectedColumns = config.selectedColumns || [];
  const columnsToDrop = config.columnsToDrop || [];
  const availableColumns = data.inputColumns || [];

  const updateConfig = useCallback(
    (key: string, value: any) => {
      pushHistory();
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  [key]: value,
                },
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes, pushHistory]
  );

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash
          className="size-4 cursor-pointer text-red-400 hover:text-red-600"
          onClick={handleDelete}
        />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white">
          <Calculator className="size-4" />
          <BaseNodeHeaderTitle>Count Value</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">What to count?</Label>
            <Input
              type="text"
              placeholder="e.g. P && A"
              value={valueToCount}
              onChange={(e) => updateConfig("valueToCount", e.target.value)}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground font-medium pt-1">
              Counts occurrences across a row. Use && for multiple values (e.g., P && A).
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">New Column Name</Label>
            <Input
              type="text"
              placeholder="e.g. Total Present"
              value={resultColumn}
              onChange={(e) => updateConfig("resultColumn", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">
              Search in columns (Optional)
            </Label>
            <MultiSelect
              options={availableColumns.map((col: string) => ({
                label: col,
                value: col,
              }))}
              onValueChange={(vals) => updateConfig("selectedColumns", vals)}
              defaultValue={selectedColumns}
              placeholder="All columns if empty"
              maxCount={2}
            />
            <p className="text-[9px] text-muted-foreground">
              If left empty, all columns will be searched.
            </p>
          </div>

          <div className="space-y-1 pt-2 border-t">
            <Label className="text-xs text-muted-foreground font-semibold">
              Drop Columns from Output (Optional)
            </Label>
            <MultiSelect
              options={availableColumns.map((col: string) => ({
                label: col,
                value: col,
              }))}
              onValueChange={(vals) => updateConfig("columnsToDrop", vals)}
              defaultValue={columnsToDrop}
              placeholder="Select columns to drop"
              maxCount={2}
            />
            <p className="text-[9px] text-muted-foreground border-b pb-1">
              These columns won't pass to the next node.
            </p>
          </div>
        </BaseNodeContent>

        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3 h-3 bg-orange-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3 h-3 bg-orange-500"
        />
      </BaseNode>
    </>
  );
});

CountNode.displayName = "CountNode";
