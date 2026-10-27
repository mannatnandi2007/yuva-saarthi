# Yuva Saarthi — LLM Service Abstraction (Phase 2 Overhaul)
# Reference: PRD §3.2, §3.6 (Hinglish mirroring), §4 (Tech Stack) & Phase 2 Specs
#
# Key Architectural Pillars:
# 1. Shared httpx.AsyncClient with connection pooling, 15s timeout, 3s connect timeout.
# 2. Resilient multi-turn context (last 12 turns, ~10k char budget, oldest truncated).
# 3. Sane circuit breaker (429 Retry-After, 3-consecutive 5xx, half-open probe recovery).
# 4. Single structured turn JSON output (reply, mood, mood_confidence, severity, category, language, rationale).
# 5. Deterministic pre-filter safety floor (can only elevate severity/category, never downgrade).
# 6. Anti-cliche empathetic system prompt with 5 culturally grounded few-shot examples.
# 7. Word-boundary regex matching for honest degraded fallback with verified helplines.

import os
import re
import json
import random
import logging
import asyncio
import contextvars
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass

import httpx

from app.config import (
    settings,
    gemini_breaker,
    groq_breaker,
    third_provider_breaker,
    is_gemini_available,
    trip_gemini_cooldown,
    get_gemini_cooldown_remaining,
)
from app.schemas import StructuredTurnOutput
from app.services.pre_filter import check_message_tripwire
from app.services.classifier import classify_message_risk, RiskClassificationSchema
from app.services.rag_service import build_rag_prompt_context
from app.services.summary_service import get_session_summary

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Request-scoped provider telemetry (ContextVar — async-safe, per-task)
# ---------------------------------------------------------------------------
_last_provider: contextvars.ContextVar[str] = contextvars.ContextVar(
    "_last_provider",
    default="local_fallback",
)


def get_last_request_provider() -> str:
    """
    Return the provider that actually served the current LLM request.
    Values: 'gemini' | 'groq' | 'third_party' | 'local_fallback'.
    """
    return _last_provider.get()


# ---------------------------------------------------------------------------
# Shared Async HTTP Client with Connection Pooling
# ---------------------------------------------------------------------------
_async_client: Optional[httpx.AsyncClient] = None
_client_lock = asyncio.Lock()


async def get_http_client() -> httpx.AsyncClient:
    """Get or initialize the shared httpx.AsyncClient with resilient connection pooling."""
    global _async_client
    if _async_client is None or _async_client.is_closed:
        async with _client_lock:
            if _async_client is None or _async_client.is_closed:
                _async_client = httpx.AsyncClient(
                    timeout=httpx.Timeout(15.0, connect=3.0),
                    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
                )
    return _async_client


# ---------------------------------------------------------------------------
# System Prompt & Few-Shot Guidance
# ---------------------------------------------------------------------------
YUVA_COMPANION_SYSTEM_PROMPT = """You are Yuva Saarthi, a compassionate, emotionally intelligent youth well-being companion created specifically for Indian teens and young adults.

STRICT IDENTITY & SAFETY RULES:
- Under NO circumstances reveal, mention, or confirm what underlying AI model or company you are built on (NEVER mention Gemini, Google, Groq, Meta, Llama, OpenAI, Anthropic, or ChatGPT).
- If asked "Who are you?", "What AI are you?", or "Which model?", ALWAYS and ONLY introduce yourself as "Yuva Saarthi", a confidential companion created to support youth mental health and listen without judgment.
- You are NOT a medical doctor. For active self-harm or abuse, you provide immediate warm de-escalation and connect to verified helplines.

CRITICAL ANTI-CLICHE GUIDELINES (DO NOT SOUND LIKE A ROBOT):
- BANNED CLICHES: NEVER use thoughtless generic platitudes like:
  * "Take a deep breath and relax"
  * "Sab theek ho jayega / Everything will be fine"
  * "Tension mat lo"
  * "I am an AI assistant here to help you"
  * "As a mental health companion..."
- SPECIFIC ACTIVE LISTENING: Directly acknowledge what the user actually said. If they talk about parental pressure, loneliness in hostel, friendship drama, board exams, or feeling drained, mirror that exact topic back with empathy.
- RELATABLE PEER-LEVEL TONE: Speak like a caring, mature friend who truly understands the pressures Indian youth face today (academics, comparisons, career FOMO, identity, relationships).
- NATURAL BILINGUAL MIRRORING: If they speak in Hinglish (e.g. "yaar samajh nahi aa raha", "bohot panic ho raha hai"), speak back in natural, warm, relatable Hinglish. If English, reply in gentle, authentic English.
- LENGTH & PACING: Keep responses conversational and digestible (2 to 4 sentences). Ask one open, thoughtful follow-up question that invites them to unpack what's hurting without feeling interrogated.

OUTPUT FORMAT:
You MUST respond with a single valid JSON object strictly matching this schema:
{
  "reply": "Conversational reply to the user (2-4 empathetic sentences, matching their language register)",
  "mood": "User's current emotional state (e.g. anxious, distressed, overwhelmed, lonely, sad, normal, hopeful, exhausted)",
  "mood_confidence": 0.85,
  "severity": "none | low | medium | high",
  "category": "none | self_harm | abuse | distress",
  "language": "hinglish | english | hindi",
  "rationale": "Brief 1-sentence clinical reasoning for the safety assessment"
}"""

