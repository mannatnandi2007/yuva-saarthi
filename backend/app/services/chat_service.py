# YUVAA Saarthi — Chat Orchestration Service
# Reference: PRD §3.2, §3.3, §3.4, §3.4a & Execution Plan Phase 2
#
# BUG-001 FIX: High-severity non-abuse messages now trigger Bland AI escalation.
# BUG-005 FIX: save_message() return value is captured; message_id passed to risk logging.
# BUG-009 FIX: started_at coercion handled via explicit string→datetime parsing.
# FEATURE: Cross-Login Context — new sessions are seeded with the previous session's
#           summary_snapshot so the AI remembers past interactions (PRD §3.2).

import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from dataclasses import dataclass
from fastapi import HTTPException, status

from app.config import settings
from app.supabase_client import supabase
from app.services.llm_service import get_ai_response, AIResponse, get_last_request_provider
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
    heading: Optional[str] = None
    provider: str = "local_fallback"  # Phase 6 telemetry: 'gemini' | 'groq' | 'local_fallback'


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def get_latest_session_summary(user_id: str) -> Optional[str]:
    """
    Cross-Login Context API (PRD §3.2).

    Retrieve the summary_snapshot from the most recent PREVIOUS session that
    belongs to this user.  This is called BEFORE inserting the new session so
    the query can never accidentally return the session we are about to create.

    Returns:
        str  — the prior summary text when it is non-empty, otherwise None.
        None — if no previous session exists, the prior summary is NULL/empty,
               or the Supabase lookup fails (graceful degradation).

    Security: the query is always filtered by user_id so user A can never
    receive user B's conversation context.
    """
    try:
        result = (
            supabase.table("sessions")
            .select("summary_snapshot")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if rows:
            snapshot = rows[0].get("summary_snapshot")
            # Treat NULL and whitespace-only strings as "no prior context"
            if snapshot and snapshot.strip():
                return snapshot
    except Exception as e:
        # Non-fatal: a missing prior summary is never a reason to block
        # session creation.  Log at WARNING level and fall through.
        logger.warning(
            "get_latest_session_summary: lookup failed for user %s — "
            "new session will start without prior context. Error: %s",
            user_id, e,
        )
    return None


def create_session(user_id: str) -> dict:
    """
    Insert a new row into the sessions table and return it.
    Called by POST /sessions.

    Cross-Login Context: before inserting, the most recent previous session's
    summary_snapshot is fetched and used to seed the new session so the AI
    remembers past interactions from the very first message (PRD §3.2).
    """
    # --- Cross-Login Context: fetch prior summary BEFORE inserting ---
    prior_summary = get_latest_session_summary(user_id)

    try:
        # Ensure user exists in users table to satisfy foreign key
        try:
            supabase.table("users").upsert({
                "id": user_id,
                "phone": f"+9198{str(user_id).replace('-', '')[:8]}"
            }, on_conflict="id").execute()
        except Exception:
            pass

        result = (
            supabase.table("sessions")
            .insert({"user_id": user_id})
            .execute()
        )
        if not result.data:
            return {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "summary_snapshot": prior_summary,
            }
        row = result.data[0]

        if prior_summary:
            new_session_id = str(row["id"])
            from app.services.summary_service import save_session_summary
            save_session_summary(new_session_id, prior_summary)
            row["summary_snapshot"] = prior_summary
            logger.info(
                "[CROSS-LOGIN CONTEXT] Seeded session %s for user %s with prior summary (%d words).",
                new_session_id, user_id, len(prior_summary.split()),
            )

        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_session error for user %s: %s", user_id, e)
        # Always return a valid session for the frontend instead of breaking the app with 500
        return {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "summary_snapshot": prior_summary,
        }


def generate_chat_heading(summary: Optional[str] = None, first_message: Optional[str] = None) -> str:
    """
    Generate an intuitive, human-friendly heading for a conversation (max 4-6 words)
    based on its rolling summary or initial user message.
    """
    text = (summary or "").strip()

    # 1. Check for explicit "Heading: " prefix in stored summary
    if text.startswith("Heading:"):
        first_line = text.split("\n", 1)[0]
        heading = first_line.replace("Heading:", "").strip()
        if heading:
            return heading

    # 2. Semantic keyword matching for high-frequency youth well-being themes
    lower_text = f"{summary or ''} {first_message or ''}".lower()

    if any(k in lower_text for k in ["exam", "padhai", "marks", "grade", "board", "jee", "neet", "test", "study", "academic"]):
        return "Exam Stress & Academic Focus"
    if any(k in lower_text for k in ["parent", "father", "mother", "papa", "mummy", "ghar", "family", "sharma ji"]):
        return "Family Pressure & Expectations"
    if any(k in lower_text for k in ["anxious", "anxiety", "panic", "ghabrahat", "palpitation", "chest heavy"]):
        return "Anxiety & Calming Support"
    if any(k in lower_text for k in ["lonely", "isolated", "akela", "alone", "nobody understands", "left out"]):
        return "Loneliness & Finding Connection"
    if any(k in lower_text for k in ["sleep", "insomnia", "neend", "nightmare", "awake", "overthinking"]):
        return "Late Night Overthinking & Sleep"
    if any(k in lower_text for k in ["friend", "dost", "breakup", "relationship", "crush", "fight"]):
        return "Relationship & Social Dynamics"
    if any(k in lower_text for k in ["overwhelm", "exhaust", "burnout", "tired", "heavy"]):
        return "Navigating Emotional Overwhelm"
    if any(k in lower_text for k in ["career", "future", "job", "college", "admission"]):
        return "Career & Future Pathways"
    if any(k in lower_text for k in ["hopeless", "sad", "crying", "rona", "low", "worthless"]):
        return "Support Through Low Mood"

    # 3. If first message is available, create a title from cleaned words
    if first_message:
        clean = re.sub(r'[^a-zA-Z0-9\s]', '', first_message).strip()
        words = clean.split()
        stopwords = {"hi", "hello", "hey", "i", "am", "feel", "feeling", "mujhe", "bohot", "zyada", "aaj", "really", "very", "is", "the", "to", "my", "karein", "batao", "please"}
        filtered = [w.capitalize() for w in words if w.lower() not in stopwords]
        if filtered:
            return " ".join(filtered[:4])
        elif words:
            return " ".join([w.capitalize() for w in words[:4]])

    # 4. Fallback default
    return "Safe Space Chat"


def list_sessions(user_id: str) -> List[dict]:
    """
    Return all sessions belonging to user_id, newest first.
    Enriched with human-friendly 'heading'.
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
        rows = result.data or []
        for r in rows:
            snapshot = r.get("summary_snapshot")
            r["heading"] = generate_chat_heading(summary=snapshot)
        return rows
    except Exception as e:
        logger.error("list_sessions error for user %s: %s", user_id, e)
        err_str = str(e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            return []
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve sessions.",
        )


def delete_session(session_id: str, user_id: str) -> bool:
    """
    Delete a specific session and its associated messages for user_id.
    Called by DELETE /sessions/{session_id}.
    """
    # 1. Clean in-memory caches
    from app.services.summary_service import _IN_MEMORY_SUMMARIES
    _IN_MEMORY_SUMMARIES.pop(session_id, None)

    if str(session_id).startswith("local-") or session_id in ("default-session", "default"):
        return True

    # 2. Validate ownership & delete
    validate_session_ownership(session_id, user_id)
    try:
        # Delete messages first
        try:
            supabase.table("messages").delete().eq("session_id", session_id).execute()
        except Exception as me:
            logger.debug("Could not delete messages for session %s: %s", session_id, me)

        # Delete session
        res = supabase.table("sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
        logger.info("[DELETE] Session %s deleted for user %s", session_id, user_id)
        return True
    except Exception as e:
        logger.error("Error deleting session %s: %s", session_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete session: {e}",
        )


def delete_all_sessions(user_id: str) -> int:
    """
    Wipe all chat sessions and message history belonging to user_id.
    Called by DELETE /sessions.
    """
    from app.services.summary_service import _IN_MEMORY_SUMMARIES
    _IN_MEMORY_SUMMARIES.clear()

    try:
        # Fetch user's session IDs
        result = supabase.table("sessions").select("id").eq("user_id", user_id).execute()
        session_ids = [str(r["id"]) for r in (result.data or [])]

        if not session_ids:
            return 0

        # Delete all messages for these sessions
        for sid in session_ids:
            try:
                supabase.table("messages").delete().eq("session_id", sid).execute()
            except Exception:
                pass

        # Delete all sessions for user
        supabase.table("sessions").delete().eq("user_id", user_id).execute()
        count = len(session_ids)
        logger.info("[DELETE ALL] Deleted %d sessions for user %s", count, user_id)
        return count
    except Exception as e:
        logger.error("Error deleting all sessions for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete all sessions: {e}",
        )


def delete_sessions_batch(session_ids: List[str], user_id: str) -> int:
    """
    Delete a specific list of sessions for user_id in a single call.
    Called by POST /chat/sessions/batch-delete.

    Behaviour:
      - Duplicate IDs are silently deduplicated (preserving order) before
        any deletion occurs, so callers need not pre-sanitise the list.
      - Ownership is validated for EVERY ID before any deletions begin,
        using validate_session_ownership().  If any session is missing (404)
        or belongs to a different user (403) the HTTPException is raised
        immediately and NO sessions are deleted (fail-fast, all-or-nothing).
      - _IN_MEMORY_SUMMARIES cache is invalidated per session via the
        reused delete_session() helper, which handles each ID atomically.

    Returns:
        int — the number of unique sessions actually deleted.
    """
    # 1. Deduplicate while preserving insertion order
    unique_ids = list(dict.fromkeys(session_ids))

    # 2. Pre-validate ownership for ALL IDs before touching the DB.
    #    Any 404 / 403 aborts the entire batch — no partial deletes.
    for session_id in unique_ids:
        # Skip transient / dev sessions (validate_session_ownership handles
        # them too, but checking here avoids the extra DB round-trip).
        if not (str(session_id).startswith("local-") or session_id in ("default-session", "default")):
            validate_session_ownership(session_id, user_id)

    # 3. All ownership checks passed — now delete each session.
    #    delete_session() handles DB deletion + cache invalidation.
    deleted = 0
    for session_id in unique_ids:
        try:
            delete_session(session_id=session_id, user_id=user_id)
            deleted += 1
        except HTTPException:
            # Re-raise: this should only happen on transient race conditions
            # (e.g. another process deleted the session between our pre-check
            # and this delete call). Surface to the caller as-is.
            raise
    logger.info(
        "[BATCH DELETE] Deleted %d sessions for user %s", deleted, user_id
    )
    return deleted


def validate_session_ownership(session_id: str, user_id: str) -> dict:
    """
    Fetch the session and confirm it belongs to the authenticated user.
    Handles transient / dev sessions gracefully.
    """
    # If session is transient or local, allow it
    if str(session_id).startswith("local-") or session_id in ("default-session", "default"):
        return {"id": session_id, "user_id": user_id, "summary_snapshot": None}

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
        # If network error or invalid UUID syntax, allow session without crashing
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str or "invalid input syntax for type uuid" in err_str:
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
        logger.warning("save_message error for session %s sender %s: %s (using local fallback)", session_id, sender, e)
        return {"id": str(uuid.uuid4()), **payload}


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

    # Phase 6 Telemetry: read which provider actually served this request
    active_provider = get_last_request_provider()
    logger.info("[TELEMETRY] session=%s provider=%s", session_id, active_provider)

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
        try:
            import asyncio
            asyncio.create_task(
                asyncio.to_thread(
                    _trigger_escalation_background,
                    user_id=user_id,
                    category=ai_result.category,
                    risk_event_id=risk_event_id,
                )
            )
        except Exception:
            _trigger_escalation_background(
                user_id=user_id,
                category=ai_result.category,
                risk_event_id=risk_event_id,
            )

    # Step 8: Derive conversation heading immediately & update rolling summary asynchronously
    heading = generate_chat_heading(summary=rolling_summary, first_message=message)

    def _background_summary_job():
        try:
            from app.services.summary_service import generate_rolling_summary, save_session_summary
            new_summary = generate_rolling_summary(
                existing_summary=rolling_summary,
                user_message=message,
                assistant_reply=ai_result.reply,
            )
            derived_heading = generate_chat_heading(summary=new_summary, first_message=message)
            full_snapshot = f"Heading: {derived_heading}\n\n{new_summary}"
            save_session_summary(session_id, full_snapshot)
        except Exception as sum_err:
            logger.debug("Background summary update error: %s", sum_err)

    try:
        import asyncio
        asyncio.create_task(asyncio.to_thread(_background_summary_job))
    except Exception:
        pass

    return ChatServiceResult(
        reply=ai_result.reply,
        severity=ai_result.severity,
        category=ai_result.category,
        rationale=ai_result.rationale,
        action_taken=action_taken,
        heading=heading,
        provider=active_provider,
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
