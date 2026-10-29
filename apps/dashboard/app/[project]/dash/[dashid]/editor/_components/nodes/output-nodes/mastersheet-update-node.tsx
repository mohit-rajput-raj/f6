"use client";

import React, { useState } from "react";
import { Position } from "@xyflow/react";
import { Table2, CheckCircle2, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/components";
import { Badge } from "@repo/ui/components/ui/badge";
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
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { useSession } from "@/lib/auth-client";
import { upsertMasterSheetByName, addMasterSheetHistory } from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";
import { toast } from "sonner";

export function MasterSheetUpdateNode({ id, data, selected }: any) {
  const { data: sessionData } = useSession();
  const handleDelete = useDeleteNode();
  const [loading, setLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const [success, setSuccess] = useState(false);

  const updates = data?.updates || [];
  const targetSheetName = data?.sheetName || "Master Sheet";

  const handleApplyUpdates = async () => {
    if (!updates || updates.length === 0) {
      toast.error("No student updates available to apply.");
      return;
    }

    setLoading(true);
    try {
      const getColLetter = (cIdx: number) => {
        let temp, letter = "";
        let tempCol = cIdx;
        while (tempCol >= 0) {
          temp = tempCol % 26;
          letter = String.fromCharCode(temp + 65) + letter;
          tempCol = Math.floor(tempCol / 26) - 1;
        }
        return letter;
      };

      const store = useMasterSheetStore.getState();
      const currentSheet = store.sheets[targetSheetName]?.data || data?.masterGrid;

      if (!currentSheet || !currentSheet.data) {
        toast.error("Target Master Sheet data grid not found.");
        setLoading(false);
        return;
      }

      // Clone existing grid data
      const updatedGridData = currentSheet.data.map((row: any[]) => [...row]);

      updates.forEach((update: any) => {
        const rIdx = update.row_idx;
        
        // Dynamically append new rows if rIdx exceeds current grid height
        while (updatedGridData.length <= rIdx) {
          const emptyRow = new Array(currentSheet.columns.length).fill("");
          updatedGridData.push(emptyRow);
        }

        if (rIdx < updatedGridData.length) {
          // Auto-fill student info if auto_populated or empty
          if (update.auto_populated) {
            if (update.s_no && 0 < updatedGridData[rIdx].length && !updatedGridData[rIdx][0]) {
              updatedGridData[rIdx][0] = update.s_no;
            }
            if (update.enrollment && update.enrollment_col_idx < updatedGridData[rIdx].length && !updatedGridData[rIdx][update.enrollment_col_idx]) {
              updatedGridData[rIdx][update.enrollment_col_idx] = update.enrollment;
            }
            if (update.student_name && update.name_col_idx < updatedGridData[rIdx].length && !updatedGridData[rIdx][update.name_col_idx]) {
              updatedGridData[rIdx][update.name_col_idx] = update.student_name;
            }
          }

          // Total Classes
          if (update.total_col_idx < updatedGridData[rIdx].length) {
            updatedGridData[rIdx][update.total_col_idx] = update.total_new_value;
          }
          // Attended Classes
          if (update.attended_col_idx < updatedGridData[rIdx].length) {
            updatedGridData[rIdx][update.attended_col_idx] = update.attended_new_value;
          }

          // Percentage Formula / Calculated column
          const pctColIdx = Math.max(update.total_col_idx, update.attended_col_idx) + 1;
          const totalColLetter = getColLetter(update.total_col_idx);
          const attColLetter = getColLetter(update.attended_col_idx);
          const excelRow = rIdx + 1;

          if (pctColIdx < updatedGridData[rIdx].length) {
            // Calculate percentage numerical value
            const totalVal = Number(update.total_new_value) || 0;
            const attVal = Number(update.attended_new_value) || 0;
            const pctVal = totalVal > 0 ? Math.round((attVal / totalVal) * 100) : 0;
            updatedGridData[rIdx][pctColIdx] = `${pctVal}%`;
          }
        }
      });

      const updatedSheetObj = {
        columns: currentSheet.columns,
        data: updatedGridData,
      };

      // Update in-memory store for live spreadsheet grid view
      store.setSheetData(targetSheetName, updatedSheetObj);

      // Push to master sheet store queue
      store.pushData({
        masterSheetName: targetSheetName,
        sheetName: targetSheetName,
        data: updatedSheetObj,
        blockCodenames: ["AI_Attendance_Import"],
        pushedBy: "workflow",
        pushedByName: "AI Attendance Node",
        pushedAt: Date.now(),
        sourceNodeId: id,
      });

      setAppliedCount(updates.length);
      setSuccess(true);
      toast.success(`Merged ${updates.length} updates into "${targetSheetName}". Click Save in MasterSheet header to persist to database.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update Master Sheet: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseNode variant="output" selected={selected} className="w-72">
      <BaseNodeHeader variant="output">
        <BaseNodeIcon variant="output">
          <Table2 className="size-4" />
        </BaseNodeIcon>
        <div className="min-w-0">
          <BaseNodeHeaderTitle>MasterSheet Update</BaseNodeHeaderTitle>
          <p className="text-[10px] text-muted-foreground truncate">{targetSheetName}</p>
        </div>
        <NodeHeaderActions>
          {updates.length > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {updates.length} ready
            </Badge>
          )}
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-3 text-xs">
        <p className="text-[11px] text-muted-foreground">
          Recalculate attendance totals, calculate percentage formulas, and push updates directly into the Master Sheet.
        </p>

        <Button
          onClick={handleApplyUpdates}
          disabled={loading || updates.length === 0}
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs gap-1.5 nodrag shadow-xs"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
          {loading ? "Merging..." : "Confirm Merge to Master Sheet"}
        </Button>

        {success && (
          <div className="flex items-center gap-1.5 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>Updated {appliedCount} rows in Master Sheet!</span>
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle
        variant="output"
        type="target"
        position={Position.Left}
        id="updates"
        style={{ top: "50%" }}
      />
    </BaseNode>
  );
}
