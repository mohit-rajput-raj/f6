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
  if (!dataset?.columns || !config.column || !config.value || !config.condition) return dataset ?? { columns: [], data: [] };

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
  if (!dataset?.columns || !config.column || !config.operation) return dataset ?? { columns: [], data: [] };

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
  if (!dataset?.columns) return dataset ?? { columns: [], data: [] };
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
  if (!dataset?.columns || !config.column) return dataset ?? { columns: [], data: [] };

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
  if (!dataset?.columns || !config.formula) return dataset ?? { columns: [], data: [] };

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
    return leftDataset ?? { columns: [], data: [] };
  if (!leftDataset?.columns || !rightDataset?.columns)
    return leftDataset ?? { columns: [], data: [] };

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
  if (!dataset?.columns || !config.oldName || !config.newName) return dataset ?? { columns: [], data: [] };

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
  if (!dataset?.columns)
    return dataset ?? { columns: [], data: [] };
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

// ── Count In Row ──
export const applyCountInRow = (
  dataset: Dataset,
  config: { valueToCount?: string; resultColumn?: string; selectedColumns?: string[]; columnsToDrop?: string[] }
): Dataset => {
  if (!dataset?.columns || !config.valueToCount) return dataset ?? { columns: [], data: [] };

  const resultName = config.resultColumn || "CountResult";
  const newColumns = [...dataset.columns, resultName];

  // If selectedColumns is empty/undefined, search all columns. Otherwise, search only selected ones.
  const searchIndices = config.selectedColumns?.length
    ? config.selectedColumns.map(c => dataset.columns.indexOf(c)).filter(i => i >= 0)
    : dataset.columns.map((_, i) => i);

  const valuesToMatch = config.valueToCount.split('&&').map(v => v.trim().toLowerCase()).filter(v => v);

  const newData = dataset.data.map((row) => {
    let count = 0;
    for (const idx of searchIndices) {
      if (idx < row.length) {
        const cellVal = String(row[idx] ?? "").trim().toLowerCase();
        if (valuesToMatch.includes(cellVal)) {
          count++;
        }
      }
    }
    return [...row, count];
  });

  const toDrop = config.columnsToDrop ?? [];
  if (toDrop.length > 0) {
    const indicesToKeep = newColumns.map((c, i) => toDrop.includes(c) ? -1 : i).filter(i => i >= 0);
    return {
      columns: indicesToKeep.map(i => newColumns[i]),
      data: newData.map(row => indicesToKeep.map(i => row[i]))
    };
  }

  return { columns: newColumns, data: newData };
};

// ── Update Merge (accumulate values with per-column custom formulas) ──

/** Safely evaluate a math expression with named variables */
const safeEvalFormula = (formula: string, vars: Record<string, number>): number => {
  try {
    let expr = formula;
    // Sort variable names by length (longest first) to avoid partial replacements
    const sortedVarNames = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const name of sortedVarNames) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
      expr = expr.replace(regex, String(vars[name]));
    }
    // Only allow numbers, basic math operators, parens, and whitespace
    const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
    return Function(`"use strict"; return (${sanitized})`)();
  } catch {
    return 0;
  }
};

