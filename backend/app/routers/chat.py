# YUVAA Saarthi Chat Router
# Reference: PRD §3.2 (Cross-session memory/summary) & §3.6 (Hinglish mirroring) & Execution Plan Day 2

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessagePayload(BaseModel):
    session_id: str
    content: str

class SessionStartPayload(BaseModel):
    user_id: str

@router.post("/session/start", status_code=status.HTTP_200_OK)
async def start_session(payload: SessionStartPayload):
    """
    On session start, load rolling summary and last N raw messages.
    TODO: Integrate database lookup for rolling summary (PRD §3.2).
    """
    return {
        "session_id": "dummy-session-uuid",
        "rolling_summary": "User is feeling thoda anxious regarding upcoming exams but coping well.",
        "recent_messages": [
            {"sender": "user", "content": "hi companion"},
            {"sender": "assistant", "content": "Hello! standard register mirror response"}
        ]
    }

@router.post("/message/send", status_code=status.HTTP_200_OK)
async def send_message(payload: ChatMessagePayload):
    """
    Process incoming messages: pre-filter -> classify -> retrieve (RAG) -> respond.
    TODO: Orchestrate sequential LangChain pipeline:
        1. Run keyword pre-filter (app/services/pre_filter.py) (PRD §3.6).
        2. Run LLM structured risk classification (app/services/classifier.py) (PRD §3.3).
        3. If classification is 'High' severity (PRD §3.4, §3.4a):
           a. If category is 'abuse': short-circuit escalation, return helpline resource cards.
           b. If category is 'self_harm' or 'distress': fire parallel SMS and call escalation queue.
        4. Run pgvector RAG retrieval to fetch grounding context (PRD §4, §6).
        5. Invoke reply generation using system prompt config (Hinglish mirroring) (PRD §3.6).
        6. Periodically update rolling session summary (PRD §3.2).
    """
    return {
        "reply": "I understand yaar, it gets overwhelming. Batao, what's on your mind?",
        "risk_classification": {
            "severity": "none",
            "category": "none",
            "rationale": "Filtered. Chatting normally."
        },
        "action_taken": "logged_only"
    }
