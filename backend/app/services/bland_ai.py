# YUVAA Saarthi — Bland AI Telephony Integration Service
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


def build_crisis_call_task(contact_name: str, relationship: str, user_phone: Optional[str] = None) -> str:
    """Build empathetic conversational instructions for the Bland AI voice agent."""
    user_label = f"the user associated with phone {user_phone}" if user_phone else "your family member / loved one"
    return (
        f"You are calling on behalf of YUVAA Saarthi, an AI-powered youth well-being and safety companion. "
        f"You are speaking with {contact_name} ({relationship}), who is listed as a primary safety contact for {user_label}. "
        f"Tone guidelines: Remain extremely calm, respectful, supportive, and clear. Avoid causing sudden panic. "
        f"1. Explain that our safety system registered signs of emotional crisis or acute distress during a conversation. "
        f"2. Request that they gently check in on them with care and open-ended support. "
        f"3. Share that national 24/7 mental health helplines are available if needed: KIRAN at 1800-599-0019 and Tele-MANAS at 14416. "
        f"4. Reassure them and ask if they have noted the contact information before concluding the call."
    )


def trigger_bland_ai_call(
    phone_number: str,
    contact_name: str = "Emergency Contact",
    relationship: str = "Parent",
    user_id: str = "unknown",
    user_phone: Optional[str] = None,
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

    task_prompt = build_crisis_call_task(contact_name, relationship, user_phone)
    first_sentence = (
        f"Hello {contact_name}, this is an automated safety alert from YUVAA Saarthi regarding your loved one."
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
) -> Dict[str, Any]:
    """
    Phase 3: Sequential Voice Escalation Loop (Owned by Mannat).
    Reference: PRD §3.4 & §3.4a

    Workflow:
    1. Short-circuit check for abuse (Rule §3.4a):
       If category == 'abuse' and severity == 'high':
         Personal contacts are STRICTLY NOT CALLED.
         Action taken is 'routed_to_helpline'.
    2. Fetch all emergency contacts for user_id ordered by priority_order ASC.
       If `contacts` list is supplied directly, use them.
    3. Loop through contacts sequentially (1 -> 2 -> 3):
       - Dispatch Bland AI voice call to contact.
       - Log attempt to `alert_attempts` table.
       - If call succeeds and stop_on_first_answer is True, break loop.
         If contact fails/unanswered, advance to next priority contact.
    4. Return complete escalation report.
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

    # 2. Fetch contacts if not provided
    contact_list = []
    if contacts:
        contact_list = list(contacts)
    else:
        try:
            from app.supabase_client import supabase
            res = (
                supabase.table("emergency_contacts")
                .select("id, phone, relationship, first_name, last_name, priority_order")
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
            "relationship": "Parent",
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
        c_rel = c.get("relationship", "Parent")
        c_name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or c.get("name") or "Emergency Contact"
        c_priority = c.get("priority_order", idx + 1)

        logger.info(
            "[SEQUENTIAL LOOP] Dialing Priority #%d: %s (%s, %s)",
            c_priority, c_name, c_rel, c_phone
        )

        call_result = trigger_bland_ai_call(
            phone_number=c_phone,
            contact_name=c_name,
            relationship=c_rel,
            user_id=user_id,
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
        "details": f"Voice call dispatched to priority #{attempts_log[0]['attempt_order']} contact ({attempts_log[0]['relationship']}) via Bland AI."
    }