export const applyUpdateMerge = (
  existing: Dataset,
  newData: Dataset,
  config: {
    keyColumn?: string;
    columnFormulas?: Record<string, string>;
    targetColumns?: string[];
    updateMode?: string;
    columnModes?: Record<string, string>;
  }
): Dataset => {
  if (!config.keyColumn) return existing ?? { columns: [], data: [] };
  if (!existing?.columns || !newData?.columns) return existing ?? { columns: [], data: [] };

  const keyIdxExisting = existing.columns.indexOf(config.keyColumn);
  const keyIdxNew = newData.columns.indexOf(config.keyColumn);
  if (keyIdxExisting === -1 || keyIdxNew === -1) return existing;

  const columnFormulas = config.columnFormulas ?? {};
  const targetCols = config.targetColumns ?? [];

  // Build a lookup of existing rows by key
  const existingMap = new Map<string, number>();
  existing.data.forEach((row, idx) => {
    existingMap.set(String(row[keyIdxExisting] ?? ""), idx);
  });

  const targetIndicesExisting = targetCols.map((c) => existing.columns.indexOf(c)).filter((i) => i >= 0);
  const targetIndicesNew = targetCols.map((c) => newData.columns.indexOf(c)).filter((i) => i >= 0);

  const resultData = existing.data.map((row) => [...row]);

  newData.data.forEach((newRow) => {
    const key = String(newRow[keyIdxNew] ?? "");
    const existingIdx = existingMap.get(key);

    if (existingIdx !== undefined) {
      // Build scope of all existing column values
      const rowScope: Record<string, number> = {};
      existing.columns.forEach((col, idx) => {
        rowScope[col] = Number(resultData[existingIdx][idx] ?? 0);
      });

      // Build scope of new row values
      const newRowScope: Record<string, number> = {};
      newData.columns.forEach((col, idx) => {
        newRowScope[col] = Number(newRow[idx] ?? 0);
      });

      for (let t = 0; t < targetCols.length; t++) {
        const eIdx = targetIndicesExisting[t];
        const nIdx = targetIndicesNew[t];
        if (eIdx === undefined || nIdx === undefined || eIdx < 0 || nIdx < 0) continue;

        const colName = targetCols[t];
        const formula = columnFormulas[colName] ?? 'left + right';
        const oldVal = Number(resultData[existingIdx][eIdx] ?? 0);
        const newVal = Number(newRow[nIdx] ?? 0);

        const formulaVars: Record<string, number> = {
          ...rowScope,
          left: oldVal,
          right: newVal,
        };
        for (const [col, val] of Object.entries(newRowScope)) {
          formulaVars[`new_${col}`] = val;
        }

        const result = safeEvalFormula(formula, formulaVars);
        resultData[existingIdx][eIdx] = isNaN(result) ? 0 : result;
        rowScope[colName] = resultData[existingIdx][eIdx];
      }
    } else {
      const newMappedRow = new Array(existing.columns.length).fill(null);
      existing.columns.forEach((col, idx) => {
        const newColIdx = newData.columns.indexOf(col);
        if (newColIdx >= 0) {
          newMappedRow[idx] = newRow[newColIdx];
        }
      });
      resultData.push(newMappedRow);
    }
  });

  return { columns: existing.columns, data: resultData };
};

// ── Sheet Merge (horizontal concat with prefixes) ──
export const applySheetMerge = (
  left: Dataset,
  right: Dataset,
  config: {
    keyColumn?: string;
    leftPrefix?: string;
    rightPrefix?: string;
  }
): Dataset => {
  if (!config.keyColumn) return left ?? { columns: [], data: [] };
  if (!left?.columns || !right?.columns) return left ?? { columns: [], data: [] };

  const leftKeyIdx = left.columns.indexOf(config.keyColumn);
  const rightKeyIdx = right.columns.indexOf(config.keyColumn);
  if (leftKeyIdx === -1 || rightKeyIdx === -1) return left;

  const leftPrefix = config.leftPrefix ?? "";
  const rightPrefix = config.rightPrefix ?? "";

  // Build merged columns: key + prefixed left cols + prefixed right cols
  const leftNonKeyCols = left.columns.filter((_, i) => i !== leftKeyIdx);
  const rightNonKeyCols = right.columns.filter((_, i) => i !== rightKeyIdx);

  const mergedColumns = [
    config.keyColumn,
    ...leftNonKeyCols.map((c) => (leftPrefix ? `${leftPrefix}${c}` : c)),
    ...rightNonKeyCols.map((c) => (rightPrefix ? `${rightPrefix}${c}` : c)),
  ];

  // Build right lookup
  const rightMap = new Map<string, any[]>();
  right.data.forEach((row) => {
    rightMap.set(String(row[rightKeyIdx] ?? ""), row);
  });

  const leftNonKeyIndices = left.columns.map((_, i) => i).filter((i) => i !== leftKeyIdx);
  const rightNonKeyIndices = right.columns.map((_, i) => i).filter((i) => i !== rightKeyIdx);

  const resultData: any[][] = [];

  // Get all unique keys from both sides
  const allKeys = new Set<string>();
  left.data.forEach((row) => allKeys.add(String(row[leftKeyIdx] ?? "")));
  right.data.forEach((row) => allKeys.add(String(row[rightKeyIdx] ?? "")));

  allKeys.forEach((key) => {
    const leftRow = left.data.find((r) => String(r[leftKeyIdx] ?? "") === key);
    const rightRow = rightMap.get(key);

    const row: any[] = [key];

    // Left non-key values
    leftNonKeyIndices.forEach((idx) => {
      row.push(leftRow ? leftRow[idx] : null);
    });

    // Right non-key values
    rightNonKeyIndices.forEach((idx) => {
      row.push(rightRow ? rightRow[idx] : null);
    });

    resultData.push(row);
  });

  return { columns: mergedColumns, data: resultData };
};

