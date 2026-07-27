import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = "UNIXL AI Server"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    NODE_SERVER_URL: str = os.getenv("NODE_SERVER_URL", "http://localhost:3000")

settings = Settings()
