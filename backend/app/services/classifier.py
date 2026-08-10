# YUVAA Saarthi Risk Classification & Abuse-Routing Module
# Reference: PRD §3.3 (Detection), §3.4a (Abuse-routing rule), & §8 (JSON Schema)
# Co-owned by Mannat & Khushal (Execution Plan Day 3 & Day 4 tasks)

from pydantic import BaseModel, Field
from typing import Optional

# Structured JSON response shape forced by LangChain JSON mode/Function Calling (PRD §8)
class RiskClassificationSchema(BaseModel):
    severity: str = Field(
        ..., 
        description="Must be one of: none, low, medium, high"
    )
    category: str = Field(
        ..., 
        description="Must be one of: self_harm, abuse, distress, none"
    )
    rationale: str = Field(
        ..., 
        description="Detailed justification for the assigned severity and category based on current and summary contexts."
    )

def classify_message_risk(message: str, rolling_summary: Optional[str] = None) -> RiskClassificationSchema:
    """
    Stub for LLM structured classification call using LangChain (PRD §3.3 & §8).
    This runs on every message and analyzes the text along with rolling history.
    
    TODO (Mannat - Day 3): Implement the LangChain structured output chain.
    Ensure Hinglish/code-switched inputs (like 'mumma bahut marte hai roz') 
    score as high-risk abuse with identical accuracy to English (PRD §3.6).
    """
    # Stub response
    return RiskClassificationSchema(
        severity="none",
        category="none",
        rationale="Stub representation. Active chat checks passing."
    )

def route_safety_escalation(
    classification: RiskClassificationSchema, 
    user_id: str, 
    message_id: str
) -> str:
    """
    Core escalation router logic matching PRD §3.4 and §3.4a rules.
    Decides whether to trigger emergency contacts or helpline short-circuits.
    
    Returns the action_taken flag matching 'action_taken_type' DB enum.
    """
    severity = classification.severity.lower()
    category = classification.category.lower()

    # =========================================================================
    # RULE §3.4a: ABUSE-AWARE CONTACT ROUTING (HARD CRITICAL SAFETY RULE)
    # Quote from PRD §3.4a:
    # "On a High severity classification with category abuse, the personal
    #  emergency contact flow in §3.4 does NOT run. No call, no SMS, to any
    #  of the user's listed emergency contacts, regardless of priority order.
    #  Instead, the app:
    #   1. Immediately surfaces a counselor/helpline resource in-app to the user
    #   2. Optionally places the Bland AI call to the helpline/counselor resource itself...
    #   3. Logs the event distinctly — risk_events.action_taken = routed_to_helpline"
    # =========================================================================
    
    # Check if category is 'abuse' and severity is 'high'
    if severity == "high" and category == "abuse":
        # TODO (Khushal - Day 4): Short-circuit the personal contact escalation state machine.
        # DO NOT call or SMS the user's listed emergency contacts (they could be the abusers).
        # Trigger the in-app helpline workflow and log 'routed_to_helpline' in the DB.
        print(f"[CRITICAL SAFETY ROUTE] Abuse detected at High severity. Bypassing personal contacts for user {user_id}.")
        action = "routed_to_helpline"
        
        # Surfacing resources: Childline 1098 / KIRAN 1800-599-0019
        return action

    # Normal Escalation Flow (PRD §3.4)
    # Triggered on High severity for other risk categories (self_harm, distress)
    elif severity == "high":
        # TODO (Khushal & Mannat - Day 4): Fire the emergency contacts escalation chain.
        # 1. Parallel Twilio SMS to all contacts immediately.
        # 2. Sequential Bland AI call escalation queue (timeout -> try next priority contact).
        # 3. If all fail -> log as 'attempted_failed'. Otherwise 'call_placed' / 'sms_sent'.
        print(f"[ESCALATION TRIGGERED] Self-harm/Distress at High severity. Alerts initiating for user {user_id}.")
        action = "call_placed"
        return action

    # Medium severity flow
    elif severity == "medium":
        # TODO (Khushal - Day 4): Surface in-app crisis resources immediately to the user and log event.
        action = "logged_only"
        return action

    else:
        # Normal message flow (low or none risk)
        action = "logged_only"
        return action