// ── Append (vertical stack / UNION) ──
export const applyAppend = (
  top: Dataset,
  bottom: Dataset,
  config: {
    mode?: string; // "match" or "all"
  }
): Dataset => {
  if (!top?.columns) return top ?? { columns: [], data: [] };
  if (!bottom?.columns) return top;
  const mode = config.mode ?? "all";

  if (mode === "match") {
    // Only keep shared columns
    const sharedCols = top.columns.filter((c) => bottom.columns.includes(c));
    if (sharedCols.length === 0) return top;

    const topIndices = sharedCols.map((c) => top.columns.indexOf(c));
    const bottomIndices = sharedCols.map((c) => bottom.columns.indexOf(c));

    const topData = top.data.map((row) => topIndices.map((i) => row[i]));
    const bottomData = bottom.data.map((row) =>
      bottomIndices.map((i) => row[i])
    );

    return { columns: sharedCols, data: [...topData, ...bottomData] };
  }

  // mode === "all" — keep all columns, fill missing with null
  const allCols = [...new Set([...top.columns, ...bottom.columns])];

  const topMapped = top.data.map((row) =>
    allCols.map((col) => {
      const idx = top.columns.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    })
  );

  const bottomMapped = bottom.data.map((row) =>
    allCols.map((col) => {
      const idx = bottom.columns.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    })
  );

  return { columns: allCols, data: [...topMapped, ...bottomMapped] };
};

// ── Column Map (rename/remap columns) ──
export const applyColumnMap = (
  dataset: Dataset,
  config: {
    mappings?: { source: string; target: string }[];
  }
): Dataset => {
  if (!config.mappings || config.mappings.length === 0) return dataset;

  const newColumns = dataset.columns.map((col) => {
    const mapping = config.mappings!.find((m) => m.source === col);
    return mapping ? mapping.target : col;
  });

  return { columns: newColumns, data: dataset.data };
};

// ── Union Merge ──
export const applyUnionMerge = (
  left: Dataset,
  right: Dataset,
  config: { keyColumns?: string[] }
): Dataset => {
  const keys = config.keyColumns ?? [];
  if (keys.length === 0) return { columns: [], data: [] };
  if (!left?.columns || !right?.columns) return left ?? { columns: [], data: [] };

  const leftKeyIndices = keys.map(k => left.columns.indexOf(k));
  const rightKeyIndices = keys.map(k => right.columns.indexOf(k));

  if (leftKeyIndices.includes(-1) || rightKeyIndices.includes(-1)) return left;

  const allColumns = [...new Set([...left.columns, ...right.columns])];
  
  const rightMap = new Map<string, any[]>();
  right.data.forEach(row => {
    const key = rightKeyIndices.map(i => String(row[i] ?? "")).join("||");
    rightMap.set(key, row);
  });

  const matchedRightKeys = new Set<string>();

  const mergedData = left.data.map(leftRow => {
    const key = leftKeyIndices.map(i => String(leftRow[i] ?? "")).join("||");
    const rightRow = rightMap.get(key);
    if (rightRow) matchedRightKeys.add(key);

    return allColumns.map(col => {
      const leftIdx = left.columns.indexOf(col);
      const rightIdx = right.columns.indexOf(col);
      if (leftIdx >= 0 && leftRow[leftIdx] !== null && leftRow[leftIdx] !== undefined) return leftRow[leftIdx];
      if (rightIdx >= 0 && rightRow && rightRow[rightIdx] !== null && rightRow[rightIdx] !== undefined) return rightRow[rightIdx];
      return null;
    });
  });

  right.data.forEach(rightRow => {
    const key = rightKeyIndices.map(i => String(rightRow[i] ?? "")).join("||");
    if (!matchedRightKeys.has(key)) {
      mergedData.push(allColumns.map(col => {
        const rightIdx = right.columns.indexOf(col);
        return rightIdx >= 0 ? rightRow[rightIdx] : null;
      }));
    }
  });

  return { columns: allColumns, data: mergedData };
};

