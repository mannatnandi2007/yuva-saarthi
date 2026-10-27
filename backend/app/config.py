# Yuva Saarthi FastAPI Settings Config Module
# Reference: PRD §4 (Recommended Tech Stack) & Execution Plan

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

import warnings
warnings.filterwarnings("ignore", message=".*unauthenticated requests to the HF Hub.*")

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

    # LLM Model Configuration (Phase 2)
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str = "gemini-2.5-flash"
    groq_model: str = "qwen/qwen3.8-27b"

    # Optional Third Provider (OpenAI-compatible)
    enable_third_provider: bool = False
    openai_compat_url: Optional[str] = None
    openai_compat_key: Optional[str] = None
    openai_compat_model: Optional[str] = None

    # Telephony: Bland AI voice escalation (NOT Twilio)
    # All Bland AI integration tasks owned by Mannat
    bland_ai_key: Optional[str] = None

    # JWT Secret for signing custom session tokens (BUG-003 fix)
    # Generate a strong secret: python -c "import secrets; print(secrets.token_hex(32))"
    jwt_secret: str = "yuva-saarthi-default-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # Dev Bypass
    dev_bypass_auth: bool = False

    # Demo Routes Gating (Phase 1)
    enable_demo_routes: bool = False

    # Phase 5: Multi-Channel Notification Settings
    notify_channels: str = ""  # Comma-separated: sms_fast2sms,telegram,email
    notify_dry_run: bool = True  # Default true in dev — logs instead of sending
    fast2sms_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    email_api_key: Optional[str] = None
    email_from: str = "alerts@yuvasaarthi.in"

    # Phase 8: Security, Rate Limiting & Environment Config
    environment: str = "development"  # "development", "staging", "production"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000,capacitor://localhost,https://localhost"
    rate_limit_per_minute: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def validate_production_security(self):
        """Phase 8: Security checks for production environments."""
        if self.environment.lower() == "production":
            default_secrets = [
                "yuva-saarthi-default-dev-secret-change-in-production",
                "yuvaa-secret-key-change-in-production-2026",
                "secret",
                "changeme",
            ]
            if not self.jwt_secret or self.jwt_secret in default_secrets or len(self.jwt_secret) < 32:
                raise ValueError(
                    "CRITICAL: Production deployment detected with insecure or default JWT_SECRET. "
                    "A secure, randomly generated 32+ character JWT_SECRET is required."
                )
            if self.dev_bypass_auth:
                raise ValueError("CRITICAL: DEV_BYPASS_AUTH must be False in production.")

    # Settings configurations to read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.validate_production_security()

# ---------------------------------------------------------------------------
# Sane Circuit Breaker for LLM Providers (Phase 2)
# Handles HTTP 429 (immediate trip with Retry-After or 45s cooldown)
# and repeated 5xx/connection failures (3+ consecutive triggers cooldown).
# Supports half-open probe recovery.
# ---------------------------------------------------------------------------
import time
import threading

class ProviderCircuitBreaker:
    """
    Thread-safe circuit breaker with closed, open, and half-open states.
    - Closed: provider is healthy, requests flow normally.
    - Open: provider tripped on 429 or 3 consecutive 5xx/timeouts. Requests blocked.
    - Half-open: cooldown expired, allows exactly 1 trial probe request.
    """
    def __init__(self, name: str, failure_threshold: int = 3, default_cooldown: float = 45.0):
        self.name = name
        self.failure_threshold = failure_threshold
        self.default_cooldown = default_cooldown
        self._consecutive_failures = 0
        self._cooldown_until = 0.0
        self._half_open_probe_in_flight = False
        self._lock = threading.Lock()

    def is_available(self) -> bool:
        """Check if provider is available or ready for a half-open probe."""
        with self._lock:
            now = time.time()
            if now > self._cooldown_until:
                if self._consecutive_failures >= self.failure_threshold:
                    # Cooldown has passed: enter half-open state for 1 probe
                    if not self._half_open_probe_in_flight:
                        self._half_open_probe_in_flight = True
                        return True
                    return False
                return True
            return False

    def record_success(self) -> None:
        """Reset failures and close breaker on successful request."""
        with self._lock:
            self._consecutive_failures = 0
            self._cooldown_until = 0.0
            self._half_open_probe_in_flight = False

    def record_failure(self, status_code: Optional[int] = None, retry_after: Optional[float] = None) -> None:
        """
        Record failure. Trips immediately on HTTP 429.
        Trips on consecutive 5xx/timeout failures reaching threshold.
        """
        with self._lock:
            self._consecutive_failures += 1
            self._half_open_probe_in_flight = False
            now = time.time()

            if status_code == 429:
                cooldown = retry_after if (retry_after and retry_after > 0) else self.default_cooldown
                self._cooldown_until = now + cooldown
            elif self._consecutive_failures >= self.failure_threshold:
                self._cooldown_until = now + self.default_cooldown

    def trip(self, seconds: Optional[float] = None) -> None:
        """Manually trip circuit breaker for a specified duration."""
        with self._lock:
            cooldown = seconds if seconds is not None else self.default_cooldown
            self._consecutive_failures = max(self._consecutive_failures, self.failure_threshold)
            self._cooldown_until = time.time() + cooldown
            self._half_open_probe_in_flight = False

    def cooldown_remaining(self) -> float:
        """Seconds remaining on cooldown. 0.0 if available."""
        with self._lock:
            return max(0.0, self._cooldown_until - time.time())


gemini_breaker = ProviderCircuitBreaker("gemini", failure_threshold=3, default_cooldown=45.0)
groq_breaker = ProviderCircuitBreaker("groq", failure_threshold=3, default_cooldown=45.0)
third_provider_breaker = ProviderCircuitBreaker("third_party", failure_threshold=3, default_cooldown=45.0)


# Backward compatibility wrappers for existing callers & tests
def is_gemini_available() -> bool:
    return gemini_breaker.is_available()

def trip_gemini_cooldown(seconds: float = 45.0) -> None:
    gemini_breaker.trip(seconds)

def get_gemini_cooldown_remaining() -> float:
    return gemini_breaker.cooldown_remaining()

def is_groq_available() -> bool:
    return groq_breaker.is_available()

def trip_groq_cooldown(seconds: float = 45.0) -> None:
    groq_breaker.trip(seconds)

def get_groq_cooldown_remaining() -> float:
    return groq_breaker.cooldown_remaining()


