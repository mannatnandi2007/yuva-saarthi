# Yuva Saarthi — Health Router
# Phase 6: Operational health endpoints for LLM provider monitoring.
# Reference: PRD §4 (Tech Stack) & Phase 6 task list.

import os
import logging

from fastapi import APIRouter, status

from app.config import settings, is_gemini_available, get_gemini_cooldown_remaining

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PLACEHOLDER_PREFIXES = ("your-", "placeholder")


def _key_is_configured(key) -> bool:
    """
    Return True only when key is a non-empty, non-placeholder string.
    Mirrors the same guard used in generate_llm_reply() in llm_service.py
    so the health endpoint's view of 'configured' is always consistent.
    """
    if not key:
        return False
    return not any(key.startswith(prefix) for prefix in _PLACEHOLDER_PREFIXES)


# ---------------------------------------------------------------------------
# GET /health/llm
# ---------------------------------------------------------------------------

@router.get(
    "/llm",
    status_code=status.HTTP_200_OK,
    summary="LLM provider health — Gemini and Groq status",
    description=(
        "Returns the live operational status of the Gemini and Groq LLM providers "
        "without exposing any API keys or secrets. "
        "No authentication required — intended for internal monitoring / ops."
    ),
)
def health_llm():
    """
    Return provider availability summary for operational monitoring.

    Fields:
      active_provider  — which provider would currently serve a request
                         ("gemini" | "groq" | "local_fallback")
      gemini.status    — "ok" | "cooldown" | "unconfigured"
      gemini.available — True when Gemini is configured AND not in cooldown
      gemini.cooldown_remaining_s — seconds left on circuit-breaker (0 when clear)
      groq.status      — "ok" | "unconfigured"
      groq.available   — True when Groq key is configured

    No API keys, key fingerprints, or internal model names are returned.
    """
    # -- Gemini ---------------------------------------------------------------
    gemini_key = (
        settings.gemini_api_key
        or settings.llm_api_key
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("LLM_API_KEY")
    )
    gemini_configured = _key_is_configured(gemini_key)
    gemini_available = is_gemini_available()
    cooldown_remaining = get_gemini_cooldown_remaining()

    if gemini_configured and gemini_available:
        gemini_status = "ok"
    elif gemini_configured and not gemini_available:
        gemini_status = "cooldown"
    else:
        gemini_status = "unconfigured"

    # -- Groq -----------------------------------------------------------------
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    groq_configured = _key_is_configured(groq_key)
    groq_status = "ok" if groq_configured else "unconfigured"

    # -- Active provider ------------------------------------------------------
    if gemini_status == "ok":
        active_provider = "gemini"
    elif groq_status == "ok":
        active_provider = "groq"
    else:
        active_provider = "local_fallback"

    logger.debug(
        "[HEALTH/LLM] active_provider=%s gemini=%s groq=%s cooldown_remaining=%.1fs",
        active_provider, gemini_status, groq_status, cooldown_remaining,
    )

    return {
        "active_provider": active_provider,
        "gemini": {
            "status": gemini_status,
            "available": gemini_configured and gemini_available,
            "cooldown_remaining_s": round(cooldown_remaining, 1),
        },
        "groq": {
            "status": groq_status,
            "available": groq_configured,
        },
    }