// ── Drop Columns ──
export const applyDropColumns = (
  dataset: Dataset,
  config: { columnsToDrop?: string[] }
): Dataset => {
  if (!dataset?.columns) return dataset ?? { columns: [], data: [] };
  const toDrop = config.columnsToDrop ?? [];
  if (toDrop.length === 0) return dataset;

  const indicesToKeep = dataset.columns
    .map((c, i) => toDrop.includes(c) ? -1 : i)
    .filter(i => i >= 0);

  return {
    columns: indicesToKeep.map(i => dataset.columns[i]),
    data: dataset.data.map(row => indicesToKeep.map(i => row[i]))
  };
};

const evaluateCondition = (val: any, condition: string, targetValue: string) => {
  const sVal = String(val ?? "");
  const sTarget = String(targetValue ?? "");
  
  switch(condition) {
    case 'text-exact': return sVal === sTarget;
    case 'text-contains': return sVal.includes(sTarget);
    case 'text-starts': return sVal.startsWith(sTarget);
    case 'text-ends': return sVal.endsWith(sTarget);
    case 'number-eq': return Number(val) === Number(targetValue);
    case 'number-gt': return Number(val) > Number(targetValue);
    case 'number-gte': return Number(val) >= Number(targetValue);
    case 'number-lt': return Number(val) < Number(targetValue);
    case 'number-lte': return Number(val) <= Number(targetValue);
    default: return false;
  }
};

// ── If Else Split ──
export const applyIfElse = (
  dataset: Dataset,
  config: { rules?: any[] }
): Record<string, Dataset> => {
  const rules = config.rules ?? [];
  if (rules.length === 0) return { out_else: dataset };

  const outputs: Record<string, any[][]> = { out_else: [] };
  rules.forEach((_, i) => outputs[`out_${i}`] = []);

  dataset.data.forEach(row => {
    let matched = false;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const colIdx = dataset.columns.indexOf(rule.column);
      if (colIdx === -1) continue;
      
      const match = evaluateCondition(row[colIdx], rule.condition, rule.value);
      if (match) {
        outputs[`out_${i}`].push(row);
        matched = true;
        break;
      }
    }
    if (!matched) outputs.out_else.push(row);
  });

  const result: Record<string, Dataset> = {};
  for (const key in outputs) {
    result[key] = { columns: dataset.columns, data: outputs[key] };
  }
  return result;
};

// ── Switch Case Split ──
export const applySwitchCase = (
  dataset: Dataset,
  config: { column?: string, cases?: string[] }
): Record<string, Dataset> => {
  const cases = config.cases ?? [];
  const col = config.column;
  if (!col || cases.length === 0) return { out_default: dataset };

  const colIdx = dataset.columns.indexOf(col);
  if (colIdx === -1) return { out_default: dataset };

  const outputs: Record<string, any[][]> = { out_default: [] };
  cases.forEach((_, i) => outputs[`out_${i}`] = []);

  dataset.data.forEach(row => {
    const val = String(row[colIdx] ?? "");
    const matchIdx = cases.findIndex(c => c === val);
    if (matchIdx !== -1) {
      outputs[`out_${matchIdx}`].push(row);
    } else {
      outputs.out_default.push(row);
    }
  });

  const result: Record<string, Dataset> = {};
  for (const key in outputs) {
    result[key] = { columns: dataset.columns, data: outputs[key] };
  }
  return result;
};

// ── Subject Block (prefix columns with subjectCode:sectionType:) ──
export const applySubjectBlock = (
  dataset: Dataset,
  subjectCode: string,
  sectionType: string,
  keyColumn: string
): Dataset => {
  if (!subjectCode || !sectionType || !keyColumn) return dataset;

  const keyIdx = dataset.columns.indexOf(keyColumn);
  if (keyIdx === -1) return dataset;

  const prefix = `${subjectCode}:${sectionType}:`;
  const newColumns = dataset.columns.map((col, i) =>
    i === keyIdx ? col : `${prefix}${col}`
  );

  return { columns: newColumns, data: dataset.data };
};

