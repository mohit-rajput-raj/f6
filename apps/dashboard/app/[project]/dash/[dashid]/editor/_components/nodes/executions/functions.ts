// ─── Client-side computation functions ───────────────────────

export interface FilterConfig {
  column?: string;
  condition?: string;
  value?: string;
}

export interface Dataset {
  columns: string[];
  data: any[][];
}

// ── Filter ──
export const applyFilter = (
  dataset: Dataset,
  config: FilterConfig
): Dataset => {
  if (!config.column || !config.value || !config.condition) return dataset;

  const colIndex = dataset.columns.indexOf(config.column);
  if (colIndex === -1) return dataset;

  const value = config.value.trim();

  const filteredRows = dataset.data.filter((row) => {
    const cell = row[colIndex];
    const cellStr = String(cell ?? "").trim();

    switch (config.condition) {
      case "text-exact":
        return cellStr === value;
      case "text-contains":
        return cellStr.includes(value);
      case "text-starts":
        return cellStr.startsWith(value);
      case "text-ends":
        return cellStr.endsWith(value);
      case "number-eq":
        return Number(cell) === Number(value);
      case "number-gt":
        return Number(cell) > Number(value);
      case "number-gte":
        return Number(cell) >= Number(value);
      case "number-lt":
        return Number(cell) < Number(value);
      case "number-lte":
        return Number(cell) <= Number(value);
      default:
        return true;
    }
  });

  return { columns: dataset.columns, data: filteredRows };
};

// ── Text transforms ──
export const toCamelCase = (str: string): string => {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (s) => s.toLowerCase());
};

export const toLowercase = (str: string): string => {
  return str.toLowerCase();
};

// ── Math Column ──
export const applyMathColumn = (
  dataset: Dataset,
  config: {
    column?: string;
    operation?: string;
    value?: string;
    sourceColumn?: string;
    resultColumn?: string;
  }
): Dataset => {
  if (!config.column || !config.operation) return dataset;

  const colIndex = dataset.columns.indexOf(config.column);
  if (colIndex === -1) return dataset;

  const srcColIndex =
    config.sourceColumn && config.sourceColumn !== "__none__"
      ? dataset.columns.indexOf(config.sourceColumn)
      : -1;
  const constVal = Number(config.value ?? 0);
  const resultName = config.resultColumn || `${config.column}_${config.operation}`;

  const newColumns = [...dataset.columns, resultName];
  const newData = dataset.data.map((row) => {
    const a = Number(row[colIndex] ?? 0);
    const b = srcColIndex >= 0 ? Number(row[srcColIndex] ?? 0) : constVal;

    let result: number;
    switch (config.operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        result = b !== 0 ? a / b : 0;
        break;
      default:
        result = a;
    }

    return [...row, result];
  });

  return { columns: newColumns, data: newData };
};

// ── Math Row ──
export const applyMathRow = (
  dataset: Dataset,
  config: { columns?: string[]; aggregation?: string; resultColumn?: string }
): Dataset => {
  if (!config.columns || config.columns.length === 0 || !config.aggregation)
    return dataset;

  const colIndices = config.columns
    .map((c) => dataset.columns.indexOf(c))
    .filter((i) => i >= 0);
  if (colIndices.length === 0) return dataset;

  const resultName = config.resultColumn || "row_agg";
  const newColumns = [...dataset.columns, resultName];

  const newData = dataset.data.map((row) => {
    const values = colIndices.map((i) => Number(row[i] ?? 0));
    let result: number;

    switch (config.aggregation) {
      case "sum":
        result = values.reduce((a, b) => a + b, 0);
        break;
      case "average":
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "min":
        result = Math.min(...values);
        break;
      case "max":
        result = Math.max(...values);
        break;
      default:
        result = 0;
    }

    return [...row, result];
  });

  return { columns: newColumns, data: newData };
};

// ── Sort ──
export const applySort = (
  dataset: Dataset,
  config: { column?: string; direction?: string }
): Dataset => {
  if (!config.column) return dataset;

  const colIndex = dataset.columns.indexOf(config.column);
  if (colIndex === -1) return dataset;

  const sorted = [...dataset.data].sort((a, b) => {
    const va = a[colIndex];
    const vb = b[colIndex];
    const na = Number(va);
    const nb = Number(vb);

    // Try numeric comparison first
    if (!isNaN(na) && !isNaN(nb)) {
      return config.direction === "desc" ? nb - na : na - nb;
    }

    // Fall back to string comparison
    const sa = String(va ?? "");
    const sb = String(vb ?? "");
    return config.direction === "desc"
      ? sb.localeCompare(sa)
      : sa.localeCompare(sb);
  });

  return { columns: dataset.columns, data: sorted };
};

