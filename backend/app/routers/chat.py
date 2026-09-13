# YUVAA Saarthi — Chat Router
# Reference: PRD §3.2 (Cross-session memory) & §3.6 (Hinglish mirroring) & Execution Plan Phase 2
#
# Endpoints (Phase 2 — new):
#   POST   /sessions                     — create a new chat session
#   GET    /sessions                     — list all sessions for current user
#   POST   /chat                         — send message, get AI response
#   GET    /chat/history/{session_id}    — fetch message history for a session
#
# Legacy stubs (preserved for teammates' reference):
#   POST   /chat/session/start           — original stub (now superseded)
#   POST   /chat/message/send            — original stub (now superseded)

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime

from app.dependencies import get_current_user, AuthenticatedUser
from app.schemas import (
    ChatRequest,
    ChatResponse,
    RiskClassificationResponse,
    SessionCreateResponse,
    SessionListItem,
    MessageHistoryItem,
    DeleteSessionResponse,
    BatchDeleteRequest,
)
from app.services.chat_service import (
    create_session,
    list_sessions,
    send_chat_message,
    get_message_history,
    delete_session,
    delete_all_sessions,
    delete_sessions_batch,
)

# Legacy stub imports (kept so old pydantic models still work)
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


# ===========================================================================
# SESSION ENDPOINTS
# ===========================================================================