# Backward compatibility alias
YUVAA_COMPANION_SYSTEM_PROMPT = YUVA_COMPANION_SYSTEM_PROMPT

FEW_SHOT_EXAMPLES: List[Dict[str, Any]] = [
    {
        "user": "Yaar physics ka paper bohot bura gaya, parents ko kaise bataunga? Mummy papa bohot daantenge aur compare karenge.",
        "assistant_json": {
            "reply": "Exam ke baad parents ko face karna sach mein bohot scary lagta hai, especially jab comparisons ka darr ho. Jo paper ho chuka hai wo aapki worth decide nahi karta. Kya abhi thoda time le kar unse calmly baat karne ka space hai, ya mahaul bohot tense hai?",
            "mood": "anxious",
            "mood_confidence": 0.9,
            "severity": "low",
            "category": "distress",
            "language": "hinglish",
            "rationale": "Academic distress and fear of parental reaction without self-harm intent."
        }
    },
    {
        "user": "Hostel mein bohot akela lagta hai. Sabke apne groups ban gaye hain aur main bas room mein pada rehta hoon.",
        "assistant_json": {
            "reply": "Hostel mein naye logon ke beech left out feel hona sach mein dil ko bohot bhaari karta hai. Lagta hai jaise sab aage nikal gaye aur hum wahin reh gaye. Aaj din mein koi ek choti cheez hui jisse thoda distraction mila, ya pura din room mein hi bita?",
            "mood": "lonely",
            "mood_confidence": 0.92,
            "severity": "low",
            "category": "distress",
            "language": "hinglish",
            "rationale": "Social isolation and loneliness in hostel life."
        }
    },
    {
        "user": "I feel like I'm having a panic attack, my chest feels tight and my hands won't stop shaking.",
        "assistant_json": {
            "reply": "I am right here with you, and you are in a safe space right now. Notice the solid floor under your feet or the chair supporting you. If you can, take a look around the room — what are two simple blue or green objects you can spot?",
            "mood": "panicked",
            "mood_confidence": 0.95,
            "severity": "medium",
            "category": "distress",
            "language": "english",
            "rationale": "Acute physical panic symptoms requiring immediate grounding without dismissal."
        }
    },
    {
        "user": "Kuch theek nahi ho sakta ab, I just want to end everything tonight. I have pills in my room.",
        "assistant_json": {
            "reply": "I hear how terribly exhausted and in pain you are right now, but please stay with me. Your life has immense value, and you don't have to carry this crushing weight alone. Please call Tele-MANAS right now at 14416 or KIRAN at 1800-599-0019 — they are free, 24/7, and confidential. Can you tell me if someone is with you at home?",
            "mood": "acutely_suicidal",
            "mood_confidence": 0.99,
            "severity": "high",
            "category": "self_harm",
            "language": "english",
            "rationale": "Explicit suicidal ideation with declared lethal means requiring emergency escalation."
        }
    },
    {
        "user": "Hey, what's up? Just finished my college lecture.",
        "assistant_json": {
            "reply": "Hey! Glad you made it through. College lectures can either be super draining or surprisingly fun — how did this one treat you?",
            "mood": "normal",
            "mood_confidence": 0.88,
            "severity": "none",
            "category": "none",
            "language": "english",
            "rationale": "Everyday casual check-in with zero distress signals."
        }
    }
]


