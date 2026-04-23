"use server";

/**
 * Gemini Vision OCR — scans a table image and returns structured CSV data.
 * Uses Google Generative AI (Gemini 2.0 Flash) for fast, accurate table extraction.
 */

interface OcrResult {
  success: boolean;
  data?: { columns: string[]; data: string[][] };
  error?: string;
}

export async function scanTableImage(base64Image: string): Promise<OcrResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY is not configured. Add it to .env.local" };
  }

  try {
    // Strip data URL prefix if present
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    // Determine MIME type from data URL or default to image/png
    let mimeType = "image/png";
    if (base64Image.startsWith("data:")) {
      const match = base64Image.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a precise table extraction engine. Analyze this image and extract the table data.

Rules:
1. Return ONLY a valid JSON object, no markdown, no explanation, no code blocks.
2. The JSON must have this exact shape: { "columns": ["col1", "col2", ...], "data": [["row1val1", "row1val2", ...], ...] }
3. Extract ALL rows and ALL columns from the table.
4. If a cell is empty, use an empty string "".
5. Preserve the original text exactly as shown in the image.
6. If the image contains multiple tables, extract only the largest/main one.
7. If no table is found, return: { "columns": [], "data": [] }`,
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
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return { success: false, error: `Gemini API error: ${response.status}` };
    }

    const result = await response.json();

    // Extract text from response
    const textContent =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!textContent) {
      return { success: false, error: "No response from Gemini" };
    }

    // Parse JSON — handle potential markdown code blocks
    let jsonStr = textContent.trim();
    // Remove markdown code fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return { success: false, error: "Invalid response format — missing columns" };
    }

    return {
      success: true,
      data: {
        columns: parsed.columns,
        data: parsed.data || [],
      },
    };
  } catch (err: any) {
    console.error("OCR processing error:", err);
    return {
      success: false,
      error: err?.message || "Failed to process image",
    };
  }
}
