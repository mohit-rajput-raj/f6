// ═══════════════════════════════════════════════════════════
// Analytics Node Executors
// Handles: AnalyticsStack, MasterSheetPreview,
//          UpdatedMergedPreview, DynamicMasterSheet,
//          AISchemaAlign
// ═══════════════════════════════════════════════════════════

import type {
  INodeExecutor,
  ExecutionContext,
  Dataset,
  DeskInputResolver,
} from "@repo/workflow-engine/types";
import { supabase } from "@repo/db";

const EMPTY: Dataset = { columns: [], data: [] };

const resolveText = (raw: any): string => {
  if (typeof raw === "string") return raw.trim();
  if (raw?.text) return String(raw.text).trim();
  if (raw?.value) return String(raw.value).trim();
  return "";
};

// ── AnalyticsStackNode ──────────────────────────────────────
export class AnalyticsStackExecutor implements INodeExecutor {
  type = "AnalyticsStackNode";

  async execute(ctx: ExecutionContext): Promise<any> {
    const nameRaw =
      ctx.inputs.get("table-name") ??
      ctx.inputs.get("tableName") ??
      ctx.inputs.get("table_name") ??
      ctx.inputs.get("name");
    const dataInput =
      ctx.inputs.get("in") ??
      ctx.inputs.get("data") ??
      ctx.inputs.get("default") ??
      ctx.inputs.values().next().value;
    const ds: Dataset = dataInput ?? EMPTY;

    let resolvedStackName =
      resolveText(nameRaw) || ctx.nodeData?.stackName || "Attendance Tracker";

    const finalDs = {
      ...ds,
      targetPath: resolvedStackName,
      stackName: resolvedStackName,
    };

    ctx.emitNodeMeta({
      stackName: resolvedStackName,
      resolvedTableName: resolvedStackName,
      targetPath: resolvedStackName,
      rowCount: ds.data?.length ?? 0,
    });

    // Auto-push to analytics if enabled
    const autoExecute = ctx.nodeData?.autoExecute ?? false;
    if (autoExecute && ds.columns?.length > 0) {
      try {
        const stackMode = ctx.nodeData?.stackMode || "align_columns";
        const keyColumn = ctx.nodeData?.keyColumn || "Enrollment";

        // Upsert analytics stack in DB
        const { data: existing } = await supabase
          .from("analytics_stack")
          .select("id, data")
          .eq("dashid", ctx.dashid)
          .eq("name", resolvedStackName)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("analytics_stack")
            .update({
              data: ds,
              metadata: {
                stackMode,
                keyColumn,
                rowCount: ds.data.length,
                colCount: ds.columns.length,
              },
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("analytics_stack").insert({
            dashid: ctx.dashid,
            userId: ctx.userId,
            name: resolvedStackName,
            data: ds,
            metadata: {
              stackMode,
              keyColumn,
              rowCount: ds.data.length,
              colCount: ds.columns.length,
            },
          });
        }

        ctx.emitNodeMeta({
          lastSyncStatus: "synced",
          lastSyncedAt: Date.now(),
          syncedRows: ds.data.length,
          syncedCols: ds.columns.length,
        });
      } catch (err) {
        console.error("AnalyticsStackNode auto-sync error:", err);
        ctx.emitNodeMeta({ lastSyncStatus: "error" });
      }
    }

    return finalDs;
  }
}

// ── MasterSheetPreviewNode ──────────────────────────────────
export class MasterSheetPreviewExecutor implements INodeExecutor {
  type = "MasterSheetPreviewNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<Dataset> {
    const dataInput =
      ctx.inputs.get("in") ??
      ctx.inputs.get("default") ??
      ctx.inputs.values().next().value;
    const ds: Dataset = dataInput ?? EMPTY;

    const saveTriggered = Boolean(ctx.inputs.get("save-trigger"));

    let saveStatus = "";
    if (ds.columns?.length > 0) {
      // Push preview via WebSocket
      await this.deskResolver.setMasterSheetPreview(ds);

      if (saveTriggered) {
        try {
          const sheetName = ctx.nodeData?.mastersheetId || "Master Sheet";
          await this.deskResolver.pushMasterSheetData(sheetName, ds, {
            savedBy: "workflow",
            savedAt: Date.now(),
          });
          saveStatus = "saved";
        } catch {
          saveStatus = "error";
        }
      }
    }

    ctx.emitNodeMeta({
      saveTriggered,
      lastSaveStatus: saveStatus || undefined,
    });

    return ds;
  }
}

