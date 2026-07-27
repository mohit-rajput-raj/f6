"""
OCR Tool — Extracts structured table data from images using a vision LLM.
"""

import json
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


@tool
def extract_table_from_image(
    image_base64: str,
    api_key: str,
    model_name: str = "gemini-2.0-flash",
) -> dict:
    """
    Extract structured table data from a base64 image using vision LLM.
    Returns { columns: string[], data: string[][] }.
    """
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0,
    )

    prompt = """Analyze this image and extract all tabular data.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"columns": ["col1", "col2", ...], "data": [["val1", "val2", ...], ...]}

Rules:
- Extract ALL rows and columns visible in the image
- Use the header row for column names
- If no clear header, use Column_1, Column_2, etc.
- Handle merged cells by repeating the value
- Clean up OCR artifacts (extra spaces, broken characters)
"""

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": image_base64},
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
