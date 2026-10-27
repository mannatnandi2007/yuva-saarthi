# Yuva Saarthi Rolling Summary Generator
# Reference: PRD §3.2 (Rolling 150-word Conversation Summary) & Execution Plan Day 5
# Owned by Mannat (Phase 4: Rolling Summary Generator)

import os
import re
import logging
from typing import Optional, Dict

from app.config import settings, is_gemini_available, trip_gemini_cooldown
from app.supabase_client import supabase

logger = logging.getLogger(__name__)

# Local in-memory store for session summaries when offline/dev-mode
_IN_MEMORY_SUMMARIES: Dict[str, str] = {}

SUMMARY_SYSTEM_PROMPT = """You are an expert conversational context summarizer for Yuva Saarthi, a youth mental well-being companion.
Your task is to maintain a concise rolling summary (STRICT MAXIMUM 150 WORDS) of the ongoing dialogue.

Guidelines:
1. Capture the user's primary emotional state, recurring stressors (e.g., exams, parents, loneliness, social friction), and disclosed relationships.
2. Note any safety themes or distress levels neutrally.
3. Omit casual greetings and filler chatter.
4. Keep the summary under 150 words as a single compact paragraph. Never exceed 150 words."""


def _truncate_to_word_cap(text: str, max_words: int = 150) -> str:
    """Strictly cap summary text to ~150 words."""
    words = text.strip().split()
    if len(words) > max_words:
        return " ".join(words[:max_words]) + "..."
    return text.strip()


def generate_rolling_summary(
    existing_summary: Optional[str],
    user_message: str,
    assistant_reply: str
) -> str:
    """
    Generate an updated rolling summary incorporating the latest turn.
    Multi-provider with Gemini -> Groq failover -> local deterministic fallback.
    """
    turn_context = (
        f"Prior Summary: {existing_summary or 'New session started.'}\n"
        f"Latest User Message: {user_message}\n"
        f"Companion Response: {assistant_reply}\n"
        f"Generate updated rolling summary (max 150 words):"
    )

    # 1. Attempt Gemini (if not in quota cooldown)
    gemini_key = settings.gemini_api_key or settings.llm_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
    if is_gemini_available() and gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
        try:
            import httpx
            ACTIVE_MODELS = [
                settings.gemini_model,
                settings.gemini_fallback_model,
            ]
            for model_name in ACTIVE_MODELS:
                endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": f"{SUMMARY_SYSTEM_PROMPT}\n\n{turn_context}"}]
                    }],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 200
                    }
                }
                try:
                    resp = httpx.post(endpoint, json=payload, timeout=httpx.Timeout(5.0, connect=2.0))
                    if resp.status_code == 200:
                        data = resp.json()
                        summary = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        return _truncate_to_word_cap(summary)
                    elif resp.status_code == 429:
                        logger.warning("Summary Gemini model %s quota reached (HTTP 429). Tripping cooldown...", model_name)
                        trip_gemini_cooldown(45.0)
                        break
                except Exception as sum_model_err:
                    logger.warning("Summary Gemini model %s failed: %s", model_name, sum_model_err)
                    continue

        except Exception as e:
            logger.warning("Gemini summary generation failed: %s.", e)

    # 2. Attempt Groq Cloud
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
        try:
            import httpx
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": turn_context}
                ],
                "temperature": 0.2,
                "max_tokens": 200
            }
            resp = httpx.post(endpoint, headers=headers, json=payload, timeout=5.0)
            if resp.status_code == 200:
                summary = resp.json()["choices"][0]["message"]["content"]
                return _truncate_to_word_cap(summary)
        except Exception as e:
            logger.warning("Groq summary generation failed: %s", e)


    # 3. Local Deterministic Fallback Summarizer
    clean_user = user_message.strip().replace("\n", " ")
    if not existing_summary or "New session started" in existing_summary:
        fallback = f"User initiated dialogue sharing: '{clean_user[:80]}'. Companion provided supportive listening."
    else:
        fallback = f"{existing_summary} Most recently, user discussed: '{clean_user[:60]}'."
    return _truncate_to_word_cap(fallback)


def get_session_summary(session_id: str) -> Optional[str]:
    """Fetch current rolling summary snapshot for a session."""
    if session_id in _IN_MEMORY_SUMMARIES:
        return _IN_MEMORY_SUMMARIES[session_id]

    try:
        res = supabase.table("sessions").select("summary_snapshot").eq("id", session_id).single().execute()
        if res.data and res.data.get("summary_snapshot"):
            return res.data["summary_snapshot"]
    except Exception:
        pass
    return None


def save_session_summary(session_id: str, summary_text: str) -> None:
    """Save rolling summary to session row in Supabase and in-memory cache."""
    capped_text = _truncate_to_word_cap(summary_text)
    _IN_MEMORY_SUMMARIES[session_id] = capped_text

    try:
        supabase.table("sessions").update({"summary_snapshot": capped_text}).eq("id", session_id).execute()
        logger.debug("Persisted summary for session %s: %s", session_id, capped_text[:50])
    except Exception as e:
        logger.debug("Could not write summary to DB (%s); cached in-memory.", e)
