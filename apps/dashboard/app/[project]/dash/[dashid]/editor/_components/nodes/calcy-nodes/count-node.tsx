"use client";

import { memo, useCallback } from "react";
import { Position } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHeaderActions,
  NodeHandle,
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
    <BaseNode variant="math" className="min-w-[280px]">
      <BaseNodeHeader variant="math">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="math">
            <Calculator className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Count Value</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What to count?</Label>
          <Input
            type="text"
            placeholder="e.g. P && A"
            value={valueToCount}
            onChange={(e) => updateConfig("valueToCount", e.target.value)}
            className="h-8 text-xs nodrag"
          />
          <p className="text-[10px] text-muted-foreground">
            Counts occurrences across row. Use && for multiple (e.g. P && A).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">New column name</Label>
          <Input
            type="text"
            placeholder="e.g. Total Present"
            value={resultColumn}
            onChange={(e) => updateConfig("resultColumn", e.target.value)}
            className="h-8 text-xs nodrag"
          />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <Label className="text-xs text-muted-foreground">
            Search in columns (Optional)
          </Label>
          <div className="nodrag">
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
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <Label className="text-xs text-muted-foreground">
            Drop columns from output (Optional)
          </Label>
          <div className="nodrag">
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
          </div>
        </div>
      </BaseNodeContent>

      <NodeHandle
        variant="math"
        type="target"
        position={Position.Left}
        id="in"
      />
      <NodeHandle
        variant="math"
        type="source"
        position={Position.Right}
        id="out"
      />
    </BaseNode>
  );
});

CountNode.displayName = "CountNode";
