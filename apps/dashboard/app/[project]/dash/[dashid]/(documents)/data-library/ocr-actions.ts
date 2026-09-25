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
  needsApiKey?: boolean; // signals the UI to prompt for an API key
}

/**
 * Normalizes table data to ensure consistent rectangular shape and string values.
 */
function normalizeTableData(
  rawColumns: any,
  rawData: any,
): { columns: string[]; data: (string | null)[][] } {
  const columns: string[] = Array.isArray(rawColumns)
    ? rawColumns.map((c, i) =>
        c !== null && c !== undefined && String(c).trim() !== ""
          ? String(c).trim()
          : `Column_${i + 1}`,
      )
    : [];

  let rows: (string | null)[][] = [];

  if (Array.isArray(rawData)) {
    rows = rawData.map((row) => {
      if (Array.isArray(row)) {
        const paddedRow = row.map((cell) => {
          if (cell === null || cell === undefined) return "";
          const str = String(cell).trim();
          if (
            str.toLowerCase() === "null" ||
            str.toLowerCase() === "na" ||
            str.toLowerCase() === "n/a"
          )
            return "";
          return str;
        });
        // Pad or trim to match columns length
        while (paddedRow.length < columns.length) {
          paddedRow.push("");
        }
        return paddedRow.slice(0, columns.length);
      } else if (typeof row === "object" && row !== null) {
        // If row is a record { col1: val1, col2: val2 }
        return columns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "";
          const str = String(val).trim();
          if (
            str.toLowerCase() === "null" ||
            str.toLowerCase() === "na" ||
            str.toLowerCase() === "n/a"
          )
            return "";
          return str;
        });
      }
      return Array(columns.length).fill("");
    });
  }

  return { columns, data: rows };
}

/** A single find→replace rule for post-processing extracted cells */
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
  // Legacy toggles (still supported for backward compat)
  dotToA?: boolean;
  leaveUnclearBlank?: boolean;
  handleCrossOuts?: boolean;
  parseMultiTierDates?: boolean;
  includeBottomNotes?: boolean;
  // New: dynamic replacement rules applied after extraction
  replacementRules?: ReplacementRule[];
}

/**
 * Checks if a string looks like a valid Gemini API key.
 * Valid keys start with "AIza" and are typically 39 characters.
 */
function isValidGeminiKey(key: string | null | undefined): key is string {
  if (!key) return false;
  return key.startsWith("AIza") && key.length >= 30;
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
      if (cell === null || cell === undefined) return cell;
      let val = cell;

      for (const rule of rules) {
        // Skip if this rule is column-scoped and this column isn't included
        if (
          rule.columnIndices &&
          rule.columnIndices.length > 0 &&
          !rule.columnIndices.includes(colIdx)
        ) {
          continue;
        }

        if (rule.exactMatch !== false) {
          // Default: exact whole-cell match
          const cellToCompare = rule.caseSensitive ? val : val.toLowerCase();
          const findToCompare = rule.caseSensitive
            ? rule.find
            : rule.find.toLowerCase();
          if (cellToCompare === findToCompare) {
            val = rule.replace;
          }
        } else {
          // Substring replacement
          if (rule.caseSensitive) {
            val = val.split(rule.find).join(rule.replace);
          } else {
            val = val.replace(
              new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
              rule.replace,
            );
          }
        }
      }

      return val;
    }),
  );
}

/**
 * Perform Table OCR on an image.
 * Supports single images as well as sub-grid tiles/chunks.
 * Tries the Python (pyp) FastAPI server first.
 * If unreachable or fails, seamlessly falls back to direct Gemini 2.5 Flash Vision API.
 */
export async function scanTableImageAction(
  base64Image: string,
  options?: ScanTableOptions,
): Promise<TableOcrResult> {
  if (!base64Image) {
    return { success: false, error: "No image provided" };
  }

  // Resolve a valid Gemini API key in order of priority:
  // 1. Explicitly passed apiKey
  // 2. User's geminiApiKey from DB (only if it looks like a real Gemini key)
  // 3. Server-side GEMINI_API_KEY from .env
  let resolvedApiKey: string | undefined;

  if (isValidGeminiKey(options?.apiKey)) {
    resolvedApiKey = options!.apiKey;
  }

  if (!resolvedApiKey && options?.userId) {
    try {
      const userKeys = await getUserLLMKeys(options.userId);
      if (isValidGeminiKey(userKeys?.geminiApiKey)) {
        resolvedApiKey = userKeys.geminiApiKey!;
      }
    } catch (err) {
      console.warn("Could not fetch user geminiApiKey from DB:", err);
    }
  }

  if (!resolvedApiKey && isValidGeminiKey(process.env.GEMINI_API_KEY)) {
    resolvedApiKey = process.env.GEMINI_API_KEY;
  }

  if (!resolvedApiKey) {
    return {
      success: false,
      error:
        "No valid Gemini API key found. Please add your Gemini API key in Settings to use OCR.",
      needsApiKey: true,
    };
  }

  // Build replacement rules from legacy toggles + explicit rules
  const replacementRules: ReplacementRule[] = [
    ...(options?.replacementRules || []),
  ];

  // Legacy dotToA toggle adds a built-in rule
  if (options?.dotToA) {
    const dotFinds = [".", "•", "·"];
    for (const f of dotFinds) {
      // Only add if user hasn't already defined a rule for this
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
        model_name: "gemini-2.5-flash",
        custom_prompt: options?.customPrompt,
        dot_to_a: options?.dotToA ?? false,
        leave_unclear_blank: options?.leaveUnclearBlank ?? true,
        handle_cross_outs: options?.handleCrossOuts ?? true,
        parse_multi_tier_dates: options?.parseMultiTierDates ?? false,
        include_bottom_notes: options?.includeBottomNotes ?? true,
        is_data_only: options?.isDataOnly ?? false,
        tile_context: options?.tileContext,
      },
      { timeout: 45000 },
    );

    if (pypResponse.data?.success && pypResponse.data?.data) {
      const { columns, data } = pypResponse.data.data;
      if (Array.isArray(columns)) {
        let normalized = normalizeTableData(columns, data);
        // Apply user-defined replacement rules
        if (replacementRules.length > 0) {
          normalized = {
            ...normalized,
            data: applyReplacementRules(normalized.data, replacementRules),
          };
        }
        return {
          success: true,
          data: normalized,
          source: "pyp",
        };
      }
    }
  } catch (pypErr: any) {
    console.warn(
      "Python OCR server unavailable or failed, falling back to direct Gemini API:",
      pypErr?.message,
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${resolvedApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptText,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Gemini API error (${response.status}): ${errText.slice(0, 200)}`,
      };
    }

    const result = await response.json();
    const textContent =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!textContent) {
      return { success: false, error: "No response received from OCR engine" };
    }

    let jsonStr = textContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return {
        success: false,
        error: "Extracted data does not contain valid columns",
      };
    }

    let normalized = normalizeTableData(parsed.columns, parsed.data || []);
    // Apply user-defined replacement rules
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
  } catch (err: any) {
    console.error("Direct Gemini OCR error:", err);
    return {
      success: false,
      error: err?.message || "Failed to process image OCR",
    };
  }
}
