# YUVAA Saarthi — Demo Script Integration Router
# Phase 5: Demo endpoint for showcasing all system capabilities in one call.
# Provides a controlled walkthrough of: pre-filter → classifier → RAG → LLM → escalation routing.

import logging
from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional

from app.services.pre_filter import check_message_tripwire
from app.services.classifier import classify_message_risk, route_safety_escalation
from app.services.rag_service import retrieve_relevant_guidelines, build_rag_prompt_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])


# ---------------------------------------------------------------------------
# Pre-built demo scenarios for presentation / testing
# ---------------------------------------------------------------------------

DEMO_SCENARIOS = {
    "exam_stress": {
        "label": "Exam Stress (Low Risk)",
        "message": "Yaar mujhe exams ki wajah se bohot tension ho rahi hai, marks kharab honge shayad.",
        "description": "Tests Hinglish exam stress detection — should classify as LOW distress, no escalation."
    },
    "self_harm": {
        "label": "Self-Harm Crisis (High Risk)",
        "message": "Main bahut thak gaya hoon. Marna chahta hoon, please koi help karo.",
        "description": "Tests self-harm detection pipeline — should classify HIGH, surface in-app crisis helplines (no phone call, Bland AI removed)."
    },
    "abuse_bypass": {
        "label": "Abuse Detection (Bypass Rule 3.4a)",
        "message": "Papa roz mujhe marte hain aur koi sunne wala nahi. Ghar jaane se darr lagta hai.",
        "description": "Tests abuse short-circuit — HIGH+ABUSE routes to helpline ONLY (Childline 1098), personal contacts completely bypassed."
    },
    "false_positive_guard": {
        "label": "False Positive Guard (Phase 5)",
        "message": "I can't take this exam pressure, help me please with study tips.",
        "description": "Tests Phase 5 threshold tuning — should NOT escalate despite distress words in benign academic context."
    },
    "normal_chat": {
        "label": "Normal Conversation (No Risk)",
        "message": "Hi! Main thoda bored hoon aaj. Koi interesting topic batao?",
        "description": "Tests normal conversation flow — should classify NONE, no action taken."
    }
}


class DemoRequest(BaseModel):
    scenario: Optional[str] = None  # One of the keys in DEMO_SCENARIOS
    custom_message: Optional[str] = None  # Or provide your own message
    user_id: str = "demo-user-00000000"


@router.get("/scenarios", status_code=status.HTTP_200_OK)
async def list_demo_scenarios():
    """
    List all available demo scenarios for the YUVAA Saarthi system walkthrough.
    """
    return {
        "available_scenarios": [
            {
                "key": key,
                "label": val["label"],
                "description": val["description"],
                "message": val["message"]
            }
            for key, val in DEMO_SCENARIOS.items()
        ],
        "usage": "POST /demo/run with { 'scenario': '<key>' } or { 'custom_message': '<text>' }"
    }


@router.post("/run", status_code=status.HTTP_200_OK)
async def run_demo(payload: DemoRequest):
    """
    Full pipeline demo: runs a message through the complete YUVAA Saarthi system.

    Pipeline stages demonstrated:
      1. Keyword pre-filter (English + Hinglish tripwire)
      2. LLM risk classifier (Gemini → Groq failover)
      3. False positive threshold guard (Phase 5)
      4. RAG guideline retrieval (Supabase → in-memory fallback)
      5. Escalation routing decision (§3.4 + §3.4a)
    """
    # Resolve message
    if payload.scenario and payload.scenario in DEMO_SCENARIOS:
        message = DEMO_SCENARIOS[payload.scenario]["message"]
        scenario_meta = DEMO_SCENARIOS[payload.scenario]
    elif payload.custom_message:
        message = payload.custom_message.strip()
        scenario_meta = {"label": "Custom", "description": "User-provided message"}
    else:
        return {
            "error": "Provide either 'scenario' (from /demo/scenarios) or 'custom_message'."
        }

    results = {}

    # -------------------------------------------------------------------------
    # Stage 1: Keyword Pre-Filter
    # -------------------------------------------------------------------------
    triggered, matched_words, detected_lang = check_message_tripwire(message)
    results["stage_1_prefilter"] = {
        "triggered": triggered,
        "matched_keywords": matched_words,
        "detected_language": detected_lang,
        "verdict": "High-risk keyword detected" if triggered else "No tripwire triggered"
    }

    # -------------------------------------------------------------------------
    # Stage 2: LLM Risk Classifier
    # -------------------------------------------------------------------------
    classification = classify_message_risk(message)
    results["stage_2_classifier"] = {
        "severity": classification.severity,
        "category": classification.category,
        "rationale": classification.rationale,
        "verdict": _severity_label(classification.severity)
    }

    # -------------------------------------------------------------------------
    # Stage 3: Escalation Routing Decision
    # -------------------------------------------------------------------------
    action = route_safety_escalation(
        classification=classification,
        user_id=payload.user_id,
        message_id=None
    )
    escalation_explanation = {
        "routed_to_helpline": "Rule 3.4a: Abuse detected — personal contacts BYPASSED. Helplines surfaced.",
        "call_placed": "Rule 3.4: High severity — Bland AI call dispatched to emergency contact.",
        "logged_only": "Logged only — no escalation triggered at this severity level."
    }.get(action, action)

    results["stage_3_escalation"] = {
        "action_taken": action,
        "explanation": escalation_explanation,
        "contacts_called": action == "call_placed",
        "helpline_routed": action == "routed_to_helpline"
    }

    # -------------------------------------------------------------------------
    # Stage 4: RAG Guideline Retrieval
    # -------------------------------------------------------------------------
    rag_results = retrieve_relevant_guidelines(message, limit=2)
    results["stage_4_rag"] = {
        "guidelines_retrieved": len(rag_results),
        "sources": [
            {"source": g.get("source"), "title": g.get("title")}
            for g in rag_results
        ],
        "verdict": f"{len(rag_results)} relevant clinical guideline(s) retrieved for context injection"
    }

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    return {
        "demo_scenario": scenario_meta["label"],
        "input_message": message,
        "pipeline_results": results,
        "summary": {
            "risk_level": classification.severity.upper(),
            "category": classification.category,
            "action": action,
            "safe_to_proceed": classification.severity in ("none", "low"),
        }
    }


def _severity_label(severity: str) -> str:
    return {
        "none": "No risk detected",
        "low": "Low risk — monitoring",
        "medium": "Medium risk — in-app resources surfaced",
        "high": "HIGH RISK — escalation triggered"
    }.get(severity, severity)