// ── Block Concat (join base + N blocks side-by-side on key column) ──
export const applyBlockConcat = (
  baseData: Dataset,
  blocks: Dataset[],
  keyColumn: string
): Dataset => {
  if (!keyColumn || !baseData || baseData.columns.length === 0) {
    return baseData ?? { columns: [], data: [] };
  }

  const baseKeyIdx = baseData.columns.indexOf(keyColumn);
  if (baseKeyIdx === -1) return baseData;

  // Start with base columns
  let resultColumns = [...baseData.columns];

  // Build row map from base data (key → row values)
  const rowMap = new Map<string, any[]>();
  baseData.data.forEach(row => {
    const key = String(row[baseKeyIdx] ?? "");
    rowMap.set(key, [...row]);
  });

  // For each block, append its non-key columns
  for (const block of blocks) {
    if (!block || block.columns.length === 0) continue;

    const blockKeyIdx = block.columns.indexOf(keyColumn);
    if (blockKeyIdx === -1) continue;

    // Get non-key column indices
    const nonKeyIndices = block.columns
      .map((_, i) => i)
      .filter(i => i !== blockKeyIdx);

    // Append non-key column names
    const newCols = nonKeyIndices.map(i => block.columns[i]);
    resultColumns = [...resultColumns, ...newCols];

    // For each existing row, append block data
    const prevColCount = resultColumns.length - newCols.length;
    const nullFill = new Array(newCols.length).fill(null);

    // Update existing rows
    rowMap.forEach((rowValues, key) => {
      const blockRow = block.data.find(
        r => String(r[blockKeyIdx] ?? "") === key
      );
      if (blockRow) {
        const blockValues = nonKeyIndices.map(i => blockRow[i]);
        rowValues.push(...blockValues);
      } else {
        rowValues.push(...nullFill);
      }
    });

    // Add new rows from block that don't exist in base
    block.data.forEach(blockRow => {
      const key = String(blockRow[blockKeyIdx] ?? "");
      if (!rowMap.has(key)) {
        // Create a row with nulls for base + previous blocks, fill in block data
        const newRow = new Array(prevColCount).fill(null);
        newRow[baseKeyIdx] = key; // set the key column
        const blockValues = nonKeyIndices.map(i => blockRow[i]);
        newRow.push(...blockValues);
        rowMap.set(key, newRow);
      }
    });
  }

  // Convert map to array, maintaining order
  const resultData: any[][] = [];
  // First add rows in base order
  const baseKeys = baseData.data.map(r => String(r[baseKeyIdx] ?? ""));
  const addedKeys = new Set<string>();
  for (const key of baseKeys) {
    if (rowMap.has(key) && !addedKeys.has(key)) {
      resultData.push(rowMap.get(key)!);
      addedKeys.add(key);
    }
  }
  // Then add any new rows from blocks
  rowMap.forEach((row, key) => {
    if (!addedKeys.has(key)) {
      resultData.push(row);
    }
  });

  return { columns: resultColumns, data: resultData };
};

