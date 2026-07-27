import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from langchain_core.tools import tool
from PIL import Image
import io

load_dotenv()

# Setup - using GEMINI_API_KEY from .env
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def perform_ocr(image_bytes: bytes, mime_type: str) -> str:
    # Use google.genai.types.Part for bytes so we don't need to save to disk or use PIL
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    
    # We use gemini-2.5-flash as it's the current flash version
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Extract the all rows and columns in the form of JSON. if any cell is empty or difficult to pridict or its correctness is lower then 80 percent then  leave it null or NA",
            image_part
        ],
        config={
            # use json for the output type for easy ETL
            "response_mime_type": "application/json"
        }
    )
    
    return response.text

@tool
def read_document_with_tesseract(image_bytes: bytes) -> str:
    """Read and extract raw text from an image using Tesseract OCR."""
    import pytesseract
    image = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(image)
    return text
