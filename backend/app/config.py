# YUVAA Saarthi FastAPI Settings Config Module
# Reference: PRD §4 (Recommended Tech Stack) & Execution Plan

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Supabase Setup
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder-key"
    
    # LLM Settings
    llm_api_key: Optional[str] = None
    
    # Telephony Integrations
    bland_ai_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    # Settings configurations to read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
