# Yuva Saarthi — Shared Pydantic Schemas
# Reference: PRD §5 (Data Models) & Execution Plan Phase 2
#
# All API request payloads and response shapes are defined here so routes stay
# thin and teammates (Mannat, Aklesh, Aakansha, Khushal) have one authoritative contract
# to reference when integrating.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Auth / User
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """Response schema for GET /users/me"""
    model_config = ConfigDict(extra="ignore")

    id: str
    phone: str
    age_band: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Emergency Contacts
# ---------------------------------------------------------------------------

class ContactResponse(BaseModel):
    """Single emergency contact as returned by GET /contacts"""
    model_config = ConfigDict(extra="ignore")

    id: str
    phone: str
    relationship: str
    priority_order: int


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionCreateResponse(BaseModel):
    """Response for POST /sessions"""
    session_id: str
    user_id: str
    started_at: datetime


class SessionListItem(BaseModel):
    """One item in the GET /sessions list"""
    model_config = ConfigDict(extra="ignore")

    session_id: str
    started_at: datetime
    summary_snapshot: Optional[str] = None
    heading: Optional[str] = None


class DeleteSessionResponse(BaseModel):
    """Response for session deletion"""
    success: bool
    session_id: Optional[str] = None
    deleted_count: int = 1
    message: str


class BatchDeleteRequest(BaseModel):
    """
    Request body for POST /chat/sessions/batch-delete.

    Accepts a non-empty list of session UUIDs to delete in a single request.
    All sessions must belong to the authenticated user — any ownership violation
    aborts the entire batch (no partial deletes).
    Duplicate IDs are silently deduplicated before processing.
    """
    session_ids: List[str] = Field(
        ...,
        min_length=1,
        description="Non-empty list of session UUIDs to delete. Duplicates are ignored.",
    )


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """
    Request body for POST /chat.
    NOTE: user_id is intentionally NOT here — it is always derived from the
    authenticated token, never trusted from the request body (security rule).
    """
    session_id: str = Field(..., description="UUID of the chat session (from POST /sessions)")
    message: str = Field(..., min_length=1, max_length=4000, description="The user's message text")


class StructuredTurnOutput(BaseModel):
    """Single structured turn output produced by the LLM (Phase 2)."""
    reply: str = Field(..., description="The conversational response to the user.")
    mood: str = Field("normal", description="Detected user mood (e.g., anxious, distressed, lonely, normal, hopeful).")
    mood_confidence: float = Field(0.8, ge=0.0, le=1.0, description="Confidence in mood detection.")
    severity: str = Field("none", description="Safety severity: none, low, medium, high.")
    category: str = Field("none", description="Safety category: none, self_harm, abuse, distress.")
    language: str = Field("hinglish", description="Detected language/register: english, hindi, hinglish.")
    rationale: str = Field("", description="Clinical rationale for the safety classification.")


class RiskClassificationResponse(BaseModel):
    """Embedded risk result in the chat response"""
    severity: str  # none | low | medium | high
    category: str  # none | self_harm | abuse | distress
    rationale: str


class ChatResponse(BaseModel):
    """Response for POST /chat"""
    reply: str
    risk_classification: RiskClassificationResponse
    action_taken: str  # matches action_taken_type DB enum
    heading: Optional[str] = None
    session_id: Optional[str] = None
    llm_provider: Optional[str] = None  # 'gemini' | 'groq' | 'third_party' | 'local_fallback'
    mood: Optional[str] = "normal"
    mood_confidence: Optional[float] = 0.8
    degraded: Optional[bool] = False


# ---------------------------------------------------------------------------
# Chat History
# ---------------------------------------------------------------------------

class MessageHistoryItem(BaseModel):
    """One message row for GET /chat/history/{session_id}"""
    model_config = ConfigDict(extra="ignore")

    id: str
    sender: str        # user | assistant | system
    content: str
    risk_tier: Optional[str] = None
    created_at: datetime

