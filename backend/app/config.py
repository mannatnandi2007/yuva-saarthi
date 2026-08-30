# YUVAA Saarthi FastAPI Settings Config Module
# Reference: PRD §4 (Recommended Tech Stack) & Execution Plan

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    # Supabase Setup
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder-key"
    
    # LLM Settings (Primary: Gemini, Auto-fallback: Groq Cloud)
    llm_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    
    # Telephony Integrations (Bland AI Voice Escalation)
    bland_ai_key: Optional[str] = None

    # Dev Bypass
    dev_bypass_auth: bool = False

    # Settings configurations to read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
