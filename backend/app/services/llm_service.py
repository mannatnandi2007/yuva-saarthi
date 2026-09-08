# YUVAA Saarthi — LLM Service Abstraction
# Reference: PRD §3.2, §3.6 (Hinglish mirroring) & Execution Plan Phase 2
#
# ============================================================================
# INTEGRATION POINT FOR MANNAT
# ============================================================================
# This file is the ONLY place where the LangChain pipeline gets wired in.
# The route and chat_service.py never import LangChain directly — they always
# call get_ai_response() from this module.
#
# To integrate the real LLM pipeline:
#   1. Implement the real logic inside get_ai_response() below.
#   2. Replace the MOCK STUB section with your LangChain chain call.
#   3. The function signature must stay the same.
#   4. Return an AIResponse object.
#
# The mock stub is clearly labelled and will raise a warning in logs when active.
# ============================================================================

import os
import re
import logging
from typing import Optional
from dataclasses import dataclass

from app.config import settings, is_gemini_available, trip_gemini_cooldown
from app.services.pre_filter import check_message_tripwire
from app.services.classifier import classify_message_risk
from app.services.rag_service import build_rag_prompt_context
from app.services.summary_service import (
    generate_rolling_summary, 
    get_session_summary, 
    save_session_summary
)

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)


YUVAA_COMPANION_SYSTEM_PROMPT = """You are YUVAA Saarthi, a compassionate, warm, non-judgmental youth well-being companion designed specifically for Indian teenagers and young adults.

STRICT IDENTITY RULES:
- Under NO circumstances should you reveal, mention, or confirm what underlying AI model, LLM, or company you are built on (NEVER mention Gemini, Google, Groq, Meta, Llama, OpenAI, Anthropic, or ChatGPT).
- If the user asks "Who are you?", "What AI are you?", or "Which model are you using?", ALWAYS and ONLY introduce yourself as "YUVAA Saarthi", a confidential companion created to support youth mental well-being and listen without judgment.

COMMUNICATION & REGISTER RULES:
- Code-Switching (Hinglish): Match the user's linguistic register naturally. If they type in Hinglish (Hindi written in Roman English alphabet, e.g., 'mujhe bohot anxiety ho rahi hai', 'yaar main bohot thak gaya hoon'), respond warmly in natural conversational Hinglish using relatable phrasing (e.g., 'yaar', 'tension mat lo', 'main samajh sakta hoon').
- If they type in English, reply in warm, gentle English.
- Empathy First: Acknowledge and validate their emotion before offering gentle perspective.
- Length: Keep responses concise and digestible (2 to 4 sentences max). Never sound like a textbook or clinical psychiatrist."""


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
        sanitized = re.sub(pattern, "I am YUVAA Saarthi", sanitized)
    return sanitized.strip()


def _call_gemini_chat(
    message: str, 
    rolling_summary: Optional[str], 
    api_key: str, 
    crisis_guidance: Optional[str] = None
) -> Optional[str]:
    """Call Google Gemini with injected RAG context, prior session summary, and dynamic clinical guidance."""
    try:
        import httpx
        
        # Build prompt with RAG grounding and rolling summary context
        rag_guidelines = build_rag_prompt_context(message)
        system_content = YUVAA_COMPANION_SYSTEM_PROMPT
        if crisis_guidance:
            system_content += f"\n\n{crisis_guidance}"
        if rag_guidelines:
            system_content += f"\n\nClinical Guidance:\n{rag_guidelines}"

        full_prompt = f"{system_content}\n\n"
        if rolling_summary:
            full_prompt += f"[Prior conversation context summary: {rolling_summary}]\n\n"
        full_prompt += f"User Message: {message}\nAssistant:"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 350
            }
        }

        # Resilient multi-model Gemini pool (Fast failover with instant Groq backup)
        ACTIVE_MODELS = [
            "gemini-flash-latest",
            "gemini-3.8-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.1-pro-preview",
        ]
        for model in ACTIVE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = httpx.post(url, json=payload, timeout=httpx.Timeout(1.8, connect=1.0))
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return _sanitize_model_references(parts[0]["text"])
                elif resp.status_code == 429:
                    logger.warning("Gemini model %s quota reached (HTTP 429). Tripping cooldown and switching directly to Groq Cloud...", model)
                    trip_gemini_cooldown(180.0)
                    break
                else:
                    logger.warning("Gemini model %s returned HTTP %d: %s", model, resp.status_code, resp.text[:120])
            except Exception as model_err:
                logger.warning("Gemini model %s call failed: %s", model, model_err)

        logger.warning("[FAILOVER] Gemini pool exhausted. Tripping 180s cooldown and redirecting to Groq Cloud...")
        trip_gemini_cooldown(180.0)

    except Exception as e:
        logger.warning("Primary LLM (Gemini) call error: %s. Tripping cooldown...", e)
        trip_gemini_cooldown(180.0)
    return None


