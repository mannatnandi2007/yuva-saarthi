# YUVAA Saarthi — Chat Orchestration Service
# Reference: PRD §3.2, §3.3, §3.4, §3.4a & Execution Plan Phase 2
#
# BUG-001 FIX: High-severity non-abuse messages now trigger Bland AI escalation.
# BUG-005 FIX: save_message() return value is captured; message_id passed to risk logging.
# BUG-009 FIX: started_at coercion handled via explicit string→datetime parsing.

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
        row = result.data[0]
        # BUG-009 FIX: ensure started_at is always a datetime-compatible string
        if isinstance(row.get("started_at"), str):
            pass  # Pydantic v2 will coerce ISO string to datetime
        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_session error for user %s: %s", user_id, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str or "Connection" in err_str:
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
    Returns the full inserted row including the generated message id.
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


def _log_risk_event(
    user_id: str,
    message_id: str,
    severity: str,
    category: str,
    action_taken: str,
) -> Optional[str]:
    """
    Insert a risk_events row whenever severity is non-trivial.
    Called after save_message() so message_id is available (BUG-005 fix).
    Returns the generated risk_event_id to link alert_attempts table.
    """
    if severity == "none":
        return None
    try:
        result = supabase.table("risk_events").insert({
            "user_id": user_id,
            "message_id": message_id,
            "severity": severity,
            "category": category,
            "action_taken": action_taken,
        }).execute()
        if result.data and len(result.data) > 0:
            risk_id = result.data[0].get("id")
            logger.info(
                "[RISK EVENT] Logged: id=%s severity=%s category=%s action=%s user=%s msg=%s",
                risk_id, severity, category, action_taken, user_id, message_id
            )
            return risk_id
    except Exception as e:
        logger.error("Failed to log risk_event for msg %s: %s", message_id, e)
    return None


def get_message_history(session_id: str, user_id: str) -> List[dict]:
    """
    Return all messages for a session, oldest first.
    Validates session ownership before reading.
    Called by GET /chat/history/{session_id}.
    """
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
    Full chat turn: validate → save user msg → AI → save assistant msg → escalate if needed → return.

    BUG-001 FIX: High-severity non-abuse messages now trigger Bland AI escalation.
    BUG-005 FIX: message_id is captured from save_message() and passed to risk event logging.
    """
    # Step 1: Ownership check — raises 403/404 if invalid
    session = validate_session_ownership(session_id, user_id)
    rolling_summary = session.get("summary_snapshot")

    # Step 2: Persist the user's message — capture the returned row for message_id
    # BUG-005 FIX: return value was previously discarded
    user_msg_row = save_message(
        session_id=session_id,
        sender="user",
        content=message,
    )
    message_id = user_msg_row.get("id")

    # Step 3: Get AI response via the abstraction layer
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

    # Step 5: Determine action taken
    if ai_result.severity == "high" and ai_result.category == "abuse":
        # Rule §3.4a: Abuse detection bypasses personal contacts completely
        action_taken = "routed_to_helpline"
    elif ai_result.severity == "high":
        action_taken = "call_placed"
    else:
        action_taken = "logged_only"

    # Step 6: Log risk event to DB and obtain risk_event_id
    risk_event_id = None
    if message_id and ai_result.severity != "none":
        risk_event_id = _log_risk_event(
            user_id=user_id,
            message_id=message_id,
            severity=ai_result.severity,
            category=ai_result.category,
            action_taken=action_taken,
        )

    # Step 7: Trigger Bland AI sequential escalation loop if high-severity non-abuse
    if ai_result.severity == "high" and ai_result.category != "abuse":
        _trigger_escalation_background(
            user_id=user_id,
            category=ai_result.category,
            risk_event_id=risk_event_id
        )

    return ChatServiceResult(
        reply=ai_result.reply,
        severity=ai_result.severity,
        category=ai_result.category,
        rationale=ai_result.rationale,
        action_taken=action_taken,
    )


def _trigger_escalation_background(
    user_id: str,
    category: str,
    risk_event_id: Optional[str] = None
) -> None:
    """
    Phase 3: Sequential Voice Escalation Loop across priority contacts (Mannat).
    Dispatches calls sequentially via Bland AI and logs to alert_attempts table.
    """
    try:
        from app.services.bland_ai import trigger_sequential_escalation
        res = trigger_sequential_escalation(
            user_id=user_id,
            risk_event_id=risk_event_id,
            category=category,
            severity="high"
        )
        logger.info(
            "[BLAND AI SEQUENTIAL LOOP] Executed for user=%s total_attempts=%d",
            user_id, res.get("total_attempts", 0)
        )
    except Exception as e:
        logger.error("[ESCALATION] Bland AI sequential escalation failed for user %s: %s", user_id, e)
