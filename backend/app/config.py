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

    # Telephony: Bland AI voice escalation (NOT Twilio)
    # All Bland AI integration tasks owned by Mannat
    bland_ai_key: Optional[str] = None

    # JWT Secret for signing custom session tokens (BUG-003 fix)
    # Generate a strong secret: python -c "import secrets; print(secrets.token_hex(32))"
    jwt_secret: str = "yuvaa-saarthi-default-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # Dev Bypass
    dev_bypass_auth: bool = False

    # Settings configurations to read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# ---------------------------------------------------------------------------
# Dynamic Circuit Breaker for Gemini Quota Management
# If Gemini returns HTTP 429, auto-failover to Groq Cloud immediately
# ---------------------------------------------------------------------------
import time

_GEMINI_COOLDOWN_UNTIL = 0.0

def is_gemini_available() -> bool:
    """Returns False if Gemini recently hit HTTP 429 quota limit and is cooling down."""
    global _GEMINI_COOLDOWN_UNTIL
    return time.time() > _GEMINI_COOLDOWN_UNTIL

def trip_gemini_cooldown(seconds: float = 60.0) -> None:
    """Trips cooldown timer so all subsequent calls route directly to Groq Cloud."""
    global _GEMINI_COOLDOWN_UNTIL
    _GEMINI_COOLDOWN_UNTIL = time.time() + seconds