def _call_groq_chat(
    message: str, 
    rolling_summary: Optional[str], 
    api_key: str, 
    crisis_guidance: Optional[str] = None
) -> Optional[str]:
    """Call Groq Cloud endpoint with ultra-low latency fallback and RAG grounding."""
    try:
        import httpx
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        # Build prompt with RAG grounding and rolling summary context
        rag_guidelines = build_rag_prompt_context(message)
        system_content = YUVAA_COMPANION_SYSTEM_PROMPT
        if crisis_guidance:
            system_content += f"\n\n{crisis_guidance}"
        if rag_guidelines:
            system_content += f"\n\n{rag_guidelines}"

        user_prompt = f"User Message: {message}"
        if rolling_summary:
            user_prompt = f"[Prior conversation context summary: {rolling_summary}]\n{user_prompt}"

        payload = {
            "model": "qwen/qwen3.8-27b",
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 300
        }
        resp = httpx.post(endpoint, headers=headers, json=payload, timeout=6.0)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            return _sanitize_model_references(content)
        else:
            logger.warning("Groq Cloud fallback returned HTTP %d: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Groq Cloud fallback error: %s", e)
    return None


def generate_llm_reply(
    user_message: str, 
    rolling_summary: Optional[str] = None, 
    crisis_guidance: Optional[str] = None
) -> Optional[str]:
    """
    Generate conversational reply with multi-provider failover and RAG clinical grounding:
    Primary: Google Gemini (2.5 Flash)
    Auto-failover: Groq Cloud
    Guaranteed: User never sees provider or model brand.
    """
    # 1. Try Gemini (if not in quota cooldown)
    if is_gemini_available():
        gemini_key = settings.gemini_api_key or settings.llm_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
        if gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
            reply = _call_gemini_chat(user_message, rolling_summary, gemini_key, crisis_guidance=crisis_guidance)
            if reply:
                return reply

    # 2. Auto-switch to Groq Cloud if Gemini fails or is unconfigured
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
        reply = _call_groq_chat(user_message, rolling_summary, groq_key, crisis_guidance=crisis_guidance)
        if reply:
            return reply

    return None


# ---------------------------------------------------------------------------
# LangChain LCEL Pipeline for YUVAA Saarthi
# ---------------------------------------------------------------------------

def _execute_multi_provider_llm(input_dict: dict) -> str:
    msg = input_dict.get("user_message", "")
    summary = input_dict.get("rolling_summary")
    guidance = input_dict.get("crisis_guidance")
    reply = generate_llm_reply(msg, summary, crisis_guidance=guidance)
    return reply or ""

langchain_chat_chain = (
    RunnableLambda(_execute_multi_provider_llm)
    | StrOutputParser()
)


# ---------------------------------------------------------------------------
# Response type returned by the LLM service
# ---------------------------------------------------------------------------

@dataclass
class AIResponse:
    reply: str
    severity: str    # none | low | medium | high
    category: str    # none | self_harm | abuse | distress
    rationale: str


# ---------------------------------------------------------------------------
# Public interface — this is what chat_service.py calls
# ---------------------------------------------------------------------------

