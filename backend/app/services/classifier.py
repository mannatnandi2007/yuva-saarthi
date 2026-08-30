import os
import json
import logging
from typing import Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.services.pre_filter import check_message_tripwire

logger = logging.getLogger(__name__)

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


CRISIS_DETECTION_SYSTEM_PROMPT = """You are the crisis detection system for the YUVAA Saarthi youth well-being companion.
Your task is to analyze the user's message (along with any prior context) and classify the level of safety risk.

Severity levels:
- none (normal conversational queries, everyday feelings, non-crisis)
- low (mild stress, daily venting, relationship confusion)
- medium (moderate sadness, anxiety, persistent distress, feeling overwhelmed)
- high (active self-harm ideation, suicide threats, ongoing abuse, domestic violence)

Categories:
- self_harm (suicidal thoughts, wanting to die, self-injury, cutting)
- abuse (physical abuse, domestic violence, caregiver beating, sexual assault, harassment)
- distress (anxiety, grief, exam pressure, loneliness, general sadness)
- none (no concerning symptoms detected)

Understand messages written in:
- English
- Hindi
- Hinglish (Hindi written in Roman English letters, e.g., 'mumma bohot marte hai', 'marna chahta hoon')

Return ONLY valid JSON matching this schema:
{
  "severity": "none|low|medium|high",
  "category": "self_harm|abuse|distress|none",
  "rationale": "Brief clinical/safety justification for the classification."
}

Do not give advice. Do not converse. Only return the JSON object."""


def classify_message_risk(message: str, rolling_summary: Optional[str] = None) -> RiskClassificationSchema:
    """
    LLM structured classification call (PRD §3.3 & §8).
    Analyzes user text and rolling conversation history.
    
    Architecture:
      1. High-speed tripwire screening (pre_filter.py): Instant deterministic capture of
         English and Hinglish high-risk phrases (self-harm and caregiver abuse).
      2. If LLM_API_KEY is configured: Calls LLM structured chain for nuanced classification.
      3. Guaranteed JSON validation via Pydantic RiskClassificationSchema.
    """
    text_clean = message.strip()
    text_lower = text_clean.lower()

    # Step 1: Check high-risk keyword tripwire (English + Hinglish)
    triggered, matched_words, detected_lang = check_message_tripwire(text_clean)
    matched_words_lower = [w.lower() for w in matched_words]

    if triggered:
        # Check high-severity self-harm tripwires
        self_harm_terms = [
            "suicide", "kill myself", "want to die", "hurt myself", "cut myself",
            "cut my wrist", "slit my wrist", "end my life", "end it all", "overdose",
            "can't take this pain", "disappear forever", "nobody would care if i died",
            "sleep and never wake up", "don't deserve to live", "punishing myself",
            "bleeding gives me relief", "burning or cutting my skin",
            "suicide karna", "jaan de dunga", "jaan de dungi", "apne aap ko nuksan",
            "khud ko cut", "marna chahta", "marna chahti", "mar jaunga", "mar jaungi",
            "zindagi khatam", "zehar kha", "dard bardasht nahi", "gayab ho jaaoon",
            "sab khatam karne", "mar bhi jaaoon", "kabhi na uthoon", "jeena deserve",
            "khud ko punish", "bleed karke", "skin burn", "marna", "jaan de"
        ]
        if any(any(k in w for k in self_harm_terms) for w in matched_words_lower) or any(k in text_lower for k in ["suicide", "kill myself", "marna chahta", "jaan de"]):
            return RiskClassificationSchema(
                severity="high",
                category="self_harm",
                rationale=f"Tripwire detected self-harm indicators in {detected_lang}: {matched_words}"
            )

        # Check high-severity abuse tripwires (triggers Rule §3.4a bypass)
        abuse_terms = [
            "abuse", "domestic violence", "hit me", "beat me", "hitting me",
            "beating me", "parents hit me", "sexual assault", "molested",
            "touched me", "touching me inappropriately", "don't feel safe at home",
            "blackmailing me", "private pictures", "private pics", "lock me in a room",
            "forcing me to send photos", "scared to go home", "verbally abuse",
            "without my consent", "treat me like trash",
            "papa maarte", "mummy maarti", "mummy papa marte", "bhaiya maarte",
            "gali dete", "gaaliyaan dete", "ghar wale marte", "ganda maarte",
            "peette hain", "pitai", "roz maarte", "pitte hai", "galat chhua",
            "galat touch", "gandi tarah se touch", "safe feel nahi hota",
            "leak karne ki dhamki", "room mein lock", "dirty photos",
            "ghar jaane se darr", "bina mujhe touch", "kachre jaisa treat",
            "marte hai", "beating"
        ]
        if any(any(k in w for k in abuse_terms) for w in matched_words_lower) or any(k in text_lower for k in ["abuse", "marte hai", "beating", "hit me"]):
            return RiskClassificationSchema(
                severity="high",
                category="abuse",
                rationale=f"Tripwire detected abuse/violence indicators in {detected_lang}: {matched_words}"
            )

        # Distress tripwire
        return RiskClassificationSchema(
            severity="medium",
            category="distress",
            rationale=f"Tripwire detected distress signals in {detected_lang}: {matched_words}"
        )

    # Step 2: Multi-provider LLM classification (Gemini with auto-failover to Groq Cloud)
    llm_result = _call_llm_classifier(text_clean, rolling_summary)
    if llm_result:
        return llm_result

    # Step 3: Heuristic evaluation for mild/low distress indicators
    mild_distress_words = [
        "sad", "upset", "crying", "anxious", "nervous", "stressed", "lonely",
        "low", "confused", "scared", "tired of everything", "darr lag raha",
        "rona aa raha", "tension", "akela"
    ]
    if any(w in text_lower for w in mild_distress_words):
        return RiskClassificationSchema(
            severity="low",
            category="distress",
            rationale="User describes mild emotional distress or anxiety symptoms."
        )

    # Default: Benign / Normal conversation
    return RiskClassificationSchema(
        severity="none",
        category="none",
        rationale="No safety signals or concerning patterns detected in user query."
    )