function applyComputedUpdatesToGrid(
  baseColumns: string[],
  baseData: any[][],
  updates: any[],
  targetPath?: string,
  groupColumns?: Array<{ col_idx: number; header: string }>
): { columns: string[]; data: any[][] } {
  const pathPrefix = targetPath || "Path";

  let previewColumns: string[];
  if (Array.isArray(groupColumns) && groupColumns.length > 0) {
    previewColumns = [
      "S.No",
      "Enrollment",
      "Name",
      ...groupColumns.map((g) =>
        g.header ? `${pathPrefix}:${g.header}` : `${pathPrefix}:Col_${g.col_idx + 1}`
      ),
    ];
  } else {
    previewColumns = [
      "S.No",
      "Enrollment",
      "Name",
      `${pathPrefix}:Total`,
      `${pathPrefix}:Attended`,
      `${pathPrefix}:%`,
    ];
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      columns: previewColumns,
      data: [],
    };
  }

  const previewData = updates.map((u, idx) => {
    const sNo = u.s_no !== undefined ? u.s_no : idx + 1;
    const enroll = u.enrollment || "";
    const name = u.student_name || "";

    if (Array.isArray(groupColumns) && groupColumns.length > 0) {
      const colVals = groupColumns.map((g) => {
        if (u.cell_updates && u.cell_updates[g.col_idx] !== undefined) {
          return u.cell_updates[g.col_idx];
        }
        if (g.col_idx === u.total_col_idx && u.total_new_value !== undefined)
          return u.total_new_value;
        if (g.col_idx === u.attended_col_idx && u.attended_new_value !== undefined)
          return u.attended_new_value;
        if (g.col_idx === u.percentage_col_idx && u.percentage_new_value !== undefined)
          return u.percentage_new_value;
        return "";
      });
      return [sNo, enroll, name, ...colVals];
    }

    const total =
      u.total_new_value !== undefined && u.total_new_value !== null
        ? u.total_new_value
        : "";
    const attended =
      u.attended_new_value !== undefined && u.attended_new_value !== null
        ? u.attended_new_value
        : "";
    let pct = u.percentage_new_value;
    if (pct === undefined || pct === null) {
      pct = total
        ? Math.round(((Number(attended) || 0) / (Number(total) || 1)) * 100)
        : 0;
    }

    return [sNo, enroll, name, total, attended, pct];
  });

  return {
    columns: previewColumns,
    data: previewData,
  };
}

// ── UpdatedMergedPreviewNode ────────────────────────────────
export class UpdatedMergedPreviewExecutor implements INodeExecutor {
  type = "UpdatedMergedPreviewNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<any> {
    const pathRaw =
      ctx.inputs.get("target-path") ??
      ctx.inputs.get("targetPath") ??
      ctx.inputs.get("path") ??
      ctx.inputs.get("table-name") ??
      ctx.inputs.get("tableName");
    const dataInput =
      ctx.inputs.get("in") ??
      ctx.inputs.get("updates") ??
      ctx.inputs.get("default") ??
      ctx.inputs.values().next().value;

    let effectivePath = resolveText(pathRaw);

    if (!effectivePath && dataInput) {
      effectivePath = dataInput.targetPath || dataInput.stackName || "";
    }

    if (!effectivePath) {
      // Search for AnalyticsStackNode data in runtime
      effectivePath = ctx.nodeData?.targetPath || "";
    }

    const baseOutput = dataInput || ctx.nodeData?.result || EMPTY;
    const outputValue = {
      ...baseOutput,
      columns: Array.isArray(baseOutput.columns) ? baseOutput.columns : [],
      data: Array.isArray(baseOutput.data) ? baseOutput.data : [],
      updates: Array.isArray(baseOutput.updates) ? baseOutput.updates : [],
      alignment: baseOutput.alignment || null,
      targetPath: effectivePath || baseOutput.targetPath || "",
      stackName: effectivePath || baseOutput.stackName || "",
    };

    await this.deskResolver.setMergedPreview(outputValue);

    ctx.emitNodeMeta({
      targetPath: effectivePath,
    });

    return outputValue;
  }
}

// ── DynamicMasterSheetNode ──────────────────────────────────
// This is a complex AI-driven node. On server, we call the pyp API directly.
export class DynamicMasterSheetExecutor implements INodeExecutor {
  type = "DynamicMasterSheetNode";
  constructor(private deskResolver: DeskInputResolver) {}

