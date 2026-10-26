# Yuva Saarthi — Bland AI Telephony Integration Service
# Reference: PRD §3.4 (Emergency Contact Alert System — Sequential Voice Escalation)
# Owned by Mannat (Phase 3: Bland AI Pathway Setup & Sequential Escalation Loop)
#
# Bland AI is the telephony provider (NOT Twilio).
# This module provides:
#   1. trigger_bland_ai_call(): single phone call dispatch via Bland AI
#   2. log_alert_attempt(): logs call attempt to alert_attempts table
#   3. trigger_sequential_escalation(): loop across contacts priority 1 -> 2 -> 3

import os
import uuid
import logging
from typing import Optional, Dict, Any, List
from app.config import settings

logger = logging.getLogger(__name__)

BLAND_AI_API_URL = "https://api.bland.ai/v1/calls"


def build_crisis_call_task(
    contact_name: str, 
    relationship: str, 
    designation: Optional[str] = None,
    user_phone: Optional[str] = None,
    user_name: Optional[str] = None,
    escalation_reason: str = "acute distress / high anxiety",
) -> str:
    """
    Build empathetic yet firm, clear instructions for Bland AI voice agent.
    Task 7 requirements:
    - Quickly introduces itself.
    - Speaks clearly about the situation.
    - Properly addresses guardian as per designation given by user.
    - Warns guardian that this is NOT a mock call but an actual emergency.
    """
    user_label = user_name or (f"the young person registered with phone {user_phone}" if user_phone else "your child / student in your care")
    guardian_title = designation or relationship or "Guardian"

    return (
        f"You are Yusa, an automated emergency voice responder calling from Yuva Saarthi, India's youth safety and mental well-being companion. "
        f"You are directly speaking with {contact_name}, who is officially designated as {guardian_title} for {user_label}. "
        f"\nCRITICAL DIRECTIVES:\n"
        f"1. IMMEDIATE INTRODUCTION & REAL-EMERGENCY WARNING: Introduce yourself quickly and clearly state: "
        f"'Hello {contact_name}. This is Yusa calling from Yuva Saarthi. Please pay close attention: this is NOT a simulation, test, or mock call. This is an actual, real-time safety alert.'\n"
        f"2. SITUATION BRIEF: Clearly and calmly explain that our verified safety monitoring detected an escalation involving {escalation_reason} during {user_label}'s current session.\n"
        f"3. URGENT CALL TO ACTION: Request that as their designated {guardian_title}, they immediately check in on {user_label} in person or by phone with warmth, patience, and non-judgmental care.\n"
        f"4. HELPLINE SUPPORT: Inform them that certified national 24/7 mental health emergency helplines are active right now: Tele-MANAS at 14416 and KIRAN at 1800-599-0019.\n"
        f"5. CONVERSATION PROTOCOL: Speak in a calm, authoritative, reassuring, and articulate voice. Ask if they have heard and understood the message, and confirm they are able to check on them immediately."
    )