def _call_llm_classifier(message: str, rolling_summary: Optional[str] = None) -> Optional[RiskClassificationSchema]:
    """
    Structured classification with automatic multi-provider failover:
    Primary: Google Gemini
    Auto-fallback: Groq Cloud (llama-3.3-70b-versatile)
    """
    import httpx

    user_prompt = f"User Message: {message}\n"
    if rolling_summary:
        user_prompt += f"Prior Context Summary: {rolling_summary}\n"

    # --- 1. Attempt Primary: Gemini ---
    gemini_key = settings.gemini_api_key or settings.llm_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
    if gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
        try:
            endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            headers = {"Authorization": f"Bearer {gemini_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gemini-1.5-flash",
                "messages": [
                    {"role": "system", "content": CRISIS_DETECTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }
            resp = httpx.post(endpoint, headers=headers, json=payload, timeout=5.0)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return RiskClassificationSchema(
                    severity=parsed.get("severity", "none").lower(),
                    category=parsed.get("category", "none").lower(),
                    rationale=parsed.get("rationale", "Classified by safety model.")
                )
            else:
                logger.warning("Primary LLM (Gemini) returned status %d. Attempting auto-failover to Groq Cloud...", resp.status_code)
        except Exception as ex:
            logger.warning("Primary LLM (Gemini) failed (%s). Attempting auto-failover to Groq Cloud...", ex)

    # --- 2. Attempt Fallback: Groq Cloud ---
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
        try:
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": CRISIS_DETECTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }
            resp = httpx.post(endpoint, headers=headers, json=payload, timeout=5.0)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return RiskClassificationSchema(
                    severity=parsed.get("severity", "none").lower(),
                    category=parsed.get("category", "none").lower(),
                    rationale=parsed.get("rationale", "Classified by safety model.")
                )
            else:
                logger.warning("Groq Cloud fallback returned status %d: %s", resp.status_code, resp.text)
        except Exception as ex:
            logger.warning("Groq Cloud fallback failed: %s", ex)

    return None


def route_safety_escalation(
    classification: RiskClassificationSchema, 
    user_id: str, 
    message_id: Optional[str] = None
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
    if severity == "high" and category == "abuse":
        logger.warning(
            "[CRITICAL SAFETY ROUTE §3.4a] Abuse detected at High severity. "
            "Bypassing personal contacts for user %s.", user_id
        )
        return "routed_to_helpline"

    # Normal Escalation Flow (PRD §3.4)
    # Triggered on High severity for other risk categories (self_harm, distress)
    elif severity == "high":
        logger.info(
            "[ESCALATION TRIGGERED §3.4] Self-harm/Distress at High severity. "
            "Alerts initiating for user %s.", user_id
        )
        return "call_placed"

    # Medium severity flow (in-app resources surfaced)
    elif severity == "medium":
        return "logged_only"

    else:
        # Normal message flow (low or none risk)
        return "logged_only"

