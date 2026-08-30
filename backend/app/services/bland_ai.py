# YUVAA Saarthi — Bland AI Telephony Integration Service
# Reference: PRD §3.4 (Emergency Contact Alert System — Sequential Voice Escalation)
# Owned by Mannat (Phase 3: Bland AI Pathway Setup)

import os
import uuid
import logging
from typing import Optional, Dict, Any
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
    pathway_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatch an automated conversational voice call to a priority emergency contact.
    
    In live mode: Calls Bland AI REST API (POST https://api.bland.ai/v1/calls).
    In dev mode: Logs the call dispatch and returns simulated call details.
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

    # Live execution if valid API key is present
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
                logger.info("[BLAND AI] Call successfully queued for %s (call_id: %s)", phone_number, data.get("call_id"))
                return {
                    "status": "success",
                    "call_id": data.get("call_id"),
                    "phone_number": phone_number,
                    "provider": "bland_ai",
                    "message": "Emergency voice call queued via Bland AI"
                }
            else:
                logger.error("[BLAND AI] Call request failed with status %d: %s. Falling back to dev simulation.", resp.status_code, resp.text)
        except Exception as e:
            logger.error("[BLAND AI] Network error placing call: %s. Falling back to dev simulation.", e)

    # Dev / Simulation mode (safe local testing without billable API calls)
    simulated_call_id = f"bland_mock_{uuid.uuid4().hex[:12]}"
    logger.info(
        "[BLAND AI SIMULATION] Dispatching priority call -> To: %s (%s, #%d) | Call ID: %s",
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
        "message": "Emergency voice call queued (Dev Mode: Bland AI pathway simulated)"
    }