  async execute(ctx: ExecutionContext): Promise<any> {
    const dataInput =
      ctx.inputs.get("data-input") ??
      ctx.inputs.get("default") ??
      ctx.inputs.values().next().value;
    const sheetNameVal = resolveText(ctx.inputs.get("sheet-name"));
    const targetPathVal = resolveText(ctx.inputs.get("target-path"));
    const customPromptVal = resolveText(
      ctx.inputs.get("custom-prompt") ?? ctx.inputs.get("prompt"),
    );

    const pathString = targetPathVal || ctx.nodeData?.targetPath || "";
    const sheetString = sheetNameVal || ctx.nodeData?.selectedSheet || "Sheet1";
    const promptString =
      customPromptVal ||
      ctx.nodeData?.customPrompt ||
      "Match Enrollment ID in column 1.";

    // Convert data input to CSV string
    let csvString = "";
    if (typeof dataInput === "string") {
      csvString = dataInput;
    } else if (dataInput?.columns && dataInput?.data) {
      const headers = dataInput.columns.join(",");
      const rows = dataInput.data.map((r: any[]) => (Array.isArray(r) ? r.join(",") : String(r))).join("\n");
      csvString = `${headers}\n${rows}`;
    }

    // Get master grid from DB
    let masterGrid: any[][] = [];
    if (sheetString) {
      const { data: masterSheet } = await supabase
        .from("master_sheet")
        .select("data")
        .eq("name", sheetString)
        .eq("dashid", ctx.dashid)
        .maybeSingle();

      if (masterSheet?.data) {
        const msData = masterSheet.data as Dataset;
        if (msData.columns?.length > 0) {
          masterGrid = [msData.columns, ...msData.data];
        }
      }
    }

    if (masterGrid.length === 0) {
      masterGrid = [
        [
          "S.No",
          "Enrollment",
          "Name",
          `${pathString}:Total`,
          `${pathString}:Attended`,
          `${pathString}:%`,
        ],
      ];
    }

    let updates: any[] = [];
    let alignment: any = null;
    let groupColumns: any[] | undefined = undefined;
    let dataStartRow: number | undefined = undefined;

    // Call AI alignment API if we have CSV data
    if (csvString) {
      try {
        const pypUrl = process.env.PYP_SERVER_URL || "http://localhost:8000";
        const res = await fetch(`${pypUrl}/ai/dynamic-align-schema`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            master_grid: masterGrid,
            csv_string: csvString,
            target_column_path: pathString,
            custom_prompt: promptString,
            sheet_name: sheetString,
            provider: ctx.nodeData?.provider || "gemini",
            model: ctx.nodeData?.model || "gemini-2.5-flash",
          }),
        });

        const resData = await res.json();
        if (resData?.success && Array.isArray(resData.updates)) {
          updates = resData.updates;
          alignment = resData.alignment;
          groupColumns = resData.group_columns;
          dataStartRow = resData.data_start_row;
        }
      } catch (err: any) {
        console.warn("AI alignment API failed:", err?.message);
      }
    }

    const mergedDataset = applyComputedUpdatesToGrid(
      [],
      [],
      updates,
      pathString || "Attendance",
      groupColumns
    );

    const result = {
      ...mergedDataset,
      updates,
      alignment,
      groupColumns,
      dataStartRow,
      sheetName: sheetString,
      targetPath: pathString,
      stackName: pathString,
    };

    await this.deskResolver.setMergedPreview(result);

    ctx.emitNodeMeta({
      incomingSheetName: sheetString,
      incomingTargetPath: pathString,
      updates,
      alignment,
    });

    return result;
  }
}

// ── AISchemaAlignNode ───────────────────────────────────────
// Interactive AI node — needs data from prev nodes before user can configure
export class AISchemaAlignExecutor implements INodeExecutor {
  type = "AISchemaAlignNode";

  async execute(ctx: ExecutionContext): Promise<any> {
    const masterGridData = ctx.inputs.get("master-grid");
    const csvFileData = ctx.inputs.get("csv-file");

    ctx.emitNodeMeta({
      masterGrid: masterGridData,
      csvContent: csvFileData,
      fileData: csvFileData,
    });

    // This node's result comes from user interaction — just pass through stored result
    return ctx.nodeData?.result || { updates: [], alignment: null };
  }
}

export function createAnalyticsExecutors(
  deskResolver: DeskInputResolver,
): INodeExecutor[] {
  return [
    new AnalyticsStackExecutor(),
    new MasterSheetPreviewExecutor(deskResolver),
    new UpdatedMergedPreviewExecutor(deskResolver),
    new DynamicMasterSheetExecutor(deskResolver),
    new AISchemaAlignExecutor(),
  ];
}
