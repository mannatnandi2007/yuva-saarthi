# YUVAA Saarthi Risk Classifier
# Phase 5: False positive threshold tuning applied.
import os
import json
import logging
from typing import Optional
from pydantic import BaseModel, Field

from app.config import settings, is_gemini_available, trip_gemini_cooldown
from app.services.pre_filter import check_message_tripwire

logger = logging.getLogger(__name__)

# =========================================================================
# PHASE 5: FALSE POSITIVE GUARD LISTS
# These patterns commonly appear in benign messages and should NOT trigger
# high-severity classifications unless accompanied by stronger context.
# =========================================================================

# Phrases that, when the ENTIRE message is very short and matches one of
# these, are likely benign. E.g. "can't take it anymore" about exam stress.
BENIGN_CONTEXT_PHRASES: list = [
    "can't take this exam",
    "can't take the pressure",
    "can't take school",
    "can't take this class",
    "hate my school",
    "hate my marks",
    "hate maths",
    "help me please with",
    "help me please in",
    "help me with",
    "hopeless about",
    "hopeless at",
    "nobody understands maths",
    "nobody understands this subject",
    "can't breathe because of exam",
    "panic attacks during exam",
    "falling apart because of marks",
]

# Minimum message length (words) to classify as 'medium' via tripwire alone.
# Very short messages like 'sad' or 'help' should not auto-escalate.
MIN_WORDS_FOR_MEDIUM_TRIPWIRE = 4

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


CRISIS_DETECTION_SYSTEM_PROMPT = """You are the clinical safety and risk classification system for YUVAA Saarthi, an Indian youth mental well-being companion.
Your job is to deeply understand the user's intent, emotional state, context, and nuance. You understand English, Hindi, and colloquial Hinglish (Hindi in Latin alphabet).

CRITICAL CONTEXTUAL & CULTURAL UNDERSTANDING (Meaning changes person-to-person):
1. Colloquial Exaggeration / Hyperbole vs Real Crisis:
   Indian youth frequently use dramatic figures of speech that DO NOT indicate actual self-harm or suicide.
   - "yaar maths ka paper dekh ke mar jaunga" -> Academic stress / hyperbole. Severity: low or medium (category: distress), NOT self-harm!
   - "itni garmi hai mar jaunga", "bore ho ke mar jaunga" -> Casual hyperbole. Severity: none or low, NOT self-harm!
   - "mummy daant ke maar daalengi" -> Common colloquial expression for strict parents. Severity: low/medium distress, NOT domestic abuse!
   - "giving up on this assignment / code" -> Task frustration, NOT self-harm!
2. Genuine Crisis (High Severity):
   - Explicit intent, desire, or plan to end their life, commit suicide, self-injure, or ongoing domestic violence / severe abuse.
   - "suicide kr rha hu bro", "i feel like suiciding", "zindagi khatam karne ja raha hoon", "nobody would care if i died, i have pills".
   - Severity: high, category: self_harm or abuse.

Severity levels:
- none: everyday chat, casual thoughts, neutral topics.
- low: mild sadness, daily venting, relationship confusion, exam stress.
- medium: persistent anxiety, feelings of worthlessness, feeling deeply overwhelmed or hopeless without active suicidal intent.
- high: active suicidal ideation, intent to self-harm, suicide threats, active domestic violence or sexual abuse.

Categories:
- self_harm: suicidal thoughts, wanting to die, self-injury, cutting.
- abuse: domestic violence, caregiver beating, sexual assault, harassment.
- distress: anxiety, grief, academic pressure, loneliness, general sadness.
- none: no safety concern.

Return ONLY valid JSON matching this schema:
{
  "severity": "none|low|medium|high",
  "category": "self_harm|abuse|distress|none",
  "rationale": "Clinical rationale explaining why this is or isn't a crisis, accounting for colloquial hyperbole vs genuine intent."
}"""