// ── Dynamic Block Concat (code-driven merge into existing mastersheet) ──
export const applyDynamicBlockConcat = (
  existingSheet: Dataset,
  blocks: Dataset[],
  keyColumn: string
): Dataset => {
  // If no blocks, return existing sheet as-is
  if (!blocks || blocks.length === 0) {
    return existingSheet ?? { columns: [], data: [] };
  }

  // Determine base columns (non-prefixed, like Enrollment_No, Name)
  const getBaseColumns = (ds: Dataset): string[] =>
    ds.columns.filter(col => !col.includes(':'));

  const getCodeFromColumn = (col: string): string | null => {
    const parts = col.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return null;
  };

  const getColumnsForCode = (columns: string[], code: string): string[] =>
    columns.filter(col => col.startsWith(code + ':'));

  // If no existing sheet, build from first block's base + all block columns
  if (!existingSheet || !existingSheet.columns || existingSheet.columns.length === 0) {
    // Start with base data from the first block that has a key column
    let resultColumns: string[] = [];
    const rowMap = new Map<string, any[]>();

    for (const block of blocks) {
      if (!block || !block.columns || block.columns.length === 0) continue;

      const blockKeyIdx = block.columns.indexOf(keyColumn);
      if (blockKeyIdx === -1) continue;

      // Add base columns from this block if not yet added
      const blockBase = getBaseColumns(block);
      for (const bc of blockBase) {
        if (!resultColumns.includes(bc)) resultColumns.push(bc);
      }

      // Add prefixed columns from this block
      const prefixedCols = block.columns.filter(c => c.includes(':'));
      for (const pc of prefixedCols) {
        if (!resultColumns.includes(pc)) resultColumns.push(pc);
      }

      // Merge rows by key
      for (const row of block.data) {
        const key = String(row[blockKeyIdx] ?? '');
        let targetRow = rowMap.get(key);
        if (!targetRow) {
          targetRow = new Array(resultColumns.length).fill(null);
          rowMap.set(key, targetRow);
        }

        // Map values to correct column positions
        for (let i = 0; i < block.columns.length; i++) {
          const colIdx = resultColumns.indexOf(block.columns[i]);
          if (colIdx >= 0) {
            targetRow[colIdx] = row[i];
          }
        }

        // Ensure row length matches column count
        while (targetRow.length < resultColumns.length) targetRow.push(null);
      }
    }

    const resultData = Array.from(rowMap.values());
    return { columns: resultColumns, data: resultData };
  }

  // ── Merge blocks into existing sheet by code ──
  const existingBase = getBaseColumns(existingSheet);
  const existingKeyIdx = existingSheet.columns.indexOf(keyColumn);
  if (existingKeyIdx === -1) return existingSheet;

  // Detect existing block codes
  const existingCodes = new Set<string>();
  for (const col of existingSheet.columns) {
    const code = getCodeFromColumn(col);
    if (code) existingCodes.add(code);
  }

  // Collect incoming block codes and their columns
  const incomingCodeMap = new Map<string, string[]>(); // code → new column names
  for (const block of blocks) {
    if (!block || !block.columns || block.columns.length === 0) continue;
    for (const col of block.columns) {
      const code = getCodeFromColumn(col);
      if (code) {
        if (!incomingCodeMap.has(code)) incomingCodeMap.set(code, []);
        if (!incomingCodeMap.get(code)!.includes(col)) {
          incomingCodeMap.get(code)!.push(col);
        }
      }
    }
  }

  // Determine which existing columns to remove (blocks being replaced)
  const columnsToRemove = new Set<string>();
  for (const code of incomingCodeMap.keys()) {
    if (existingCodes.has(code)) {
      const oldCols = getColumnsForCode(existingSheet.columns, code);
      for (const c of oldCols) columnsToRemove.add(c);
    }
  }

  // Build new column list: base + kept existing prefixed cols + new block cols
  const keptCols = existingSheet.columns.filter(c => !columnsToRemove.has(c));
  const newPrefixedCols: string[] = [];
  for (const [_, cols] of incomingCodeMap) {
    for (const col of cols) {
      if (!keptCols.includes(col) && !newPrefixedCols.includes(col)) {
        newPrefixedCols.push(col);
      }
    }
  }

  const mergedColumns = [...keptCols, ...newPrefixedCols];

  // Build row map from existing data
  const rowMap = new Map<string, any[]>();
  const keyOrder: string[] = [];

  for (const row of existingSheet.data) {
    const key = String(row[existingKeyIdx] ?? '');
    const newRow = new Array(mergedColumns.length).fill(null);

    for (let i = 0; i < existingSheet.columns.length; i++) {
      const col = existingSheet.columns[i];
      if (columnsToRemove.has(col)) continue;
      const newIdx = mergedColumns.indexOf(col);
      if (newIdx >= 0) newRow[newIdx] = row[i];
    }

    rowMap.set(key, newRow);
    if (!keyOrder.includes(key)) keyOrder.push(key);
  }

  // Merge incoming block data
  for (const block of blocks) {
    if (!block || !block.columns || block.columns.length === 0) continue;
    const blockKeyIdx = block.columns.indexOf(keyColumn);
    if (blockKeyIdx === -1) continue;

    for (const row of block.data) {
      const key = String(row[blockKeyIdx] ?? '');
      let targetRow = rowMap.get(key);

      if (!targetRow) {
        targetRow = new Array(mergedColumns.length).fill(null);
        rowMap.set(key, targetRow);
        keyOrder.push(key);
      }

      // Fill in block data columns
      for (let i = 0; i < block.columns.length; i++) {
        const newIdx = mergedColumns.indexOf(block.columns[i]);
        if (newIdx >= 0) targetRow[newIdx] = row[i];
      }
    }
  }

  // Build result preserving key order
  const resultData: any[][] = [];
  for (const key of keyOrder) {
    const row = rowMap.get(key);
    if (row) resultData.push(row);
  }

  return { columns: mergedColumns, data: resultData };
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