@router.post(
    "/sessions",
    response_model=SessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session for the authenticated user",
)
def start_session(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new row in the sessions table owned by the authenticated user.

    No request body required — the owner is derived from the token.

    Returns the new session's UUID, which the frontend must include in all
    subsequent POST /chat calls as `session_id`.
    """
    row = create_session(user_id=current_user.user_id)
    return SessionCreateResponse(
        session_id=str(row["id"]),
        user_id=str(row["user_id"]),
        started_at=row["started_at"],
    )


@router.get(
    "/sessions",
    response_model=List[SessionListItem],
    status_code=status.HTTP_200_OK,
    summary="List all sessions for the authenticated user",
)
def get_sessions(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return all chat sessions belonging to the current user, newest first.

    Only the authenticated user's own sessions are returned — no cross-user
    leakage is possible since filtering is always by user_id from the token.
    """
    rows = list_sessions(user_id=current_user.user_id)
    return [
        SessionListItem(
            session_id=str(r["id"]),
            started_at=r["started_at"],
            summary_snapshot=r.get("summary_snapshot"),
            heading=r.get("heading"),
        )
        for r in rows
    ]


@router.delete(
    "/sessions/{session_id}",
    response_model=DeleteSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a single chat session and its history",
)
def remove_session(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a specific conversation session and all its messages.
    """
    delete_session(session_id=session_id, user_id=current_user.user_id)
    return DeleteSessionResponse(
        success=True,
        session_id=session_id,
        deleted_count=1,
        message="Session deleted successfully",
    )


@router.delete(
    "/chat/history/{session_id}",
    response_model=DeleteSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a single chat session (alias)",
)
def remove_chat_history(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Alias for deleting a chat session."""
    delete_session(session_id=session_id, user_id=current_user.user_id)
    return DeleteSessionResponse(
        success=True,
        session_id=session_id,
        deleted_count=1,
        message="Session deleted successfully",
    )


@router.delete(
    "/sessions",
    response_model=DeleteSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete all chat sessions and history for current user",
)
def remove_all_sessions(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Wipe all chat history and sessions for the authenticated user.
    """
    count = delete_all_sessions(user_id=current_user.user_id)
    return DeleteSessionResponse(
        success=True,
        session_id=None,
        deleted_count=count,
        message=f"Deleted {count} sessions successfully",
    )


@router.post(
    "/chat/sessions/batch-delete",
    response_model=DeleteSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete multiple chat sessions in a single request",
)
def batch_delete_sessions(
    payload: BatchDeleteRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Batch-delete a list of sessions belonging to the authenticated user.

    Behaviour:
      - Ownership is validated for every supplied session_id before any
        deletion begins. A 403 is raised immediately if any ID belongs to
        another user; a 404 is raised if any ID does not exist.
      - No sessions are deleted if any ownership check fails (all-or-nothing).
      - Duplicate IDs in the request body are silently deduplicated.
      - _IN_MEMORY_SUMMARIES cache is cleared for every deleted session.

    The user_id is ALWAYS derived from the Bearer token, never from the
    request body, so cross-user deletion is structurally impossible.
    """
    deleted = delete_sessions_batch(
        session_ids=payload.session_ids,
        user_id=current_user.user_id,
    )
    return DeleteSessionResponse(
        success=True,
        session_id=None,
        deleted_count=deleted,
        message=f"Batch deleted {deleted} session(s) successfully",
    )


# ===========================================================================
# CHAT ENDPOINT
# ===========================================================================

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message and receive an AI response",
)
async def chat(
    payload: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Main chat endpoint.

    Flow:
      1. Authenticate user from Bearer token (enforced by dependency).
      2. Validate session belongs to this user (chat_service).
      3. Save user message to messages table (chat_service).
      4. Get AI response via llm_service abstraction.
      5. Save assistant response with risk tier to messages table (chat_service).
      6. Return clean JSON response with heading.

    The `user_id` is NEVER read from the request body — always from the token.
    """
    result = await send_chat_message(
        session_id=payload.session_id,
        user_id=current_user.user_id,
        message=payload.message,
    )

    return ChatResponse(
        reply=result.reply,
        risk_classification=RiskClassificationResponse(
            severity=result.severity,
            category=result.category,
            rationale=result.rationale,
        ),
        action_taken=result.action_taken,
        heading=result.heading,
        session_id=payload.session_id,
        llm_provider=result.provider,
    )


# ===========================================================================
# CHAT HISTORY ENDPOINT
# ===========================================================================

@router.get(
    "/chat/history/{session_id}",
    response_model=List[MessageHistoryItem],
    status_code=status.HTTP_200_OK,
    summary="Get message history for a session",
)
def chat_history(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return all messages for the given session, oldest first.

    Ownership is validated before any data is returned:
      - 404 if session doesn't exist.
      - 403 if session belongs to a different user.
    """
    rows = get_message_history(
        session_id=session_id,
        user_id=current_user.user_id,
    )
    return [
        MessageHistoryItem(
            id=str(r["id"]),
            sender=r["sender"],
            content=r["content"],
            risk_tier=r.get("risk_tier"),
            created_at=r["created_at"],
        )
        for r in rows
    ]


# ===========================================================================
# LEGACY STUBS — preserved for reference, superseded by endpoints above
# ===========================================================================

class _LegacyChatMessagePayload(BaseModel):
    session_id: str
    content: str


class _LegacySessionStartPayload(BaseModel):
    user_id: str


@router.post(
    "/chat/session/start",
    status_code=status.HTTP_200_OK,
    deprecated=True,
    summary="[DEPRECATED] Use POST /sessions instead",
    include_in_schema=True,
)
async def legacy_start_session(payload: _LegacySessionStartPayload):
    """
    DEPRECATED — original Day 1 stub.
    Use POST /sessions (authenticated) instead.
    TODO: Remove once frontend is updated.
    """
    return {
        "session_id": "dummy-session-uuid",
        "rolling_summary": "User is feeling thoda anxious regarding upcoming exams but coping well.",
        "recent_messages": [
            {"sender": "user", "content": "hi companion"},
            {"sender": "assistant", "content": "Hello! standard register mirror response"},
        ],
        "_note": "DEPRECATED stub. Use POST /sessions with Authorization header.",
    }


@router.post(
    "/chat/message/send",
    status_code=status.HTTP_200_OK,
    deprecated=True,
    summary="[DEPRECATED] Use POST /chat instead",
    include_in_schema=True,
)
async def legacy_send_message(payload: _LegacyChatMessagePayload):
    """
    DEPRECATED — original Day 1 stub.
    Use POST /chat (authenticated) instead.
    TODO: Remove once frontend is updated.

    Full pipeline: pre-filter → classify → retrieve (RAG) → respond.
    (PRD §3.2, §3.3, §3.4, §3.6)
    """
    return {
        "reply": "I understand yaar, it gets overwhelming. Batao, what's on your mind?",
        "risk_classification": {
            "severity": "none",
            "category": "none",
            "rationale": "Filtered. Chatting normally.",
        },
        "action_taken": "logged_only",
        "_note": "DEPRECATED stub. Use POST /chat with Authorization header.",
    }