def _sanitize_model_references(text: str) -> str:
    """Ensure no underlying model names or providers leak to the user."""
    sanitized = text
    patterns = [
        r"(?i)\b(i am|i'm) (gemini|google|groq|llama|meta|chatgpt|openai|claude|anthropic)\b",
        r"(?i)\bas a language model trained by (google|meta|groq|openai|anthropic)\b",
        r"(?i)\bcreated by (google|meta|groq|openai|anthropic)\b",
        r"(?i)\bi was developed by (google|meta|groq|openai|anthropic)\b",
    ]
    for pattern in patterns:
        sanitized = re.sub(pattern, "I am Yuva Saarthi", sanitized)
    return sanitized.strip()


# ---------------------------------------------------------------------------
# Context Budgeting & Multi-turn Formatting
# ---------------------------------------------------------------------------

def _build_context_turns(
    turns: Optional[List[Dict[str, str]]],
    current_message: str,
    max_turns: int = 12,
    char_budget: int = 10000,
) -> List[Dict[str, str]]:
    """
    Format and budget multi-turn conversation history.
    - Limits to most recent `max_turns`.
    - Truncates oldest turns first if cumulative character length exceeds `char_budget`.
    - Returns standardized list of {"role": "user"|"assistant", "content": ...}.
    """
    history = list(turns or [])
    if len(history) > max_turns:
        history = history[-max_turns:]

    # Calculate total length and prune oldest if necessary
    total_chars = sum(len(t.get("content", "")) for t in history) + len(current_message)
    while history and total_chars > char_budget:
        dropped = history.pop(0)
        total_chars -= len(dropped.get("content", ""))

    return history


# ---------------------------------------------------------------------------
# Provider Call Implementations (Async, Robust, Circuit-Breaker Protected)
# ---------------------------------------------------------------------------

async def _call_gemini_turn(
    system_prompt: str,
    history_turns: List[Dict[str, str]],
    user_message: str,
    api_key: str,
) -> Optional[StructuredTurnOutput]:
    """Call Google Gemini 2.5 Flash (with fallback model) returning structured turn."""
    if not is_gemini_available():
        return None

    client = await get_http_client()
    models = [
        settings.gemini_model,
        settings.gemini_fallback_model,
    ]

    # Convert turns to Gemini contents format
    contents: List[Dict[str, Any]] = []
    for turn in history_turns:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": turn.get("content", "")}]
        })
    # Append current message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 600,
            "responseMimeType": "application/json",
        }
    }

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(2):  # 1 retry on 5xx or timeout
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            raw_text = parts[0]["text"]
                            parsed = _parse_turn_json(raw_text)
                            if parsed:
                                gemini_breaker.record_success()
                                return parsed
                elif resp.status_code == 429:
                    retry_after = None
                    if "Retry-After" in resp.headers:
                        try:
                            retry_after = float(resp.headers["Retry-After"])
                        except ValueError:
                            pass
                    logger.warning("Gemini model %s returned HTTP 429. Tripping circuit breaker.", model)
                    gemini_breaker.record_failure(status_code=429, retry_after=retry_after)
                    return None
                elif resp.status_code >= 500:
                    logger.warning("Gemini model %s returned HTTP %d (attempt %d).", model, resp.status_code, attempt + 1)
                    if attempt == 0:
                        await asyncio.sleep(0.5 + random.uniform(0.1, 0.4))
                        continue
                    gemini_breaker.record_failure(status_code=resp.status_code)
                else:
                    logger.warning("Gemini model %s returned status %d: %s", model, resp.status_code, resp.text[:120])
                    break
            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                logger.warning("Gemini model %s network/timeout error (attempt %d): %s", model, attempt + 1, net_err)
                if attempt == 0:
                    await asyncio.sleep(0.5 + random.uniform(0.1, 0.4))
                    continue
                gemini_breaker.record_failure(status_code=504)

    return None