// ── Aggregate ──
export const applyAggregate = (
  dataset: Dataset,
  config: {
    groupByColumn?: string;
    aggregateColumn?: string;
    operation?: string;
  }
): Dataset => {
  if (!config.groupByColumn || !config.aggregateColumn || !config.operation)
    return dataset;

  const groupIdx = dataset.columns.indexOf(config.groupByColumn);
  const aggIdx = dataset.columns.indexOf(config.aggregateColumn);
  if (groupIdx === -1 || aggIdx === -1) return dataset;

  const groups = new Map<string, number[]>();
  dataset.data.forEach((row) => {
    const key = String(row[groupIdx] ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(Number(row[aggIdx] ?? 0));
  });

  const resultColumns = [config.groupByColumn, `${config.aggregateColumn}_${config.operation}`];
  const resultData: any[][] = [];

  groups.forEach((values, key) => {
    let agg: number;
    switch (config.operation) {
      case "sum":
        agg = values.reduce((a, b) => a + b, 0);
        break;
      case "count":
        agg = values.length;
        break;
      case "average":
        agg = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "min":
        agg = Math.min(...values);
        break;
      case "max":
        agg = Math.max(...values);
        break;
      default:
        agg = 0;
    }
    resultData.push([key, agg]);
  });

  return { columns: resultColumns, data: resultData };
};

// ── Formula (client-side simple) ──
export const applyFormula = (
  dataset: Dataset,
  config: { formula?: string; resultColumn?: string }
): Dataset => {
  if (!config.formula) return dataset;

  const resultName = config.resultColumn || "formula_result";

  try {
    const newData = dataset.data.map((row) => {
      // Build a scope object mapping column names -> values
      let expr = config.formula!;
      dataset.columns.forEach((col, idx) => {
        // Replace column names with values, handling non-alphanumeric names
        const escapedCol = col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escapedCol}\\b`, "g");
        expr = expr.replace(regex, String(Number(row[idx] ?? 0)));
      });

      // Safely evaluate math expression (only allows numbers and basic operators)
      const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "");
      let result: number;
      try {
        result = Function(`"use strict"; return (${sanitized})`)();
      } catch {
        result = 0;
      }

      return [...row, result];
    });

    return { columns: [...dataset.columns, resultName], data: newData };
  } catch {
    return dataset;
  }
};

// ── Merge / Join ──
export const applyMerge = (
  leftDataset: Dataset,
  rightDataset: Dataset,
  config: {
    joinType?: string;
    leftColumn?: string;
    rightColumn?: string;
  }
): Dataset => {
  if (!config.leftColumn || !config.rightColumn)
    return leftDataset;

  const leftIdx = leftDataset.columns.indexOf(config.leftColumn);
  const rightIdx = rightDataset.columns.indexOf(config.rightColumn);
  if (leftIdx === -1 || rightIdx === -1) return leftDataset;

  const joinType = config.joinType ?? "inner";

  // Prefix right columns to avoid duplicates
  const rightColsRenamed = rightDataset.columns.map((c, i) =>
    i === rightIdx ? c : leftDataset.columns.includes(c) ? `right_${c}` : c
  );

  const mergedColumns = [...leftDataset.columns, ...rightColsRenamed.filter((_, i) => i !== rightIdx)];
  const resultData: any[][] = [];

  // Build right lookup
  const rightMap = new Map<string, any[][]>();
  rightDataset.data.forEach((row) => {
    const key = String(row[rightIdx] ?? "");
    if (!rightMap.has(key)) rightMap.set(key, []);
    rightMap.get(key)!.push(row);
  });

  const usedRightKeys = new Set<string>();

  leftDataset.data.forEach((leftRow) => {
    const key = String(leftRow[leftIdx] ?? "");
    const rightRows = rightMap.get(key);

    if (rightRows) {
      usedRightKeys.add(key);
      rightRows.forEach((rightRow) => {
        const rightVals = rightRow.filter((_, i) => i !== rightIdx);
        resultData.push([...leftRow, ...rightVals]);
      });
    } else if (joinType === "left" || joinType === "outer") {
      const nullRight = new Array(rightDataset.columns.length - 1).fill(null);
      resultData.push([...leftRow, ...nullRight]);
    }
  });

  if (joinType === "right" || joinType === "outer") {
    rightDataset.data.forEach((rightRow) => {
      const key = String(rightRow[rightIdx] ?? "");
      if (!usedRightKeys.has(key)) {
        const nullLeft = new Array(leftDataset.columns.length).fill(null);
        const rightVals = rightRow.filter((_, i) => i !== rightIdx);
        resultData.push([...nullLeft, ...rightVals]);
      }
    });
  }

  return { columns: mergedColumns, data: resultData };
};

// ── Rename Column ──
export const applyRenameColumn = (
  dataset: Dataset,
  config: { oldName?: string; newName?: string }
): Dataset => {
  if (!config.oldName || !config.newName) return dataset;

  const newColumns = dataset.columns.map((c) =>
    c === config.oldName ? config.newName! : c
  );

  return { columns: newColumns, data: dataset.data };
};

// ── Select Columns ──
export const applySelectColumns = (
  dataset: Dataset,
  config: { selectedColumns?: string[]; mode?: string }
): Dataset => {
  if (!config.selectedColumns || config.selectedColumns.length === 0)
    return dataset;

  const keep =
    config.mode === "drop"
      ? dataset.columns.filter((c) => !config.selectedColumns!.includes(c))
      : config.selectedColumns;

  const indices = keep
    .map((c) => dataset.columns.indexOf(c))
    .filter((i) => i >= 0);

  return {
    columns: indices.map((i) => dataset.columns[i]),
    data: dataset.data.map((row) => indices.map((i) => row[i])),
  };
};

// ── Debounce utility ──
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout>;

  function debounced(...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
  };

  return debounced as typeof debounced & { cancel: () => void };
}