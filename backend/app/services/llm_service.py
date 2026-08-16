# YUVAA Saarthi — LLM Service Abstraction
# Reference: PRD §3.2, §3.6 (Hinglish mirroring) & Execution Plan Phase 2
#
# ============================================================================
# INTEGRATION POINT FOR MANNAT
# ============================================================================
# This file is the ONLY place where the LangChain pipeline gets wired in.
# The route and chat_service.py never import LangChain directly — they always
# call get_ai_response() from this module.
#
# To integrate the real LLM pipeline:
#   1. Implement the real logic inside get_ai_response() below.
#   2. Replace the MOCK STUB section with your LangChain chain call.
#   3. The function signature must stay the same.
#   4. Return an AIResponse object.
#
# The mock stub is clearly labelled and will raise a warning in logs when active.
# ============================================================================

import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response type returned by the LLM service
# ---------------------------------------------------------------------------

@dataclass
class AIResponse:
    """
    Structured response from the AI pipeline.
    Mirrors the shape expected by chat_service.py and the POST /chat response.
    """
    reply: str
    severity: str    # none | low | medium | high
    category: str    # none | self_harm | abuse | distress
    rationale: str


# ---------------------------------------------------------------------------
# Public interface — this is what chat_service.py calls
# ---------------------------------------------------------------------------

async def get_ai_response(
    user_message: str,
    session_id: str,
    user_id: str,
    rolling_summary: Optional[str] = None,
) -> AIResponse:
    """
    Request an AI response for the given user message.

    Args:
        user_message:    The raw text from the user.
        session_id:      The chat session UUID (for context lookup).
        user_id:         The authenticated user's UUID (for safety routing).
        rolling_summary: Optional prior session summary string (PRD §3.2).
                         Mannat's pipeline will use this as context.

    Returns:
        AIResponse with the reply text and risk classification.

    Current status:
        MOCK STUB — returns a deterministic placeholder response.
        Replace the body of _mock_response() with the real LangChain pipeline.
    """
    # When the real implementation is ready, swap _mock_response for _real_response
    return await _mock_response(user_message, session_id, user_id, rolling_summary)


# ---------------------------------------------------------------------------
# MOCK STUB — Replace this when Mannat's pipeline is ready
# ---------------------------------------------------------------------------

async def _mock_response(
    user_message: str,
    session_id: str,
    user_id: str,
    rolling_summary: Optional[str],
) -> AIResponse:
    """
    ⚠️  MOCK STUB — NOT the real AI implementation.

    This stub exists so the entire API can be tested end-to-end (auth, session
    ownership, DB persistence, HTTP contract) before Mannat's LangChain pipeline
    is connected.

    It does a minimal keyword scan so the safety flow is exercisable even in mock
    mode. Replace this function body (or swap the call in get_ai_response) with
    the real pipeline.

    TODO (Mannat): Replace _mock_response with your LangChain chain that runs:
        classify → retrieve (RAG) → respond (Hinglish mirroring)
    """
    logger.warning(
        "[LLM SERVICE] ⚠️  MOCK STUB active — real AI pipeline not connected. "
        "session_id=%s user_id=%s", session_id, user_id
    )

    text = user_message.lower()

    # Basic keyword triage so safety routing is testable end-to-end
    if any(kw in text for kw in ["suicide", "kill myself", "marna chahta", "jaan de"]):
        return AIResponse(
            reply=(
                "I'm so sorry you're feeling this way. Please know you are not alone. "
                "Please reach out to KIRAN Helpline: 1800-599-0019 (free, 24/7)."
            ),
            severity="high",
            category="self_harm",
            rationale="[MOCK] Self-harm keyword detected in message.",
        )

    if any(kw in text for kw in ["abuse", "marte hai", "beating", "hit me"]):
        return AIResponse(
            reply=(
                "I hear you, and your safety matters most. "
                "Please contact Childline 1098 or KIRAN 1800-599-0019 for confidential support. "
                "Main yahan hoon aapke saath."
            ),
            severity="high",
            category="abuse",
            rationale="[MOCK] Abuse keyword detected in message.",
        )

    # Default: normal conversational response
    return AIResponse(
        reply=(
            "I understand yaar. Sometimes things can feel overwhelming. "
            "Take a deep breath — main yahan hoon sunne ke liye. "
            "Tell me more about what's on your mind."
        ),
        severity="none",
        category="none",
        rationale="[MOCK] No risk signals detected. Normal conversational response.",
    )


# ---------------------------------------------------------------------------
# REAL IMPLEMENTATION PLACEHOLDER — Mannat fills this in
# ---------------------------------------------------------------------------

async def _real_response(
    user_message: str,
    session_id: str,
    user_id: str,
    rolling_summary: Optional[str],
) -> AIResponse:
    """
    TODO (Mannat - Phase 3): Wire in the LangChain sequential pipeline here.

    Expected flow (PRD §3.3, §3.6):
        1. Run app/services/pre_filter.py → check_message_tripwire(user_message)
        2. Build prompt with rolling_summary context (PRD §3.2)
        3. Call LangChain classify chain → RiskClassificationSchema
        4. Fetch RAG context from pgvector (app/services/rag.py when ready)
        5. Call LangChain reply chain with Hinglish mirroring system prompt
        6. Return AIResponse with real reply + classification

    To activate: change get_ai_response() above to call _real_response().
    """
    raise NotImplementedError("Real LLM pipeline not yet implemented")