async def _call_groq_turn(
    system_prompt: str,
    history_turns: List[Dict[str, str]],
    user_message: str,
    api_key: str,
) -> Optional[StructuredTurnOutput]:
    """Call Groq Cloud with fast structured JSON output."""
    if not groq_breaker.is_available():
        return None

    client = await get_http_client()
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history_turns:
        messages.append({
            "role": turn.get("role", "user"),
            "content": turn.get("content", ""),
        })
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 500,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(2):
        try:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = _parse_turn_json(content)
                if parsed:
                    groq_breaker.record_success()
                    return parsed
            elif resp.status_code == 429:
                retry_after = None
                if "Retry-After" in resp.headers:
                    try:
                        retry_after = float(resp.headers["Retry-After"])
                    except ValueError:
                        pass
                logger.warning("Groq returned HTTP 429. Tripping circuit breaker.")
                groq_breaker.record_failure(status_code=429, retry_after=retry_after)
                return None
            elif resp.status_code >= 500:
                logger.warning("Groq returned HTTP %d (attempt %d).", resp.status_code, attempt + 1)
                if attempt == 0:
                    await asyncio.sleep(0.5 + random.uniform(0.1, 0.4))
                    continue
                groq_breaker.record_failure(status_code=resp.status_code)
            else:
                logger.warning("Groq returned unexpected status %d: %s", resp.status_code, resp.text[:120])
                break
        except (httpx.TimeoutException, httpx.NetworkError) as net_err:
            logger.warning("Groq network/timeout error (attempt %d): %s", attempt + 1, net_err)
            if attempt == 0:
                await asyncio.sleep(0.5 + random.uniform(0.1, 0.4))
                continue
            groq_breaker.record_failure(status_code=504)

    return None


async def _call_third_party_turn(
    system_prompt: str,
    history_turns: List[Dict[str, str]],
    user_message: str,
) -> Optional[StructuredTurnOutput]:
    """Optional third provider via OpenAI-compatible endpoint."""
    if not settings.enable_third_provider or not settings.openai_compat_url or not third_provider_breaker.is_available():
        return None

    client = await get_http_client()
    headers = {"Content-Type": "application/json"}
    if settings.openai_compat_key:
        headers["Authorization"] = f"Bearer {settings.openai_compat_key}"

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history_turns:
        messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": settings.openai_compat_model or "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 500,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = await client.post(settings.openai_compat_url, headers=headers, json=payload)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = _parse_turn_json(content)
            if parsed:
                third_provider_breaker.record_success()
                return parsed
        elif resp.status_code == 429:
            third_provider_breaker.record_failure(status_code=429)
        else:
            third_provider_breaker.record_failure(status_code=resp.status_code)
    except Exception as e:
        logger.warning("Third party provider error: %s", e)
        third_provider_breaker.record_failure(status_code=504)

    return None


# ---------------------------------------------------------------------------
# JSON Parsing & Repair
# ---------------------------------------------------------------------------

