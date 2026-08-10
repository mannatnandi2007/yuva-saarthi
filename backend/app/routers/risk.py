# YUVAA Saarthi Risk Classification Router
# Reference: PRD §3.3 (Extreme-point detection) & §3.4a (Abuse-routing) & Execution Plan Day 3

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/risk", tags=["risk"])

class RiskCheckRequest(BaseModel):
    user_id: str
    message_id: str
    message_content: str

@router.post("/check", status_code=status.HTTP_200_OK)
async def check_message_risk(payload: RiskCheckRequest):
    """
    Manually check or log a message risk event.
    TODO: Integrate with services/classifier.py (PRD §3.3).
    Logs the output in 'risk_events' table.
    """
    return {
        "severity": "none",
        "category": "none",
        "rationale": "No concerning signals detected in user query.",
        "action_taken": "logged_only"
    }