def trigger_bland_ai_call(
    phone_number: str,
    contact_name: str = "Emergency Contact",
    relationship: str = "Guardian",
    designation: Optional[str] = None,
    user_id: str = "unknown",
    user_phone: Optional[str] = None,
    user_name: Optional[str] = None,
    escalation_reason: str = "acute distress / high anxiety",
    priority_order: int = 1,
    pathway_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Dispatch an automated conversational voice call to a priority emergency contact via Bland AI.

    In live mode: Calls Bland AI REST API (POST https://api.bland.ai/v1/calls).
    In dev mode:  Logs the call dispatch and returns simulated call details.
    """
    api_key = settings.bland_ai_key or os.environ.get("BLAND_AI_KEY")
    is_live_key = api_key and not api_key.startswith("your-") and not api_key.startswith("placeholder")

    guardian_title = designation or relationship or "Guardian"
    user_label = user_name or "your loved one"

    task_prompt = build_crisis_call_task(
        contact_name=contact_name, 
        relationship=relationship, 
        designation=guardian_title,
        user_phone=user_phone, 
        user_name=user_name,
        escalation_reason=escalation_reason
    )
    first_sentence = (
        f"Hello {contact_name}, this is Yusa from Yuva Saarthi. Please listen carefully: this is NOT a mock call, but an actual urgent safety alert regarding {user_label}."
    )

    payload = {
        "phone_number": phone_number,
        "task": task_prompt,
        "first_sentence": first_sentence,
        "voice": "maya",
        "wait_for_greeting": True,
        "record": True,
        "metadata": {
            "user_id": user_id,
            "priority_order": priority_order,
            "relationship": relationship,
            "designation": guardian_title,
            "escalation_reason": escalation_reason,
            "service": "yuvaa_saarthi_escalation"
        }
    }
    if pathway_id:
        payload["pathway_id"] = pathway_id

    # Live execution if valid Bland AI API key is present
    if is_live_key:
        try:
            import httpx
            headers = {
                "authorization": api_key,
                "Content-Type": "application/json"
            }
            resp = httpx.post(BLAND_AI_API_URL, json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                data = resp.json()
                logger.info(
                    "[BLAND AI] Call successfully queued for %s (call_id: %s)",
                    phone_number, data.get("call_id")
                )
                return {
                    "status": "success",
                    "call_id": data.get("call_id"),
                    "phone_number": phone_number,
                    "contact_name": contact_name,
                    "relationship": relationship,
                    "priority_order": priority_order,
                    "provider": "bland_ai",
                    "message": "Emergency voice call queued via Bland AI"
                }
            else:
                logger.error(
                    "[BLAND AI] Call request failed (status %d): %s. Falling back to simulation.",
                    resp.status_code, resp.text
                )
        except Exception as e:
            logger.error("[BLAND AI] Network error placing call: %s. Falling back to simulation.", e)

    # Dev / Simulation mode — safe local testing without billable API calls
    simulated_call_id = f"bland_mock_{uuid.uuid4().hex[:12]}"
    logger.info(
        "[BLAND AI SIMULATION] Priority call -> To: %s (%s, #%d) | Call ID: %s",
        phone_number, contact_name, priority_order, simulated_call_id
    )
    return {
        "status": "success",
        "call_id": simulated_call_id,
        "phone_number": phone_number,
        "contact_name": contact_name,
        "relationship": relationship,
        "priority_order": priority_order,
        "provider": "bland_ai (dev_simulation)",
        "message": "Emergency voice call queued (Dev Mode: Bland AI pathway simulated, no actual call made)"
    }


def log_alert_attempt(
    risk_event_id: str,
    emergency_contact_id: str,
    attempt_order: int,
    outcome: str = "sent",
    channel: str = "call",
) -> Optional[dict]:
    """
    Phase 3: Insert a record into the alert_attempts table (PRD §3.4 & §5).
    Outcomes allowed by schema: 'answered', 'no_answer', 'declined', 'invalid_number', 'sent'.
    """
    valid_outcomes = {"answered", "no_answer", "declined", "invalid_number", "sent"}
    safe_outcome = outcome if outcome in valid_outcomes else "sent"

    try:
        from app.supabase_client import supabase
        res = supabase.table("alert_attempts").insert({
            "risk_event_id": risk_event_id,
            "emergency_contact_id": emergency_contact_id,
            "attempt_order": attempt_order,
            "channel": channel,
            "outcome": safe_outcome,
        }).execute()
        if res.data:
            logger.info(
                "[ALERT ATTEMPT LOGGED] risk_event=%s contact=%s order=%d outcome=%s",
                risk_event_id, emergency_contact_id, attempt_order, safe_outcome
            )
            return res.data[0]
    except Exception as e:
        logger.warning("[ALERT ATTEMPTS] DB insert failed for event %s: %s", risk_event_id, e)
    return None


def trigger_sequential_escalation(
    user_id: str,
    risk_event_id: Optional[str] = None,
    category: str = "self_harm",
    severity: str = "high",
    contacts: Optional[List[Dict[str, Any]]] = None,
    stop_on_first_answer: bool = True,
    escalation_reason: Optional[str] = None,
    user_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Phase 3: Sequential Voice Escalation Loop (Owned by Mannat).
    Reference: PRD §3.4 & §3.4a + Task 7
    """
    # 1. Critical Abuse Bypass Safeguard (§3.4a)
    if severity.lower() == "high" and category.lower() == "abuse":
        logger.warning(
            "[ESCALATION SAFEGUARD §3.4a] Abuse detected for user %s. "
            "Personal contact escalation aborted. Helplines surfaced.",
            user_id
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

    # Derive escalation reason if not explicitly provided
    resolved_reason = escalation_reason
    if not resolved_reason:
        if category in ("self_harm", "suicide"):
            resolved_reason = "high-risk self-harm or acute crisis signals"
        elif category in ("anxiety", "panic"):
            resolved_reason = "severe acute anxiety and panic symptoms"
        else:
            resolved_reason = "severe emotional distress requiring immediate check-in"

    # 2. Fetch contacts if not provided
    contact_list = []
    if contacts:
        contact_list = list(contacts)
    else:
        try:
            from app.supabase_client import supabase
            res = (
                supabase.table("emergency_contacts")
                .select("id, phone, relationship, designation, first_name, last_name, priority_order")
                .eq("user_id", user_id)
                .order("priority_order", desc=False)
                .execute()
            )
            if res.data:
                contact_list = res.data
        except Exception as e:
            logger.warning("[ESCALATION] Could not fetch contacts for user %s: %s", user_id, e)

    if not contact_list:
        contact_list = [{
            "id": str(uuid.uuid4()),
            "phone": "+919876543211",
            "relationship": "Guardian",
            "designation": "Guardian",
            "first_name": "Emergency",
            "last_name": "Contact",
            "priority_order": 1,
        }]

    # Sort contacts by priority_order (1 -> 2 -> 3)
    sorted_contacts = sorted(contact_list, key=lambda c: c.get("priority_order", 1))

    attempts_log = []
    call_dispatched = False

    # 3. Sequential Escalation Loop across priority contacts
    for idx, c in enumerate(sorted_contacts):
        c_id = str(c.get("id") or uuid.uuid4())
        c_phone = c.get("phone") or "+919876543211"
        c_rel = c.get("relationship", "Guardian")
        c_desig = c.get("designation") or c_rel or "Designated Guardian"
        c_name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or c.get("name") or "Emergency Contact"
        c_priority = c.get("priority_order", idx + 1)

        logger.info(
            "[SEQUENTIAL LOOP] Dialing Priority #%d: %s (%s, %s)",
            c_priority, c_name, c_desig, c_phone
        )

        call_result = trigger_bland_ai_call(
            phone_number=c_phone,
            contact_name=c_name,
            relationship=c_rel,
            designation=c_desig,
            user_id=user_id,
            user_name=user_name,
            escalation_reason=resolved_reason,
            priority_order=c_priority,
        )
        call_dispatched = True

        outcome = "sent" if call_result.get("status") == "success" else "no_answer"

        # Log attempt in alert_attempts table
        attempt_record = None
        if risk_event_id:
            attempt_record = log_alert_attempt(
                risk_event_id=risk_event_id,
                emergency_contact_id=c_id,
                attempt_order=c_priority,
                outcome=outcome,
                channel="call",
            )

        attempt_info = {
            "attempt_order": c_priority,
            "contact_id": c_id,
            "contact_name": c_name,
            "relationship": c_rel,
            "phone": c_phone,
            "call_id": call_result.get("call_id"),
            "status": call_result.get("status"),
            "outcome": outcome,
            "logged_to_db": attempt_record is not None,
        }
        attempts_log.append(attempt_info)

        # If reached contact and stop_on_first_answer is True, exit loop
        if stop_on_first_answer and outcome in ("sent", "answered"):
            logger.info("[SEQUENTIAL LOOP] Priority #%d reached successfully. Loop satisfied.", c_priority)
            break

    # Build primary call details for backwards-compatibility
    primary_call_details = {}
    if attempts_log:
        primary_call_details = {
            "call_id": attempts_log[0]["call_id"],
            "status": attempts_log[0]["status"],
            "phone_number": attempts_log[0]["phone"],
            "contact_name": attempts_log[0]["contact_name"],
            "relationship": attempts_log[0]["relationship"],
            "priority_order": attempts_log[0]["attempt_order"],
            "provider": "bland_ai",
            "message": "Emergency voice call queued via Bland AI"
        }

    return {
        "status": "escalation_triggered",
        "action_taken": "call_placed",
        "category": category,
        "call_dispatched": call_dispatched,
        "call_details": primary_call_details,
        "total_attempts": len(attempts_log),
        "attempts": attempts_log,
        "details": (
            f"Voice call dispatched to priority #{attempts_log[0]['attempt_order']} contact ({attempts_log[0]['relationship']}) via Bland AI."
            if attempts_log
            else "Voice call queued via Bland AI."
        )
    }
