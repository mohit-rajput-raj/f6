"use client";

import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Table2, CheckCircle2, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/components";
import { Badge } from "@repo/ui/components/ui/badge";
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { useSession } from "@/lib/auth-client";
import { upsertMasterSheetByName, addMasterSheetHistory } from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";
import { toast } from "sonner";

export function MasterSheetUpdateNode({ id, data }: any) {
  const { data: sessionData } = useSession();
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
        if (rIdx < updatedGridData.length) {
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
          const pctFormula = `=IF(${totalColLetter}${excelRow}>0, ROUND((${attColLetter}${excelRow}/${totalColLetter}${excelRow})*100, 0), 0)`;

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

      // Push to master sheet store
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

      // Save to database if user is logged in
      const userId = sessionData?.user?.id;
      const userName = sessionData?.user?.name ?? "Unknown User";

      if (userId) {
        const saved = await upsertMasterSheetByName({
          userId,
          name: targetSheetName,
          data: updatedSheetObj,
          metadata: {
            rowCount: updatedGridData.length,
            colCount: currentSheet.columns.length,
            lastMergedAt: new Date().toISOString(),
          },
        });

        await addMasterSheetHistory({
          masterSheetId: saved.id,
          userId,
          userName,
          action: "update",
          dataAfter: updatedSheetObj,
          changeSummary: `Applied AI attendance update for ${updates.length} students in "${targetSheetName}"`,
        });
      }

      setAppliedCount(updates.length);
      setSuccess(true);
      toast.success(`Successfully updated ${updates.length} student rows in Master Sheet!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update Master Sheet: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-72 rounded-xl border border-purple-500/30 bg-card p-4 shadow-lg text-foreground">
      <Handle type="target" position={Position.Left} id="updates" style={{ top: "50%" }} />

      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <Table2 className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">MasterSheet Update</h3>
            <p className="text-[10px] text-muted-foreground">{targetSheetName}</p>
          </div>
        </div>
        {updates.length > 0 && (
          <Badge variant="secondary" className="text-[9px] bg-purple-500/20 text-purple-400 border-purple-500/30">
            {updates.length} updates
          </Badge>
        )}
      </div>

      <div className="space-y-3 text-xs">
        <p className="text-[11px] text-muted-foreground">
          Recalculate attendance totals, calculate percentage formulas, and push updates directly into the Master Sheet.
        </p>

        <Button
          onClick={handleApplyUpdates}
          disabled={loading || updates.length === 0}
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
          {loading ? "Applying..." : "Push to Master Sheet"}
        </Button>

        {success && (
          <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">
            <CheckCircle2 className="size-3 shrink-0" />
            <span>Updated {appliedCount} rows in Master Sheet!</span>
          </div>
        )}
      </div>
    </div>
  );
}
