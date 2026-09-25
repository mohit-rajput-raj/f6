"""
OCR Tool — Extracts structured table data from images using a vision LLM with LangChain.
"""

import os
import json
from typing import Optional
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


@tool
def extract_table_from_image(
    image_base64: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
    custom_prompt: Optional[str] = None,
    dot_to_a: bool = True,
    leave_unclear_blank: bool = True,
    handle_cross_outs: bool = True,
    parse_multi_tier_dates: bool = True,
    include_bottom_notes: bool = True,
    is_data_only: bool = False,
    tile_context: Optional[str] = None,
) -> dict:
    """
    Extract structured table data from a base64 image using vision LLM.
    Returns { columns: string[], data: string[][] }.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return {"error": "GEMINI_API_KEY is not configured on server or in user settings"}

    llm = ChatGoogleGenerativeAI(
        model=model_name or "gemini-2.5-flash",
        google_api_key=key,
        temperature=0,
    )

    specific_rules = [
        "- Extract ALL rows and columns visible in the image",
        "- Clean up OCR artifacts (extra spaces, broken characters)",
        "- Handle merged cells by repeating the value or leaving secondary cells as \"\"",
    ]

    if is_data_only:
        specific_rules.append("- IMPORTANT: This fragment contains ONLY data rows (no table header row). Do NOT treat the first row as headers. Use generic Column 1, Column 2, etc., and return ALL rows in 'data'.")
    else:
        specific_rules.append("- Use the header row for column names. If no clear header, use Column 1, Column 2, etc.")

    if dot_to_a:
        specific_rules.append("- CRITICAL ATTENDANCE RULE: Treat single dots ('.'), bullet marks, or tiny pen marks in attendance/status cells as 'A' (Absent). Output 'A' instead of '.' or empty.")

    if leave_unclear_blank:
        specific_rules.append("- ACCURACY RULE: If any cell or handwriting is empty, blank, unclear, or illegible, leave it as \"\" (empty string). Never hallucinate or guess.")

    if handle_cross_outs:
        specific_rules.append("- HANDWRITTEN CORRECTIONS: If a printed name or roll number is crossed out with handwritten text nearby (e.g. Satish Kumar crossed out and 'Taha' written), extract the corrected replacement text ('Taha').")

    if parse_multi_tier_dates:
        specific_rules.append("- DATE HEADERS: If columns have two-level date headers (such as day numbers '06', '13', '20' with month 'Aug' or 'Sept' written above or below), combine them into unified header names like '06/Aug', '13/Aug', '20/Aug', '03/Sept', '16/Sept'.")

    if include_bottom_notes:
        specific_rules.append("- APPENDED ROWS: If there are extra handwritten rows, student records, or notes written below the main printed grid (e.g. 'B17 30 Satish kumar P P P 03 P'), extract them as additional valid data rows at the bottom.")

    if custom_prompt and custom_prompt.strip():
        specific_rules.append(f"- USER DIRECTIVE: {custom_prompt.strip()}")

    prompt = f"""Analyze this {f'tile/chunk image ({tile_context})' if tile_context else 'image'} and extract all tabular data.
Return ONLY valid JSON in this exact format (no markdown, no explanation, no backticks):
{{"columns": ["col1", "col2", ...], "data": [["val1", "val2", ...], ...]}}

Rules:
{chr(10).join(specific_rules)}
- If no table is visible in the image, return: {{"columns": [], "data": []}}
"""

    image_url = image_base64 if image_base64.startswith("data:") else f"data:image/png;base64,{image_base64}"

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": image_url},
            },
        ]
    )

    try:
        response = llm.invoke([message])
        text = response.content.strip()

        # Clean markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        if "columns" not in result or "data" not in result:
            return {"error": "Invalid response format from vision model"}

        # Post-processing: deterministic dot to A replacement
        if dot_to_a and isinstance(result.get("data"), list):
            for row in result["data"]:
                if isinstance(row, list):
                    for idx, cell in enumerate(row):
                        if str(cell).strip() in [".", "•", "·", "-"]:
                            row[idx] = "A"

        return result
    except json.JSONDecodeError:
        return {"error": f"Failed to parse vision model response as JSON: {text[:200]}"}
    except Exception as e:
        return {"error": str(e)}