def classify_message_risk(message: str, rolling_summary: Optional[str] = None) -> RiskClassificationSchema:
    """
    Semantic risk classification (PRD §3.3 & §8).
    
    1. Primary: LLM semantic evaluation (Gemini 2.5 Flash / Groq) that understands
       context, tone, colloquial idioms ('mar jaunga exam mein' vs genuine suicide),
       and person-to-person nuance.
    2. Fallback: Tripwire heuristics used ONLY when LLM services are offline.
    """
    text_clean = message.strip()
    text_lower = text_clean.lower()

    # Step 1: PRIMARY — Call LLM classifier for semantic understanding of context & intent
    llm_result = _call_llm_classifier(text_clean, rolling_summary)
    if llm_result:
        logger.info(
            "[SEMANTIC CLASSIFIER] Message: '%s' -> Severity: %s, Category: %s (Rationale: %s)",
            text_clean[:60], llm_result.severity, llm_result.category, llm_result.rationale[:80]
        )
        return llm_result

    # Step 2: FALLBACK — Tripwire evaluation ONLY if LLM is completely offline
    logger.warning("[FALLBACK CLASSIFIER] LLM offline; falling back to heuristic tripwire evaluation.")
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
            "khud ko punish", "bleed karke", "skin burn", "marna", "jaan de", "suicid"
        ]
        if any(any(k in w for k in self_harm_terms) for w in matched_words_lower) or any(k in text_lower for k in ["suicid", "kill myself", "marna chahta", "jaan de", "mar rha hu", "mar raha hu"]):
            return RiskClassificationSchema(
                severity="high",
                category="self_harm",
                rationale=f"Offline tripwire detected self-harm indicators in {detected_lang}: {matched_words}"
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

        # --- PHASE 5: False positive guard for distress tripwire ---
        # Before flagging medium, check benign context and minimum message length
        word_count = len(text_clean.split())
        text_lower_full = text_clean.lower()

        # If message is very short, don't over-classify from tripwire alone
        if word_count < MIN_WORDS_FOR_MEDIUM_TRIPWIRE:
            logger.debug("[FP GUARD] Short message (%d words) — downgrading tripwire to low.", word_count)
            return RiskClassificationSchema(
                severity="low",
                category="distress",
                rationale=f"Short message with distress signal ({detected_lang}). Insufficient context for medium escalation."
            )

        # If message matches a known benign-context phrase, downgrade to low
        if any(phrase in text_lower_full for phrase in BENIGN_CONTEXT_PHRASES):
            logger.debug("[FP GUARD] Benign context phrase matched — downgrading to low.")
            return RiskClassificationSchema(
                severity="low",
                category="distress",
                rationale="Distress signal detected in likely academic/contextual (non-crisis) context."
            )

        # Distress tripwire — medium classification
        return RiskClassificationSchema(
            severity="medium",
            category="distress",
            rationale=f"Tripwire detected distress signals in {detected_lang}: {matched_words}"
        )

    # Step 3: Heuristic evaluation for mild/low distress indicators (offline fallback)
    # PHASE 5: Tightened list — only include terms with strong emotional signal
    mild_distress_words = [
        "sad", "crying", "anxious", "stressed", "lonely",
        "scared", "tired of everything", "darr lag raha",
        "rona aa raha", "akela"
    ]
    # PHASE 5: Require the message to have some minimum length for low-distress flag
    if len(text_clean.split()) >= 3 and any(w in text_lower for w in mild_distress_words):
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

    # --- 1. Attempt Primary: Gemini (if not in quota cooldown) ---
    gemini_key = settings.gemini_api_key or settings.llm_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
    if is_gemini_available() and gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
        try:
            full_prompt = f"{CRISIS_DETECTION_SYSTEM_PROMPT}\n\n{user_prompt}"
            ACTIVE_MODELS = [
                "gemini-flash-latest",
                "gemini-3.8-flash",
                "gemini-3.1-flash-lite",
                "gemini-3.1-pro-preview",
            ]
            for model in ACTIVE_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
                }
                try:
                    resp = httpx.post(url, json=payload, timeout=httpx.Timeout(1.8, connect=1.0))
                    if resp.status_code == 200:
                        candidates = resp.json().get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                parsed = json.loads(parts[0]["text"])
                                sev = parsed.get("severity", "none").lower()
                                cat = parsed.get("category", "none").lower()
                                # Normalize category if LLM returns a variant
                                if "suicid" in cat or "self" in cat or "harm" in cat:
                                    cat = "self_harm"
                                elif "abuse" in cat or "violen" in cat:
                                    cat = "abuse"
                                elif "distress" in cat or "mental" in cat or "crisis" in cat:
                                    cat = "distress"
                                return RiskClassificationSchema(
                                    severity=sev,
                                    category=cat,
                                    rationale=parsed.get("rationale", "Classified by safety model.")
                                )
                    elif resp.status_code == 429:
                        logger.warning("Classifier Gemini model %s quota reached (HTTP 429). Tripping cooldown and switching directly to Groq Cloud...", model)
                        trip_gemini_cooldown(180.0)
                        break
                except Exception as model_err:
                    logger.warning("Classifier Gemini model %s failed: %s", model, model_err)
                    continue

            logger.warning("[FAILOVER] Gemini pool exhausted for classifier. Tripping 180s cooldown and redirecting to Groq Cloud...")
            trip_gemini_cooldown(180.0)
        except Exception as ex:
            logger.warning("Primary LLM (Gemini) failed (%s). Tripping cooldown and switching to Groq Cloud...", ex)
            trip_gemini_cooldown(180.0)

    # --- 2. Attempt Fallback: Groq Cloud ---
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
        try:
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "qwen/qwen3.8-27b",
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