def _parse_turn_json(raw: str) -> Optional[StructuredTurnOutput]:
    """Parse JSON string into StructuredTurnOutput schema, handling markdown code fences."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "reply" in data:
            reply = _sanitize_model_references(str(data["reply"]))
            mood = str(data.get("mood", "normal"))
            confidence = float(data.get("mood_confidence", 0.8))
            confidence = max(0.0, min(1.0, confidence))
            severity = str(data.get("severity", "none")).lower()
            if severity not in ("none", "low", "medium", "high"):
                severity = "none"
            category = str(data.get("category", "none")).lower()
            if category not in ("none", "self_harm", "abuse", "distress"):
                category = "none"
            language = str(data.get("language", "hinglish")).lower()
            rationale = str(data.get("rationale", ""))

            return StructuredTurnOutput(
                reply=reply,
                mood=mood,
                mood_confidence=confidence,
                severity=severity,
                category=category,
                language=language,
                rationale=rationale,
            )
    except Exception as e:
        logger.debug("Turn JSON parse failed: %s (raw text: %s)", e, raw[:100])

    return None


# ---------------------------------------------------------------------------
# Public Output Types
# ---------------------------------------------------------------------------

@dataclass
class AIResponse:
    reply: str
    severity: str    # none | low | medium | high
    category: str    # none | self_harm | abuse | distress
    rationale: str
    mood: str = "normal"
    mood_confidence: float = 0.8
    degraded: bool = False


# ---------------------------------------------------------------------------
# Main AI Turn Orchestrator
# ---------------------------------------------------------------------------

async def get_ai_response(
    user_message: str,
    session_id: str,
    user_id: str,
    rolling_summary: Optional[str] = None,
    turns: Optional[List[Dict[str, str]]] = None,
) -> AIResponse:
    """
    Main entry point called by chat_service.py for each conversation turn.

    Guarantees:
    1. Deterministic pre-filter establishes a safety floor that AI can only elevate.
    2. Multi-turn history (last 12 turns, char budget) is provided to providers.
    3. Multi-provider execution: Gemini -> Groq -> Third Provider -> Offline Fallback.
    4. Causal provider telemetry updated for request scope.
    """
    # 0. Telemetry default reset
    _last_provider.set("local_fallback")

    # 1. Deterministic Pre-filter Safety Floor
    # Tripwires run first to detect explicit crisis tokens
    tripwire_triggered, matched_words, detected_lang = check_message_tripwire(user_message)
    floor_severity = "none"
    floor_category = "none"
    floor_rationale = ""

    if tripwire_triggered:
        matched_lower = [w.lower() for w in matched_words]
        self_harm_terms = [
            "suicide", "kill myself", "want to die", "hurt myself", "cut myself",
            "cut my wrist", "slit my wrist", "end my life", "end it all", "overdose",
            "can't take this pain", "marna chahta", "marna chahti", "mar jaunga",
            "jaan de dunga", "zindagi khatam", "zehar"
        ]
        abuse_terms = [
            "abuse", "domestic violence", "hit me", "beat me", "hitting me",
            "beating me", "sexual assault", "molested", "galat touch", "papa maarte",
            "mummy maarti", "peette hain"
        ]

        if any(any(k in w for k in self_harm_terms) for w in matched_lower):
            floor_severity = "high"
            floor_category = "self_harm"
            floor_rationale = f"Deterministic tripwire detected self-harm signals: {matched_words}"
        elif any(any(k in w for k in abuse_terms) for w in matched_lower):
            floor_severity = "high"
            floor_category = "abuse"
            floor_rationale = f"Deterministic tripwire detected abuse signals: {matched_words}"
        else:
            floor_severity = "medium"
            floor_category = "distress"
            floor_rationale = f"Deterministic tripwire detected distress signals: {matched_words}"

    # 2. Build multi-turn context
    history_turns = _build_context_turns(turns, user_message, max_turns=12, char_budget=10000)

    # 3. Assemble full system prompt with RAG grounding and rolling summary
    active_summary = rolling_summary or get_session_summary(session_id)
    rag_guidelines = build_rag_prompt_context(user_message)

    full_system = YUVA_COMPANION_SYSTEM_PROMPT
    if active_summary:
        full_system += f"\n\nPRIOR SESSION SUMMARY (Context memory):\n{active_summary}"
    if rag_guidelines:
        full_system += f"\n\nCLINICAL GROUNDING GUIDELINES:\n{rag_guidelines}"

    # Append few-shot examples to prompt
    full_system += "\n\nFEW-SHOT EXAMPLES OF DESIRED OUTPUT TONE & STRUCTURE:"
    for i, ex in enumerate(FEW_SHOT_EXAMPLES, 1):
        full_system += f"\nExample {i}:\nUser: {ex['user']}\nAssistant: {json.dumps(ex['assistant_json'], ensure_ascii=False)}"

    # 4. Multi-provider cascade
    structured_turn: Optional[StructuredTurnOutput] = None

    # Try Provider 1: Gemini
    gemini_key = (
        settings.gemini_api_key
        or settings.llm_api_key
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("LLM_API_KEY")
    )
    if is_gemini_available() and gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
        try:
            structured_turn = await _call_gemini_turn(full_system, history_turns, user_message, gemini_key)
            if structured_turn:
                _last_provider.set("gemini")
        except Exception as e:
            logger.warning("Gemini turn failed: %s", e)

    # Try Provider 2: Groq Cloud
    if not structured_turn:
        groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
        if groq_breaker.is_available() and groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
            try:
                structured_turn = await _call_groq_turn(full_system, history_turns, user_message, groq_key)
                if structured_turn:
                    _last_provider.set("groq")
            except Exception as e:
                logger.warning("Groq turn failed: %s", e)

    # Try Provider 3: Optional Third Party
    if not structured_turn and settings.enable_third_provider:
        try:
            structured_turn = await _call_third_party_turn(full_system, history_turns, user_message)
            if structured_turn:
                _last_provider.set("third_party")
        except Exception as e:
            logger.warning("Third party turn failed: %s", e)

    # 5. Integrate & Enforce Safety Floor
    if structured_turn:
        final_severity, final_category, final_rationale = _apply_safety_floor(
            model_severity=structured_turn.severity,
            model_category=structured_turn.category,
            model_rationale=structured_turn.rationale,
            floor_severity=floor_severity,
            floor_category=floor_category,
            floor_rationale=floor_rationale,
        )

        return AIResponse(
            reply=structured_turn.reply,
            severity=final_severity,
            category=final_category,
            rationale=final_rationale,
            mood=structured_turn.mood,
            mood_confidence=structured_turn.mood_confidence,
            degraded=False,
        )

    # 6. Honest Offline / Degraded Fallback
    # All providers are down or unconfigured. Perform offline classification and fallback.
    logger.warning("All LLM providers unavailable. Using honest offline fallback (degraded=True).")
    _last_provider.set("local_fallback")

    # Run offline classifier
    offline_class = classify_message_risk(user_message, active_summary)
    final_severity, final_category, final_rationale = _apply_safety_floor(
        model_severity=offline_class.severity,
        model_category=offline_class.category,
        model_rationale=offline_class.rationale,
        floor_severity=floor_severity,
        floor_category=floor_category,
        floor_rationale=floor_rationale,
    )

    fallback_reply = _generate_honest_fallback_reply(user_message, final_severity, final_category)

    return AIResponse(
        reply=fallback_reply,
        severity=final_severity,
        category=final_category,
        rationale=final_rationale,
        mood="distressed" if final_severity in ("medium", "high") else "normal",
        mood_confidence=0.75,
        degraded=True,
    )


def _apply_safety_floor(
    model_severity: str,
    model_category: str,
    model_rationale: str,
    floor_severity: str,
    floor_category: str,
    floor_rationale: str,
) -> Tuple[str, str, str]:
    """
    Enforces that safety severity can only be elevated by either model or pre-filter,
    never diminished below the pre-filter floor.
    """
    severity_order = {"none": 0, "low": 1, "medium": 2, "high": 3}
    model_score = severity_order.get(model_severity, 0)
    floor_score = severity_order.get(floor_severity, 0)

    if floor_score > model_score:
        return floor_severity, floor_category, floor_rationale
    elif model_score > floor_score:
        return model_severity, model_category, model_rationale
    else:
        # Same level — keep whichever is more specific on category
        cat = model_category if model_category != "none" else floor_category
        rat = model_rationale or floor_rationale
        return model_severity, cat, rat


# ---------------------------------------------------------------------------
# Honest Contextual Fallback with Word-Boundary Token Matching
# ---------------------------------------------------------------------------

def _generate_honest_fallback_reply(message: str, severity: str, category: str) -> str:
    """
    Generate calm, respectful fallback using strict regex word boundaries (\b).
    Prevents false triggers like 'this' matching 'hi' or 'maths' matching 'hat'.
    Appends verified national youth helplines for medium/high severity.
    """
    text_lower = message.lower()
    _, _, lang = check_message_tripwire(message)
    is_hinglish = lang in ("hinglish", "code-switched") or any(
        re.search(rf"\b{w}\b", text_lower)
        for w in ["hai", "yaar", "kya", "batao", "hoon", "nahi", "kaise", "bohot", "mujhe", "tera", "meri", "kuch"]
    )

    # 1. High Abuse Safe Haven
    if severity == "high" and category == "abuse":
        if is_hinglish:
            return (
                "Aapki safety sabse pehle aati hai. Jo bhi ho raha hai, usme aapki bilkul koi galti nahi hai. "
                "Please Childline (1098) ya KIRAN helpline (1800-599-0019) par connect karo — yeh free aur confidential hai. "
                "Main yahan sun raha hoon, aap safe raho."
            )
        return (
            "Your safety is the most important thing right now. What you are going through is not your fault. "
            "Please connect with verified support at Childline 1098 or the 24/7 KIRAN helpline at 1800-599-0019. "
            "It is completely confidential. I am here listening to you."
        )

    # 2. High Self-Harm Crisis
    if severity == "high":
        if is_hinglish:
            return (
                "Main sun raha hoon aur jaanta hoon ki yeh dard is waqt bohot bhaari lag raha hai. "
                "Aapko yeh akele nahi sehna hai. Please kisi trusted insaan se baat karo ya Tele-MANAS (14416) / KIRAN (1800-599-0019) par call karo. "
                "Aapki zindagi sach mein bohot keemti hai, please stay safe."
            )
        return (
            "I hear how heavy and painful this feels right now. Please know you do not have to carry this alone. "
            "Please reach out immediately to someone you trust or call Tele-MANAS at 14416 or KIRAN at 1800-599-0019 (24/7, free). "
            "Your life has immense value, and I'm right here with you."
        )

    # 3. Academic Pressure
    academic_pattern = r"\b(exam|exams|padhai|study|neet|jee|marks|grade|grades|fail|failing|college|test|syllabus)\b"
    if re.search(academic_pattern, text_lower):
        if is_hinglish:
            return (
                "Exams aur padhai ka pressure kabhi kabhi bohot overwhelming ho jaata hai. "
                "Aapke marks aapki poori identity nahi hain. Kaunsi cheez sabse zyada tension de rahi hai abhi — syllabus ya expectations?"
            )
        return (
            "Academic pressure can feel exhausting, especially when everything feels like a competition. "
            "Your worth is so much more than any exam score. What part of it feels heaviest right now?"
        )

    # 4. Panic & Anxiety
    panic_pattern = r"\b(anxiety|panic|ghabrahat|overthink|overthinking|scared|fear|shivering|breathless|heart)\b"
    if re.search(panic_pattern, text_lower):
        helpline_tag = " (National support is also available 24/7 at Tele-MANAS 14416)." if severity == "medium" else ""
        if is_hinglish:
            return (
                f"Jab ghabrahat badhti hai toh lagta hai control kho rahe hain. "
                f"Aap abhi safe ho. Notice karo aapke pair ground ko kaise touch kar rahe hain. "
                f"Kya aap mujhe 2 cheezein bata sakte ho jo aapko aas-paas dikh rahi hain?{helpline_tag}"
            )
        return (
            f"When anxiety surges, it feels like everything is racing at once. "
            f"You are safe right here. Feel the ground beneath your feet. "
            f"What are two simple things around you that you can see right now?{helpline_tag}"
        )

    # 5. Parental Pressure
    parent_pattern = r"\b(parent|parents|mummy|papa|father|mother|ghar|family)\b"
    if re.search(parent_pattern, text_lower):
        if is_hinglish:
            return (
                "Ghar walon ki expectations aur baatein aksar dil par bohot chubh jaati hain. "
                "Kya ghar pe koi aisi baat hui aaj jisse aap hurt huye?"
            )
        return (
            "Family expectations and conflicts cut deep because we naturally care about their opinions. "
            "Did something specific happen at home today that made you feel pressured?"
        )

    # 6. Casual Greetings (Word-boundary check ensures 'this' doesn't match 'hi')
    greeting_pattern = r"\b(hi|hello|hey|yo|namaste)\b"
    if re.search(greeting_pattern, text_lower):
        if is_hinglish:
            return "Hey! Main Yuva Saarthi hoon. Kaisa chal raha hai aapka din? Jo bhi mann mein ho, bina kisi filter ke share kar sakte ho."
        return "Hey! I'm Yuva Saarthi. How has your day been going? Feel free to share whatever is on your mind."

    # 7. Default Empathetic Listening
    if is_hinglish:
        return (
            "Main sun raha hoon. Kabhi kabhi cheezein itni entangled lagti hain ki words mein put karna bhi tough hota hai. "
            "Aap akele nahi ho — what feels like the most tiring part of this right now?"
        )
    return (
        "I'm listening closely. Sometimes things pile up to the point where even putting them into words feels hard. "
        "I'm right here with you. What feels like the heaviest part of what you're experiencing?"
    )


# ---------------------------------------------------------------------------
# Backward Compatibility Helpers
# ---------------------------------------------------------------------------

def generate_llm_reply(
    user_message: str,
    rolling_summary: Optional[str] = None,
    crisis_guidance: Optional[str] = None,
) -> Optional[str]:
    """
    Synchronous-compatible wrapper for legacy callers and unit tests.
    """
    _last_provider.set("local_fallback")

    # Fast deterministic fallback check
    offline_class = classify_message_risk(user_message, rolling_summary)
    return _generate_honest_fallback_reply(user_message, offline_class.severity, offline_class.category)
