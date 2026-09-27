"use server";

import { pypApi } from "@/lib/axios";
import { getUserLLMKeys } from "./api-key-actions";

export interface TableOcrResult {
  success: boolean;
  data?: {
    columns: string[];
    data: (string | null)[][];
  };
  error?: string;
  source?: "pyp" | "gemini-direct";
  needsApiKey?: boolean; // Signals the UI to prompt for an API key
  needsPlan?: boolean; // Signals the UI that user must upgrade to Pro/Enterprise
}

export interface ReplacementRule {
  find: string;
  replace: string;
  /** If true, apply only to columns at these indices (0-based). If empty/undefined, apply to all */
  columnIndices?: number[];
  caseSensitive?: boolean;
  exactMatch?: boolean; // true = whole cell match, false = substring match
}

export interface ScanTableOptions {
  userId?: string;
  apiKey?: string;
  isDataOnly?: boolean;
  expectedCols?: number;
  expectedRows?: number;
  tileContext?: string;
  customPrompt?: string;
  dotToA?: boolean;
  leaveUnclearBlank?: boolean;
  handleCrossOuts?: boolean;
  parseMultiTierDates?: boolean;
  includeBottomNotes?: boolean;
  replacementRules?: ReplacementRule[];
}

/**
 * Normalizes table data to ensure consistent rectangular shape and string values.
 */
function normalizeTableData(
  rawColumns: unknown,
  rawData: unknown,
): { columns: string[]; data: (string | null)[][] } {
  const columns: string[] = Array.isArray(rawColumns)
    ? rawColumns.map((c, i) =>
        c != null && String(c).trim() !== ""
          ? String(c).trim()
          : `Column_${i + 1}`,
      )
    : [];

  if (!Array.isArray(rawData)) {
    return { columns, data: [] };
  }

  const rows: (string | null)[][] = rawData.map((row) => {
    if (Array.isArray(row)) {
      const paddedRow = row.map((cell) => cleanCellValue(cell));
      while (paddedRow.length < columns.length) {
        paddedRow.push("");
      }
      return paddedRow.slice(0, columns.length);
    } else if (typeof row === "object" && row !== null) {
      return columns.map((col) =>
        cleanCellValue((row as Record<string, unknown>)[col]),
      );
    }
    return Array(columns.length).fill("");
  });

  return { columns, data: rows };
}

/** Helper to clean null/NA equivalents in cell contents */
function cleanCellValue(val: unknown): string {
  if (val == null) return "";
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === "null" || lower === "na" || lower === "n/a") return "";
  return str;
}

/**
 * Apply user-defined replacement rules to extracted table data.
 */
function applyReplacementRules(
  data: (string | null)[][],
  rules: ReplacementRule[],
): (string | null)[][] {
  if (!rules || rules.length === 0) return data;

  return data.map((row) =>
    row.map((cell, colIdx) => {
      if (cell == null) return cell;
      let val = cell;

      for (const rule of rules) {
        if (
          rule.columnIndices &&
          rule.columnIndices.length > 0 &&
          !rule.columnIndices.includes(colIdx)
        ) {
          continue;
        }

        if (rule.exactMatch !== false) {
          const cellToCompare = rule.caseSensitive ? val : val.toLowerCase();
          const findToCompare = rule.caseSensitive
            ? rule.find
            : rule.find.toLowerCase();
          if (cellToCompare === findToCompare) {
            val = rule.replace;
          }
        } else {
          if (rule.caseSensitive) {
            val = val.replaceAll(rule.find, rule.replace);
          } else {
            const escapedFind = rule.find.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );
            val = val.replace(new RegExp(escapedFind, "gi"), rule.replace);
          }
        }
      }

      return val;
    }),
  );
}

/**
 * Perform Table OCR on an image.
 */
