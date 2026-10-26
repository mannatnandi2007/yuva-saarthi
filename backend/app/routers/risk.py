# Yuva Saarthi Risk Classification Router
# Reference: PRD §3.3 (Extreme-point detection) & §3.4a (Abuse-routing) & Execution Plan Day 3

from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.classifier import classify_message_risk, route_safety_escalation

router = APIRouter(prefix="/risk", tags=["risk"])

class RiskCheckRequest(BaseModel):
    user_id: str
    message_id: Optional[str] = None
    message_content: str
    rolling_summary: Optional[str] = None

@router.post("/check", status_code=status.HTTP_200_OK)
async def check_message_risk(payload: RiskCheckRequest):
    """
    Check and classify a message risk event using the LLM classifier.
    Calculates severity, category, rationale, and escalation action taken.
    Enforces Rule §3.4a (abuse bypasses personal contacts).
    """
    classification = classify_message_risk(
        message=payload.message_content,
        rolling_summary=payload.rolling_summary
    )
    action_taken = route_safety_escalation(
        classification=classification,
        user_id=payload.user_id,
        message_id=payload.message_id
    )

    return {
        "severity": classification.severity,
        "category": classification.category,
        "rationale": classification.rationale,
        "action_taken": action_taken
    }