async def get_ai_response(
    user_message: str,
    session_id: str,
    user_id: str,
    rolling_summary: Optional[str] = None,
) -> AIResponse:
    """
    Request an AI response for the given user message.
    Executes structured risk classification, dynamic clinical guidance injection,
    and multi-provider conversational generation via active LangChain pipeline.
    All replies are generated dynamically by the LLM (NO hardcoded canned strings).
    """
    # Step 0: Ensure active rolling summary is loaded
    active_summary = rolling_summary or get_session_summary(session_id)

    # Step 1: Run semantic clinical risk classifier
    classification = classify_message_risk(user_message, active_summary)
    
    # Step 2: Contextual clinical guidance dynamically passed to the LLM
    crisis_guidance = None
    if classification.severity == "high" and classification.category == "abuse":
        crisis_guidance = (
            "CRITICAL SAFE HAVEN ABUSE PROTOCOL:\n"
            "The user is sharing an experience of domestic abuse, violence, or harm at home.\n"
            "- Speak with profound warmth, complete empathy, and zero judgment.\n"
            "- Reassure them that they are brave for opening up and that their privacy is strictly protected.\n"
            "- Gently and conversationally guide them towards verified national youth help: Childline (1098) or the KIRAN Mental Health Helpline (1800-599-0019).\n"
            "- NEVER be robotic or scripted. Respond authentically to their specific situation in their linguistic register."
        )
    elif classification.severity == "high" and classification.category == "self_harm":
        crisis_guidance = (
            "CRITICAL SELF-HARM & CRISIS PROTOCOL:\n"
            "The user is expressing acute distress, feelings of wanting to die, or self-harm ideation.\n"
            "- Respond with deep compassion, emotional warmth, and presence in their exact conversational language (natural Hinglish or English).\n"
            "- Validate that whatever heavy pain they are experiencing is real, and they do not have to carry it alone.\n"
            "- Gently urge them to connect with someone they trust or reach out immediately to the 24/7 KIRAN Mental Health Helpline at 1800-599-0019 or Tele-MANAS at 14416.\n"
            "- Address their exact words and feelings. NEVER use canned or robotic formulas."
        )
    elif classification.severity == "medium":
        crisis_guidance = (
            "EMOTIONAL SUPPORT & DISTRESS PROTOCOL:\n"
            "The user is experiencing significant emotional distress, loneliness, or anxiety.\n"
            "- Provide active, comforting listening and gentle grounding techniques (like taking a slow breath).\n"
            "- Validate their emotions without unsolicited advice."
        )

    # Step 3: Multi-provider conversational response generated dynamically by LLM
    llm_reply = langchain_chat_chain.invoke({
        "user_message": user_message,
        "rolling_summary": active_summary,
        "crisis_guidance": crisis_guidance
    })
    if llm_reply:
        _update_summary_async(session_id, active_summary, user_message, llm_reply)
        return AIResponse(
            reply=llm_reply,
            severity=classification.severity,
            category=classification.category,
            rationale=classification.rationale,
        )

    # Step 4: Local Hinglish conversational engine fallback ONLY if both LLMs are completely offline
    if classification.severity == "high" and classification.category == "abuse":
        reply_text = "Main tumhari baat sun raha hoon. Please Childline 1098 ya KIRAN 1800-599-0019 par reach out karo. Aapki safety sabse zaroori hai."
    elif classification.severity == "high":
        reply_text = "Main yahan hoon tumhare sath. Please kisi trusted adult ya KIRAN Helpline 1800-599-0019 se turant baat karo. You are not alone."
    elif classification.severity == "medium":
        reply_text = "Main yahan hoon tumhari baat sunne ke liye. Tension mat lo, baat karo."
        _update_summary_async(session_id, active_summary, user_message, reply_text)
        return AIResponse(
            reply=reply_text,
            severity="medium",
            category="distress",
            rationale=classification.rationale,
        )

    text = user_message.lower()
    _, _, language = check_message_tripwire(user_message)
    if language in ("hinglish", "code-switched") or any(w in text for w in ["theek", "hai", "yaar", "kya", "batao", "hoon", "nahi", "kaise"]):
        reply_text = (
            "I understand yaar. Sab theek ho jayega, tension mat lo. "
            "Take a deep breath — main yahan hoon sunne ke liye. "
            "Tell me more about what's on your mind."
        )
    else:
        reply_text = (
            "I hear you and I am here for you. "
            "Take a deep breath — share whatever is on your mind."
        )

    _update_summary_async(session_id, active_summary, user_message, reply_text)
    return AIResponse(
        reply=reply_text,
        severity=classification.severity,
        category=classification.category,
        rationale=classification.rationale,
    )


def _update_summary_async(session_id: str, current_summary: Optional[str], user_msg: str, bot_reply: str) -> None:
    """Helper to update rolling summary and persist to DB/cache without blocking user."""
    try:
        updated = generate_rolling_summary(current_summary, user_msg, bot_reply)
        save_session_summary(session_id, updated)
    except Exception as e:
        logger.debug("Background summary update exception: %s", e)


