# YUVAA Saarthi — Chat Orchestration Service
# Reference: PRD §3.2, §3.3, §3.4, §3.4a & Execution Plan Phase 2
#
# This service sits between the FastAPI route and the AI/database layer.
# The route stays thin (auth + request parsing + response shaping).
# All business logic — session validation, message persistence, AI call — lives here.
#
# Data flow:
#   chat router
#     → validate_session_ownership()   [security: user owns this session]
#     → save_message()                 [persist user message]
#     → llm_service.get_ai_response()  [AI pipeline / mock stub]
#     → save_message()                 [persist assistant response]
#     → return ChatServiceResult

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from dataclasses import dataclass
from fastapi import HTTPException, status

from app.config import settings
from app.supabase_client import supabase
from app.services.llm_service import get_ai_response, AIResponse
from app.schemas import MessageHistoryItem


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Return type for the main send_chat_message() function
# ---------------------------------------------------------------------------

@dataclass
class ChatServiceResult:
    reply: str
    severity: str
    category: str
    rationale: str
    action_taken: str


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def create_session(user_id: str) -> dict:
    """
    Insert a new row into the sessions table and return it.
    Called by POST /sessions.
    """
    try:
        result = (
            supabase.table("sessions")
            .insert({"user_id": user_id})
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session — no data returned from DB.",
            )
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_session error for user %s: %s", user_id, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "summary_snapshot": None,
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create session. Please try again.",
        )


def list_sessions(user_id: str) -> List[dict]:
    """
    Return all sessions belonging to user_id, newest first.
    Called by GET /sessions.
    """
    try:
        result = (
            supabase.table("sessions")
            .select("id, user_id, started_at, summary_snapshot")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error("list_sessions error for user %s: %s", user_id, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return []
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve sessions.",
        )


def validate_session_ownership(session_id: str, user_id: str) -> dict:
    """
    Fetch the session and confirm it belongs to the authenticated user.

    Security contract:
      - Always call this before reading or writing messages for a session.
      - Returns the session row if ownership is confirmed.
      - Raises HTTP 404 if session not found (don't leak existence to wrong users).
      - Raises HTTP 403 if session belongs to a different user.
    """
    try:
        result = (
            supabase.table("sessions")
            .select("id, user_id, summary_snapshot")
            .eq("id", session_id)
            .single()
            .execute()
        )
        session = result.data
    except Exception as e:
        logger.warning("validate_session_ownership lookup failed: %s", e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return {"id": session_id, "user_id": user_id, "summary_snapshot": None}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if str(session["user_id"]) != str(user_id):
        # Return 403 not 404 to make ownership violation explicit in logs
        logger.warning(
            "Ownership violation: user %s attempted to access session %s owned by %s",
            user_id, session_id, session["user_id"]
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    return session


# ---------------------------------------------------------------------------
# Message helpers
# ---------------------------------------------------------------------------

def save_message(
    session_id: str,
    sender: str,
    content: str,
    risk_tier: Optional[str] = None,
    risk_rationale: Optional[str] = None,
) -> dict:
    """
    Insert one message row into the messages table.
    sender must be one of: 'user', 'assistant', 'system' (matches DB CHECK constraint).
    """
    payload = {
        "session_id": session_id,
        "sender": sender,
        "content": content,
    }
    if risk_tier:
        payload["risk_tier"] = risk_tier
    if risk_rationale:
        payload["risk_rationale"] = risk_rationale

    try:
        result = supabase.table("messages").insert(payload).execute()
        if not result.data:
            raise Exception("No data returned from messages insert")
        return result.data[0]
    except Exception as e:
        logger.error("save_message error for session %s sender %s: %s", session_id, sender, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return {"id": str(uuid.uuid4()), **payload}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist message.",
        )


def get_message_history(session_id: str, user_id: str) -> List[dict]:
    """
    Return all messages for a session, oldest first.
    Validates session ownership before reading.
    Called by GET /chat/history/{session_id}.
    """
    # Ownership check — raises 403/404 if invalid
    validate_session_ownership(session_id, user_id)

    try:
        result = (
            supabase.table("messages")
            .select("id, sender, content, risk_tier, created_at")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error("get_message_history error for session %s: %s", session_id, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return []
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve chat history.",
        )


# ---------------------------------------------------------------------------
# Main chat orchestration
# ---------------------------------------------------------------------------

async def send_chat_message(
    session_id: str,
    user_id: str,
    message: str,
) -> ChatServiceResult:
    """
    Full chat turn: validate → save user msg → AI → save assistant msg → return.

    This is the main orchestration function called by POST /chat.

    Steps:
      1. Validate session ownership (security).
      2. Save the user's message to the messages table.
      3. Call the AI service abstraction (mock or real LangChain pipeline).
      4. Save the assistant's response to the messages table, including risk tier.
      5. Return a ChatServiceResult to the route.

    NOTE: Logging of risk_events (PRD §3.4) is a Phase 3 task (Khushal).
          The risk tier is stored on the message row now as a foundation.
    """
    # Step 1: Ownership check — raises 403/404 if invalid
    session = validate_session_ownership(session_id, user_id)
    rolling_summary = session.get("summary_snapshot")
    
    # Step 2: Persist the user's message
    save_message(
        session_id=session_id,
        sender="user",
        content=message,
    )

    # Step 3: Get AI response via the abstraction layer
    # → Mannat slots in her LangChain pipeline by updating llm_service.py
    ai_result: AIResponse = await get_ai_response(
        user_message=message,
        session_id=session_id,
        user_id=user_id,
        rolling_summary=rolling_summary,
    )

    # Step 4: Persist the assistant's response with risk metadata
    save_message(
        session_id=session_id,
        sender="assistant",
        content=ai_result.reply,
        risk_tier=ai_result.severity if ai_result.severity != "none" else None,
        risk_rationale=ai_result.rationale if ai_result.severity != "none" else None,
    )

    # Step 5: Determine action_taken for the response
    # Full risk_events table logging is Phase 3 (PRD §3.4 state machine).
    action_taken = _derive_action_taken(ai_result.severity, ai_result.category)

    return ChatServiceResult(
        reply=ai_result.reply,
        severity=ai_result.severity,
        category=ai_result.category,
        rationale=ai_result.rationale,
        action_taken=action_taken,
    )


def _derive_action_taken(severity: str, category: str) -> str:
    """
    Map risk classification to the action_taken_type DB enum string.
    Full escalation state machine (Twilio SMS + Bland AI calls) is Phase 3.
    For now, just return the correct enum value so the contract is established.
    """
    if severity == "high" and category == "abuse":
        return "routed_to_helpline"
    elif severity == "high":
        # Phase 3 will actually fire Twilio/Bland AI here
        return "logged_only"  # Will become "call_placed" / "sms_sent" in Phase 3
    elif severity == "medium":
        return "logged_only"
    else:
        return "logged_only"
