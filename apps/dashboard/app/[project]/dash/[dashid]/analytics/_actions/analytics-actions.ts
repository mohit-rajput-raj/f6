"use server";

import { supabase } from "@repo/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export interface AnalyticsDataset {
  columns: string[];
  data: any[][];
}

export interface SaveAnalyticsStackParams {
  dashid: string;
  userId: string;
  stackName: string;
  stackMode?: "align_columns" | "append_rows" | "replace";
  keyColumn?: string;
  dataset: AnalyticsDataset;
}

/**
 * Intelligent stack merge: combines multiple batches/runs into a unified dataset.
 * Supports horizontal column alignment (like daily attendance dates Jul 1, Jul 2...)
 * or vertical row appending.
 */
export async function saveOrMergeAnalyticsStack({
  dashid,
  userId,
  stackName,
  stackMode = "align_columns",
  keyColumn,
  dataset,
}: SaveAnalyticsStackParams) {
  if (!dashid || !userId) {
    throw new Error("Missing dashid or userId");
  }

  const cleanName = (stackName || "Analytics Stack").trim();
  const validWorkflowId = isValidUuid(dashid) ? dashid.trim() : null;

  if (!dataset || !Array.isArray(dataset.columns) || !Array.isArray(dataset.data)) {
    throw new Error("Invalid dataset structure provided");
  }

  // 1. Check if stack with this name already exists in this workflow
  let query = supabase
    .from("analytics_stack")
    .select("*")
    .eq("name", cleanName);

  if (validWorkflowId) {
    query = query.eq("workflowId", validWorkflowId);
  } else {
    query = query.eq("userId", userId);
  }

  const { data: existingRecords } = await query.limit(1);
  const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

  let finalData: AnalyticsDataset = dataset;

  if (existing && existing.data) {
    const existingDataset: AnalyticsDataset = existing.data as AnalyticsDataset;
    const existingCols: string[] = existingDataset.columns || [];
    const existingRows: any[][] = existingDataset.data || [];

    if (stackMode === "align_columns") {
      // ── Horizontal Alignment (e.g. daily dates Jul 1, Jul 2, Jul 3...) ──
      const incomingCols: string[] = dataset.columns || [];
      const incomingRows: any[][] = dataset.data || [];

      // Determine Key Column (e.g. Enrollment, Name, S.No, or first matching column)
      let resolvedKey = keyColumn?.trim();
      if (!resolvedKey || !existingCols.includes(resolvedKey) || !incomingCols.includes(resolvedKey)) {
        const commonCols = incomingCols.filter((c) => existingCols.includes(c));
        const preferredKeys = ["Enrollment", "enrollment", "Roll No", "roll_no", "S.No", "sno", "ID", "id", "Name", "name"];
        resolvedKey = commonCols.find((c) => preferredKeys.includes(c)) || commonCols[0] || existingCols[0];
      }

      const existingKeyIdx = existingCols.indexOf(resolvedKey);
      const incomingKeyIdx = incomingCols.indexOf(resolvedKey);

      if (existingKeyIdx >= 0 && incomingKeyIdx >= 0) {
        // Find newly added columns that do not exist yet in existing
        const newColumns = incomingCols.filter((c) => !existingCols.includes(c));
        const mergedCols = [...existingCols, ...newColumns];

        // Map incoming rows by key value (trimmed string)
        const incomingMap = new Map<string, any[]>();
        incomingRows.forEach((r) => {
          if (Array.isArray(r)) {
            const keyVal = String(r[incomingKeyIdx] ?? "").trim();
            if (keyVal) incomingMap.set(keyVal, r);
          }
        });

        // 1. Extend existing rows with new columns
        const updatedRows: any[][] = existingRows.map((exRow) => {
          const rowCopy = [...exRow];
          // Ensure row has length matching existingCols
          while (rowCopy.length < existingCols.length) rowCopy.push("");

          const keyVal = String(rowCopy[existingKeyIdx] ?? "").trim();
          const incomingRow = incomingMap.get(keyVal);

          newColumns.forEach((newCol) => {
            const incIdx = incomingCols.indexOf(newCol);
            const val = incomingRow && incIdx >= 0 ? (incomingRow[incIdx] ?? "") : "";
            rowCopy.push(val);
          });

          // Also update existing common columns if incoming has non-empty values
          if (incomingRow) {
            incomingCols.forEach((incCol) => {
              if (incCol !== resolvedKey && existingCols.includes(incCol)) {
                const exIdx = existingCols.indexOf(incCol);
                const incIdx = incomingCols.indexOf(incCol);
                const newVal = incomingRow[incIdx];
                if (newVal !== undefined && newVal !== null && newVal !== "") {
                  rowCopy[exIdx] = newVal;
                }
              }
            });
          }

          return rowCopy;
        });

        // 2. Add any incoming rows whose key wasn't in existing
        const existingKeys = new Set(
          existingRows.map((r) => String(r[existingKeyIdx] ?? "").trim())
        );

        incomingRows.forEach((incRow) => {
          const keyVal = String(incRow[incomingKeyIdx] ?? "").trim();
          if (keyVal && !existingKeys.has(keyVal)) {
            const newRow: any[] = new Array(mergedCols.length).fill("");
            incomingCols.forEach((col, cIdx) => {
              const targetIdx = mergedCols.indexOf(col);
              if (targetIdx >= 0) {
                newRow[targetIdx] = incRow[cIdx] ?? "";
              }
            });
            updatedRows.push(newRow);
            existingKeys.add(keyVal);
          }
        });

        finalData = {
          columns: mergedCols,
          data: updatedRows,
        };
      } else {
        // Fallback to latest dataset if no common key could be established
        finalData = dataset;
      }
    } else if (stackMode === "append_rows") {
      // ── Vertical Stack (Append rows) ──
      const mergedCols = Array.from(new Set([...existingCols, ...dataset.columns]));
      const updatedRows: any[][] = [];

      // Re-map existing rows to mergedCols
      existingRows.forEach((r) => {
        const row: any[] = mergedCols.map((c) => {
          const idx = existingCols.indexOf(c);
          return idx >= 0 ? r[idx] ?? "" : "";
        });
        updatedRows.push(row);
      });

      // Append incoming rows
      dataset.data.forEach((r) => {
        const row: any[] = mergedCols.map((c) => {
          const idx = dataset.columns.indexOf(c);
          return idx >= 0 ? r[idx] ?? "" : "";
        });
        updatedRows.push(row);
      });

      finalData = {
        columns: mergedCols,
        data: updatedRows,
      };
    } else {
      // Replace mode
      finalData = dataset;
    }
  }

  // ── Extract time-series metrics from incoming table ──
  const incomingCols = dataset.columns || [];
  const incomingRows = dataset.data || [];

  const pctIdx = incomingCols.findIndex((c) => /percent|pct|%/i.test(c));
  const attendIdx = incomingCols.findIndex((c) => /attend/i.test(c));
  const totalIdx = incomingCols.findIndex((c) => /total.*class|classes.*total|total/i.test(c));
  const enrollIdx = incomingCols.findIndex((c) => /enroll|roll|id/i.test(c));
  const nameIdx = incomingCols.findIndex((c) => /name|student/i.test(c));

  let totalPctSum = 0;
  let pctCount = 0;
  let totalClassesSum = 0;
  let totalAttendSum = 0;
  let eligibleCount = 0;
  let warningCount = 0;
  let defaulterCount = 0;
  const studentRecords: Record<string, { name: string; attend: number; total: number; percentage: number }> = {};

  incomingRows.forEach((row) => {
    if (!Array.isArray(row)) return;
    const key = String(row[enrollIdx >= 0 ? enrollIdx : 0] ?? "").trim();
    const name = nameIdx >= 0 ? String(row[nameIdx] ?? key).trim() : key;

    let pctVal = 0;
    if (pctIdx >= 0 && row[pctIdx] !== undefined && row[pctIdx] !== null) {
      const raw = String(row[pctIdx]).replace("%", "").trim();
      const num = parseFloat(raw);
      if (!isNaN(num)) pctVal = num;
    }

    let attendVal = 0;
    if (attendIdx >= 0 && row[attendIdx] !== undefined) {
      const num = parseFloat(String(row[attendIdx]).trim());
      if (!isNaN(num)) attendVal = num;
    }

    let totalVal = 0;
    if (totalIdx >= 0 && row[totalIdx] !== undefined) {
      const num = parseFloat(String(row[totalIdx]).trim());
      if (!isNaN(num)) totalVal = num;
    }

    if (pctVal === 0 && totalVal > 0 && attendVal > 0) {
      pctVal = Math.round((attendVal / totalVal) * 10000) / 100;
    }

    if (pctVal > 0) {
      totalPctSum += pctVal;
      pctCount++;
    }
    totalAttendSum += attendVal;
    if (totalVal > totalClassesSum) totalClassesSum = totalVal;

    if (pctVal >= 75) eligibleCount++;
    else if (pctVal >= 60) warningCount++;
    else if (pctVal > 0) defaulterCount++;

    if (key) {
      studentRecords[key] = {
        name,
        attend: attendVal,
        total: totalVal,
        percentage: pctVal,
      };
    }
  });

  const avgPercentage = pctCount > 0 ? Math.round((totalPctSum / pctCount) * 100) / 100 : 0;

  // Retrieve previous snapshot history from metadata
  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as any)
      : {};
  const previousSnapshots: any[] = Array.isArray(existingMetadata.snapshots)
    ? existingMetadata.snapshots
    : [];

  const runNumber = previousSnapshots.length + 1;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const timeLabel = `Run ${runNumber} (${dateStr} ${timeStr})`;

  const newSnapshot = {
    id: `run_${Date.now()}`,
    runNumber,
    timestamp: now.toISOString(),
    label: timeLabel,
    shortLabel: `Run ${runNumber} (${dateStr})`,
    rowCount: incomingRows.length,
    avgPercentage,
    totalClasses: totalClassesSum,
    totalAttend: totalAttendSum,
    eligibleCount,
    warningCount,
    defaulterCount,
    students: studentRecords,
  };

  const snapshots = [...previousSnapshots, newSnapshot].slice(-50);

  const rowCount = finalData.data.length;
  const colCount = finalData.columns.length;

  const metadata = {
    ...existingMetadata,
    stackName: cleanName,
    stackMode,
    keyColumn: keyColumn || "auto",
    rowCount,
    colCount,
    lastSyncedAt: now.toISOString(),
    syncedBy: userId,
    isSummaryTable: pctIdx >= 0 || attendIdx >= 0,
    snapshots,
  };

  if (existing) {
    // Update existing record
    const { data: updated, error } = await supabase
      .from("analytics_stack")
      .update({
        data: finalData,
        metadata,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } else {
    // Insert new record
    const { data: inserted, error } = await supabase
      .from("analytics_stack")
      .insert({
        userId,
        workflowId: validWorkflowId,
        name: cleanName,
        description: `Analytics stack table with ${colCount} columns and ${rowCount} rows`,
        data: finalData,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }
}

/**
 * Retrieves all analytics stack tables available for this desk workflow.
 */
export async function getAnalyticsStacks(dashid?: string, userId?: string) {
  const validWorkflowId = dashid && isValidUuid(dashid.trim()) ? dashid.trim() : null;

  let query = supabase
    .from("analytics_stack")
    .select("id, name, description, data, metadata, createdAt, updatedAt, workflowId")
    .order("updatedAt", { ascending: false });

  if (validWorkflowId) {
    query = query.eq("workflowId", validWorkflowId);
  } else if (userId) {
    query = query.eq("userId", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching analytics stacks:", error);
    return [];
  }

  return data || [];
}

/**
 * Deletes an analytics stack table.
 */
export async function deleteAnalyticsStack(id: string, userId?: string) {
  if (!isValidUuid(id)) throw new Error("Invalid id");
  const { data, error } = await supabase
    .from("analytics_stack")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Saves a user-configured chart to be pinned on their Analytics Dashboard.
 */
export async function savePinnedChart(dashid: string, userId: string, chartConfig: any) {
  const validWorkflowId = isValidUuid(dashid) ? dashid.trim() : null;
  const name = chartConfig.title || "Custom Analytics Chart";

  const { data, error } = await supabase
    .from("analytics_chart")
    .insert({
      userId,
      workflowId: validWorkflowId,
      name,
      description: chartConfig.description || "Pinned analytics graph",
      data: chartConfig,
      metadata: {
        chartType: chartConfig.chartType,
        stackId: chartConfig.stackId,
        pinnedAt: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves all pinned charts for this desk.
 */
export async function getPinnedCharts(dashid?: string, userId?: string) {
  const validWorkflowId = dashid && isValidUuid(dashid.trim()) ? dashid.trim() : null;

  let query = supabase
    .from("analytics_chart")
    .select("id, name, description, data, metadata, createdAt, updatedAt")
    .order("createdAt", { ascending: false });

  if (validWorkflowId) {
    query = query.eq("workflowId", validWorkflowId);
  } else if (userId) {
    query = query.eq("userId", userId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Deletes a pinned chart.
 */
export async function deletePinnedChart(id: string) {
  if (!isValidUuid(id)) return false;
  const { error } = await supabase
    .from("analytics_chart")
    .delete()
    .eq("id", id);
  return !error;
}
