# YUVAA Saarthi Escalation Router
# Reference: PRD §3.4 (Emergency contact alert system) & §3.4a (Abuse-routing safeguard)

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.bland_ai import trigger_bland_ai_call

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

@router.post("/trigger", status_code=status.HTTP_200_OK)
async def trigger_escalation(payload: EscalationTriggerRequest):
    """
    Trigger emergency contacts escalation sequence (PRD §3.4).
    
    CRITICAL SAFETY ENFORCEMENT:
      - If category == 'abuse' and severity == 'high' (PRD §3.4a):
        Hard short-circuit. Personal contacts are strictly NOT contacted.
        Action is logged as 'routed_to_helpline'.
      - For self_harm / distress:
        Dispatches voice call to primary emergency contact via Bland AI pathway.
    """
    severity = payload.severity.lower()
    category = payload.category.lower()

    # =========================================================================
    # RULE §3.4a: CRITICAL ABUSE BYPASS
    # =========================================================================
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
            "details": (
                "Rule §3.4a active: Personal emergency contacts bypassed completely "
                "to protect user safety. In-app helplines Childline 1098 & KIRAN 1800-599-0019 surfaced."
            )
        }

    # =========================================================================
    # STANDARD ESCALATION FLOW (§3.4): BLAND AI VOICE CALL TO PRIORITY CONTACT
    # =========================================================================
    target_phone = payload.contact_phone
    target_rel = payload.contact_relationship or "Parent"
    target_name = payload.contact_name or "Emergency Contact"
    priority = 1

    # If list of contacts provided, select priority 1
    if not target_phone and payload.contacts:
        sorted_contacts = sorted(payload.contacts, key=lambda c: c.priority_order)
        primary = sorted_contacts[0]
        target_phone = primary.phone
        target_rel = primary.relationship
        target_name = primary.name
        priority = primary.priority_order

    if not target_phone:
        target_phone = "+919876543211"  # Default safe simulation phone if not specified

    # Dispatch Bland AI pathway call
    call_result = trigger_bland_ai_call(
        phone_number=target_phone,
        contact_name=target_name,
        relationship=target_rel,
        user_id=payload.user_id,
        priority_order=priority
    )

    return {
        "status": "escalation_triggered",
        "action_taken": "call_placed",
        "category": category,
        "call_dispatched": True,
        "call_details": call_result,
        "details": f"Voice call dispatched to priority #{priority} contact ({target_rel}) via Bland AI pathway."
    }

