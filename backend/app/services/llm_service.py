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
from app.services.pre_filter import check_message_tripwire


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
    # Yashika: Check high-risk keywords

    triggered, matched_words, language = check_message_tripwire(user_message)
    matched_words_lower = [w.lower() for w in matched_words]
    
    if triggered:
        # Check high-severity self-harm tripwires
        self_harm_keywords = [
            "suicide", "kill myself", "marna chahta", "jaan de dunga", "jaan de dungi",
            "want to die", "hurt myself", "cut my wrist", "slit my wrist", "end my life",
            "overdose", "suicide karna", "apne aap ko nuksan", "marna chahti",
            "mar jaunga", "mar jaungi", "zindagi khatam", "zehar kha", "marna", "jaan de"
        ]
        if any(any(k in w for k in self_harm_keywords) for w in matched_words_lower) or any(k in text for k in ["suicide", "kill myself", "marna chahta", "jaan de"]):
            return AIResponse(
                reply="Main tumhari baat sun raha hoon. Please kisi trusted adult ya KIRAN Helpline (1800-599-0019) se baat karo. You are not alone.",
                severity="high",
                category="self_harm",
                rationale=f"Keyword Tripwire detected self-harm: {matched_words}",
            )
    
        # Check high-severity abuse tripwires (triggers Rule §3.4a bypass)
        abuse_keywords = [
            "abuse", "hit me", "beat me", "galat chhua", "ghar wale marte",
            "domestic violence", "hitting me", "beating me", "sexual assault",
            "molested", "touched me", "papa maarte", "mummy maarti", "mummy papa marte",
            "bhaiya maarte", "gali dete", "pitai", "roz maarte", "pitte hai",
            "galat touch", "marte hai", "beating"
        ]
        if any(any(k in w for k in abuse_keywords) for w in matched_words_lower) or any(k in text for k in ["abuse", "marte hai", "beating", "hit me"]):
            return AIResponse(
                reply="Tumhari safety humare liye sabse important hai. Aapki privacy protected hai aur personal contacts ko contact nahi kiya jayega. Please Childline 1098 ya KIRAN 1800-599-0019 se help lo.",
                severity="high",
                category="abuse",
                rationale=f"Keyword Tripwire detected abuse: {matched_words}",
            )

        # Matched other tripwires (distress terms)
        return AIResponse(
            reply="Main yahan hoon tumhari baat sunne ke liye. Tension mat lo, baat karo.",
            severity="medium",
            category="distress",
            rationale=f"Keyword Tripwire detected distress: {matched_words}",
        )

    # Basic keyword triage fallback so safety routing is always testable
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

    # Default: normal conversational response with Hinglish mirroring (PRD §3.6)
    if language in ("hinglish", "code-switched") or any(w in text for w in ["theek", "hai", "yaar", "kya", "batao", "hoon", "nahi", "kaise"]):
        reply_text = (
            "I understand yaar. Sab theek ho jayega, tension mat lo. "
            "Take a deep breath — main yahan hoon sunne ke liye. "
            "Tell me more about what's on your mind."
        )
    else:
        reply_text = (
            "I hear you and I am here for you. "
            "Take a deep breath — share whatever is on your mind."
        )

    return AIResponse(
        reply=reply_text,
        severity="none",
        category="none",
        rationale="No risk signals detected. Normal conversational response with Hinglish mirroring.",
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
