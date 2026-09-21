"use server";

import { pypApi } from "@/lib/axios";

export interface TableOcrResult {
  success: boolean;
  data?: {
    columns: string[];
    data: (string | null)[][];
  };
  error?: string;
  source?: "pyp" | "gemini-direct";
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

/**
 * Perform Table OCR on an image.
 * Tries the Python (pyp) FastAPI server first.
 * If unreachable or fails, seamlessly falls back to direct Gemini 2.5 Flash Vision API.
 */
export async function scanTableImageAction(
  base64Image: string,
): Promise<TableOcrResult> {
  if (!base64Image) {
    return { success: false, error: "No image provided" };
  }

  // 1. Try calling the Python (pyp) server
  try {
    const pypResponse = await pypApi.post(
      "/ai/ocr",
      {
        image_base64: base64Image,
        model_name: "gemini-2.5-flash",
      },
      { timeout: 35000 },
    );

    if (pypResponse.data?.success && pypResponse.data?.data) {
      const { columns, data } = pypResponse.data.data;
      if (Array.isArray(columns)) {
        const normalized = normalizeTableData(columns, data);
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error:
        "OCR service unavailable: Neither Python server responded nor GEMINI_API_KEY is configured",
    };
  }

  try {
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    let mimeType = "image/png";
    if (base64Image.startsWith("data:")) {
      const match = base64Image.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this image and extract all tabular data.
Return ONLY valid JSON in this exact format (no markdown, no explanation, no backticks):
{"columns": ["col1", "col2", ...], "data": [["val1", "val2", ...], ...]}

Rules:
- Extract ALL visible rows and columns from the table.
- Use the table header row for column names. If there is no clear header, use "Column 1", "Column 2", etc.
- If any cell is empty, blank, unclear, difficult to read, or confidence is below 80%, output "" (empty string) so the user can manually fill or edit it.
- Handle merged cells by repeating the value or leaving secondary cells as "".
- Clean up OCR artifacts and stray characters.
- If no table is visible in the image, return: {"columns": [], "data": []}`,
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
        error: `Gemini API error (${response.status}): ${errText.slice(0, 150)}`,
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

    const normalized = normalizeTableData(parsed.columns, parsed.data || []);
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
