# YUVAA Saarthi — Shared Pydantic Schemas
# Reference: PRD §5 (Data Models) & Execution Plan Phase 2
#
# All API request payloads and response shapes are defined here so routes stay
# thin and teammates (Mannat, Yashika, Aakansha) have one authoritative contract
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