export async function scanTableImageAction(
  base64Image: string,
  options?: ScanTableOptions,
): Promise<TableOcrResult> {
  if (!base64Image) {
    return { success: false, error: "No image provided" };
  }

  // Resolve API key: check options, user DB profile, and server env
  let resolvedApiKey = options?.apiKey?.trim();

  if (!resolvedApiKey && options?.userId) {
    try {
      const userKeys = await getUserLLMKeys(options.userId);
      resolvedApiKey = userKeys?.geminiApiKey?.trim();
    } catch (err) {
      console.warn("Could not fetch user geminiApiKey from DB:", err);
    }
  }

  if (!resolvedApiKey) {
    resolvedApiKey =
      process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  }

  if (!resolvedApiKey) {
    return {
      success: false,
      error:
        "No valid Gemini API key found. Please add your Gemini API key in Settings → API Keys to use OCR.",
      needsApiKey: true,
    };
  }

  // Build replacement rules
  const replacementRules: ReplacementRule[] = [
    ...(options?.replacementRules || []),
  ];

  if (options?.dotToA) {
    const dotFinds = [".", "•", "·"];
    for (const f of dotFinds) {
      if (!replacementRules.some((r) => r.find === f)) {
        replacementRules.push({
          find: f,
          replace: "A",
          exactMatch: true,
          caseSensitive: true,
        });
      }
    }
  }

  // 1. Try calling the Python (pyp) server
  try {
    const pypResponse = await pypApi.post(
      "/ai/ocr",
      {
        image_base64: base64Image,
        api_key: resolvedApiKey,
        model_name: "gemini-3.5-flash-lite",
        custom_prompt: options?.customPrompt,
        dot_to_a: options?.dotToA ?? true,
        leave_unclear_blank: options?.leaveUnclearBlank ?? true,
        handle_cross_outs: options?.handleCrossOuts ?? true,
        parse_multi_tier_dates: options?.parseMultiTierDates ?? true,
        include_bottom_notes: options?.includeBottomNotes ?? true,
        is_data_only: options?.isDataOnly ?? false,
        tile_context: options?.tileContext,
      },
      { timeout: 60000 },
    );

    if (pypResponse.data?.success && pypResponse.data?.data) {
      const { columns, data } = pypResponse.data.data;
      if (Array.isArray(columns)) {
        let normalized = normalizeTableData(columns, data);
        if (replacementRules.length > 0) {
          normalized = {
            ...normalized,
            data: applyReplacementRules(normalized.data, replacementRules),
          };
        }
        return { success: true, data: normalized, source: "pyp" };
      }
    }
  } catch (pypErr: unknown) {
    console.warn(
      "Python OCR server unavailable or failed, falling back to direct Gemini API:",
      (pypErr as Error)?.message,
    );
  }

  // 2. Fallback to direct Gemini Vision API
  try {
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    let mimeType = "image/png";
    if (base64Image.startsWith("data:")) {
      const match = base64Image.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    }

    const specificRules: string[] = [
      "- Extract ALL visible rows and columns from the table.",
      '- If any cell is empty, blank, unclear, difficult to read, or confidence is below 80%, output "" (empty string) so the user can manually fill or edit it.',
      '- Handle merged cells by repeating the value or leaving secondary cells as "".',
      "- Clean up OCR artifacts and stray characters.",
    ];

    if (options?.dotToA) {
      specificRules.push(
        "- CRITICAL ATTENDANCE RULE: Treat single dots ('.'), bullet marks, or tiny pen marks in attendance/status cells as 'A' (Absent). Do not output '.' or skip them; convert them directly to 'A'.",
      );
    }

    if (options?.leaveUnclearBlank) {
      specificRules.push(
        '- ACCURACY RULE: If any handwritten text or cell content is illegible, partially obscured, or uncertain, leave the cell value as empty string "". Never hallucinate.',
      );
    }

    if (options?.handleCrossOuts) {
      specificRules.push(
        "- HANDWRITTEN CORRECTIONS: If a printed name or roll number is crossed out with handwritten text nearby (e.g. Satish Kumar crossed out and 'Taha' written), extract the corrected replacement text ('Taha').",
      );
    }

    if (options?.parseMultiTierDates) {
      specificRules.push(
        "- DATE HEADERS: If columns have two-level date headers (such as a day number '06', '13', '20' with month 'Aug' or 'Sept' written above or below), combine them into unified header names like '06/Aug', '13/Aug', '20/Aug', '03/Sept', '16/Sept'.",
      );
    }

    if (options?.includeBottomNotes) {
      specificRules.push(
        "- APPENDED ROWS: If there are extra handwritten rows, student records, or notes written below the main printed grid (e.g. 'B17 30 Satish kumar P P P 03 P'), extract them as additional valid rows at the bottom.",
      );
    }

    if (options?.customPrompt?.trim()) {
      specificRules.push(
        `- USER SPECIFIC DIRECTIVE: ${options.customPrompt.trim()}`,
      );
    }

    const promptText = `Analyze this ${options?.tileContext ? `tile image (${options.tileContext})` : "image"} and extract all tabular data.
${
  options?.isDataOnly
    ? "IMPORTANT: This image is a chunk/tile containing ONLY data rows (no table header row). Do NOT treat the first row as headers. Use generic column keys Column 1, Column 2, etc., and return ALL rows in the 'data' array."
    : "Use the table header row for column names. If there is no clear header, use 'Column 1', 'Column 2', etc."
}
${options?.expectedCols ? `Expected approximate column count: ${options.expectedCols}.` : ""}
${options?.expectedRows ? `Expected approximate row count: ${options.expectedRows}.` : ""}
Return ONLY valid JSON in this exact format (no markdown, no explanation, no backticks):
{"columns": ["col1", "col2", ...], "data": [["val1", "val2", ...], ...]}

Rules:
${specificRules.join("\n")}
- If no table is visible in the image, return: {"columns": [], "data": []}`;

    const reqPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    // Model fallback chain: gemini-3.5-flash-lite → gemini-2.5-flash
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-2.5-flash"];
    let response: Response | null = null;
    let lastErrText = "";

    for (const model of modelsToTry) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolvedApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqPayload),
        },
      );

      if (response.ok) break;

      // Only retry on 404 (model not found); other errors are not model-related
      if (response.status === 404) {
        console.warn(`Model ${model} not found, trying next fallback...`);
        continue;
      }

      // For non-404 errors, don't retry — it's likely an auth/quota issue
      lastErrText = await response.text();
      return {
        success: false,
        error: `Gemini API error (${response.status}): ${lastErrText.slice(0, 200)}`,
      };
    }

    if (!response || !response.ok) {
      if (response) {
        lastErrText = await response.text();
      }
      return {
        success: false,
        error: `Gemini API error: No compatible model found. ${lastErrText.slice(0, 200)}`,
      };
    }

    const result = await response.json();
    const textContent =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!textContent) {
      return { success: false, error: "No response received from OCR engine" };
    }

    const jsonStr = textContent
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed = JSON.parse(jsonStr);
    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return {
        success: false,
        error: "Extracted data does not contain valid columns",
      };
    }

    let normalized = normalizeTableData(parsed.columns, parsed.data || []);
    if (replacementRules.length > 0) {
      normalized = {
        ...normalized,
        data: applyReplacementRules(normalized.data, replacementRules),
      };
    }

    return {
      success: true,
      data: normalized,
      source: "gemini-direct",
    };
  } catch (err: unknown) {
    console.error("Direct Gemini OCR error:", err);
    return {
      success: false,
      error: (err as Error)?.message || "Failed to process image OCR",
    };
  }
}
