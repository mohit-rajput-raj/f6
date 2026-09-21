"""
OCR Tool — Extracts structured table data from images using a vision LLM.
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
) -> dict:
    """
    Extract structured table data from a base64 image using vision LLM.
    Returns { columns: string[], data: string[][] }.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return {"error": "GEMINI_API_KEY is not configured on server or in request"}

    llm = ChatGoogleGenerativeAI(
        model=model_name or "gemini-2.5-flash",
        google_api_key=key,
        temperature=0,
    )

    prompt = """Analyze this image and extract all tabular data.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"columns": ["col1", "col2", ...], "data": [["val1", "val2", ...], ...]}

Rules:
- Extract ALL rows and columns visible in the image
- Use the header row for column names
- If no clear header, use Column_1, Column_2, etc.
- If any cell is empty, blank, unclear, or difficult to predict (or its correctness confidence is lower than 80 percent), leave it as "" (empty string) so the user can manually fill or edit it
- Handle merged cells by repeating the value
- Clean up OCR artifacts (extra spaces, broken characters)
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

    try:
        result = json.loads(text)
        if "columns" not in result or "data" not in result:
            return {"error": "Invalid response format from vision model"}
        return result
    except json.JSONDecodeError:
        return {"error": f"Failed to parse vision model response: {text[:200]}"}
