import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Load environment variables from .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

def get_llm():
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY or GOOGLE_API_KEY not found in environment. Heuristic fallback will be used.")
        return None
    
    try:
        # Using gemini-1.5-flash which is standard and fast for schema mapping
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=GEMINI_API_KEY,
            temperature=0.0
        )
    except Exception as e:
        print(f"Error initializing ChatGoogleGenerativeAI: {e}")
        return None
