# YUVAA Saarthi — Escalation Router
# Reference: PRD §3.4 (Emergency contact alert system) & §3.4a (Abuse-routing safeguard)
# Bland AI is the telephony provider (not Twilio).
# Phase 3: Sequential Voice Escalation Loop & alert_attempts logging owned by Mannat.

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.bland_ai import trigger_sequential_escalation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/escalation", tags=["escalation"])


class EmergencyContactInput(BaseModel):
    phone: str
    relationship: str = "Parent"
    name: str = "Emergency Contact"
    priority_order: int = 1


class EscalationTriggerRequest(BaseModel):
    user_id: str
    risk_event_id: Optional[str] = None
    severity: str = Field(default="high", description="Risk severity: none, low, medium, high")
    category: str = Field(default="self_harm", description="Risk category: self_harm, abuse, distress, none")
    contact_phone: Optional[str] = None
    contact_relationship: Optional[str] = "Parent"
    contact_name: Optional[str] = "Emergency Contact"
    contacts: Optional[List[EmergencyContactInput]] = None
    stop_on_first_answer: Optional[bool] = True


@router.post("/trigger", status_code=status.HTTP_200_OK)
async def trigger_escalation(payload: EscalationTriggerRequest):
    """
    Trigger emergency contact escalation sequence (PRD §3.4 & §3.4a).
    Phase 3: Implements sequential retry loop across all 3 priority contacts (Mannat).

    CRITICAL SAFETY ENFORCEMENT:
      - If category == 'abuse' and severity == 'high' (PRD §3.4a):
        Hard short-circuit. Personal contacts are strictly NOT contacted.
        Action logged as 'routed_to_helpline'. Childline 1098 & KIRAN surfaced.
      - For self_harm / distress (high severity):
        Dispatches voice call sequentially to emergency contacts (priority 1 -> 2 -> 3)
        via Bland AI (Twilio is NOT used).
        Each attempt is logged to the alert_attempts DB table.
    """
    severity = payload.severity.lower()
    category = payload.category.lower()

    # Rule §3.4a: Abuse Bypass Safeguard
    if severity == "high" and category == "abuse":
        logger.warning(
            "[ESCALATION SAFEGUARD §3.4a] Abuse detected for user %s. "
            "Personal contact escalation aborted.", payload.user_id
        )
        return {
            "status": "bypassed_safeguard",
            "action_taken": "routed_to_helpline",
            "category": "abuse",
            "call_dispatched": False,
            "total_attempts": 0,
            "attempts": [],
            "details": (
                "Rule §3.4a active: Personal emergency contacts bypassed completely "
                "to protect user safety. In-app helplines Childline 1098 & KIRAN 1800-599-0019 surfaced."
            )
        }

    # Normalize contacts payload if provided
    contacts_list = None
    if payload.contacts:
        contacts_list = [c.model_dump() for c in payload.contacts]
    elif payload.contact_phone:
        contacts_list = [{
            "phone": payload.contact_phone,
            "relationship": payload.contact_relationship or "Parent",
            "name": payload.contact_name or "Emergency Contact",
            "priority_order": 1
        }]

    # Execute sequential escalation loop
    result = trigger_sequential_escalation(
        user_id=payload.user_id,
        risk_event_id=payload.risk_event_id,
        category=category,
        severity=severity,
        contacts=contacts_list,
        stop_on_first_answer=payload.stop_on_first_answer if payload.stop_on_first_answer is not None else True,
    )

    return result
