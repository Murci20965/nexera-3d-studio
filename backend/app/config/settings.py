import os
from dotenv import load_dotenv

# Load env from backend/ first, then fall back to project root
load_dotenv()
load_dotenv("../.env")

TRIPO_API_KEY: str = os.getenv("TRIPO_API_KEY", "")
TRIPO_MODEL_VERSION: str = os.getenv("TRIPO_MODEL_VERSION", "v3.1-20260211")
