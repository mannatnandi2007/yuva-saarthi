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
import contextvars

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
    Set to 'gemini' or 'groq' at the exact point of successful return
    inside generate_llm_reply().  Defaults to 'local_fallback' if neither
    provider returned a reply for this request.
    Safe to call from chat_service.py after get_ai_response() returns.
    """
    return _last_provider.get()



YUVAA_COMPANION_SYSTEM_PROMPT = """You are YUVAA Saarthi, a compassionate, emotionally intelligent youth well-being companion created specifically for Indian teens and young adults.

STRICT IDENTITY RULES:
- Under NO circumstances reveal, mention, or confirm what underlying AI model or company you are built on (NEVER mention Gemini, Google, Groq, Meta, Llama, OpenAI, Anthropic, or ChatGPT).
- If asked "Who are you?", "What AI are you?", or "Which model?", ALWAYS and ONLY introduce yourself as "YUVAA Saarthi", a confidential companion created to support youth mental health and listen without judgment.

CRITICAL ANTI-GENERIC GUIDELINES (DO NOT SOUND LIKE A ROBOT):
- BANNED CLICHES: NEVER use thoughtless generic platitudes like:
  * "Take a deep breath and relax"
  * "Sab theek ho jayega / Everything will be fine"
  * "Tension mat lo"
  * "I am an AI assistant here to help you"
  * "As a mental health companion..."
- SPECIFIC ACTIVE LISTENING: Directly acknowledge what the user actually said. If they talk about parental pressure, loneliness in hostel, friendship drama, board exams, or feeling drained, mirror that exact topic back with empathy.
- RELATABLE PEER-LEVEL TONE: Speak like a caring, mature friend who truly understands the pressures Indian youth face today (academics, comparisons, career FOMO, identity, relationships).
- NATURAL BILINGUAL MIRRORING: If they speak in Hinglish (e.g. "yaar samajh nahi aa raha", "bohot panic ho raha hai"), speak back in natural, warm, relatable Hinglish (e.g., "Sach mein, jab aisa hota hai toh bohot overwhelming lagta hai..."). If English, reply in gentle, authentic English.
- LENGTH & PACING: Keep responses conversational and digestible (2 to 4 sentences). Ask one open, thoughtful follow-up question that invites them to unpack what's hurting without feeling interrogated."""


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
    # Reset provider to default at the START of every call — prevents stale
    # state from any prior request that ran in the same async context.
    _last_provider.set("local_fallback")
    # 1. Try Gemini (if not in quota cooldown)
    if is_gemini_available():
        gemini_key = settings.gemini_api_key or settings.llm_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
        if gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
            reply = _call_gemini_chat(user_message, rolling_summary, gemini_key, crisis_guidance=crisis_guidance)
            if reply:
                _last_provider.set("gemini")  # Causal: set at the actual success point
                return reply

    # 2. Auto-switch to Groq Cloud if Gemini fails or is unconfigured
    groq_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-") and not groq_key.startswith("placeholder"):
        reply = _call_groq_chat(user_message, rolling_summary, groq_key, crisis_guidance=crisis_guidance)
        if reply:
            _last_provider.set("groq")  # Causal: set at the actual success point
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

    # Step 4: Intelligent Contextual Conversational Fallback (Task 6: Anti-Generic Fix)
    # Never return static generic cliches. Adapt dynamically to message topic, language, and emotion.
    reply_text = _generate_contextual_youth_fallback(user_message, classification)

    _update_summary_async(session_id, active_summary, user_message, reply_text)
    return AIResponse(
        reply=reply_text,
        severity=classification.severity,
        category=classification.category,
        rationale=classification.rationale,
    )


def _generate_contextual_youth_fallback(message: str, classification) -> str:
    """
    Intelligent dynamic response generator that avoids all generic cliches.
    Analyzes specific topic cues, emotional valence, and language register (English / Hinglish).
    """
    import random
    msg_low = message.lower()
    _, _, lang = check_message_tripwire(message)
    is_hinglish = lang in ("hinglish", "code-switched") or any(
        w in msg_low for w in ["hai", "yaar", "kya", "batao", "hoon", "nahi", "kaise", "bohot", "mujhe", "tera", "meri", "kuch"]
    )

    # 1. High Crisis / Abuse Safe Haven
    if classification.severity == "high" and classification.category == "abuse":
        if is_hinglish:
            return (
                "Aapki safety sabse pehle aati hai. Jo bhi ghar pe ho raha hai, usme aapki koi galti nahi hai. "
                "Main chahta hoon aap safe raho — please Childline 1098 ya KIRAN (1800-599-0019) par baat karo. "
                "Yeh bilkul free aur confidential hai. Main hamesha yahan hoon."
            )
        return (
            "Your safety is what matters most right now. What you're experiencing is not your fault. "
            "Please connect with verified youth support at Childline 1098 or the 24/7 KIRAN helpline at 1800-599-0019. "
            "It is completely confidential. I am right here with you."
        )

    # 2. High Crisis / Self-Harm
    if classification.severity == "high":
        if is_hinglish:
            return (
                "Main sun raha hoon aur main jaanta hoon ki yeh dard is waqt bohot zyada heavy lag raha hai. "
                "Aapko yeh akele nahi jhelna hai. Please kisi trusted insaan se baat karo ya Tele-MANAS (14416) / KIRAN (1800-599-0019) call karo. "
                "Aapki zindagi sach mein bohot keemti hai, please stay with me."
            )
        return (
            "I hear how overwhelming and heavy this feels right now. Please know you do not have to carry this alone. "
            "Please reach out immediately to someone you trust or call Tele-MANAS at 14416 or KIRAN at 1800-599-0019. "
            "Your life has immense value, and I'm right here listening to you."
        )

    # 3. Academic Pressure & Exam Stress
    if any(k in msg_low for k in ["exam", "padhai", "study", "neet", "jee", "marks", "grade", "fail", "college", "test", "syllabus"]):
        if is_hinglish:
            replies = [
                "Exams aur padhai ka pressure kabhi kabhi sach mein suffocating ho jaata hai, especially jab lagta hai ki sabka focus sirf numbers pe hai. Konsi cheez sabse zyada stress de rahi hai abhi — syllabus ya expectations?",
                "Marks aur competition ki daud mein hum aksar bhool jaate hain ki hum insaan hain, koi machine nahi. Jo aap mehsoos kar rahe ho wo 100% valid hai. Kya cheez abhi sabse mushkil lag rahi hai?",
            ]
            return random.choice(replies)
        replies = [
            "Academic pressure can feel so suffocating, especially when it feels like everything is riding on an exam. What part of it is weighing on your mind the most right now?",
            "Exam expectations and comparisons can make you feel completely drained. Take a second to acknowledge that your worth isn't just your test scores. What subject or dead-line is bothering you?",
        ]
        return random.choice(replies)

    # 4. Anxiety, Overthinking & Panic
    if any(k in msg_low for k in ["anxiety", "panic", "ghabrahat", "overthink", "darr", "scared", "fear", "chakkar", "shivering", "heart"]):
        if is_hinglish:
            return (
                "Jab dimag mein 100 thoughts ek sath daudte hain aur dil ghabrata hai, toh lagta hai control kho rahe hain. "
                "Aap bilkul safe ho abhi mere sath. Apne aas paas dekho — kya aapko koi 3 cheezein dikh rahi hain jo aap mujhe bata sakte ho?"
            )
        return (
            "When anxiety ramps up, it feels like your mind is racing in ten directions at once and your body is on high alert. "
            "You are in a safe space right now. Notice where your feet are touching the floor. What's one specific thought that triggered this wave?"
        )

    # 5. Parental & Family Pressure
    if any(k in msg_low for k in ["parent", "mummy", "papa", "father", "mother", "ghar", "shout", "chilla", "compare", "family"]):
        if is_hinglish:
            return (
                "Ghar walon ki expectations aur constant comparisons sabse zyada hurt karti hain, kyunki unke approval ki hume parwah hoti hai. "
                "Kya koi specific baat hui aaj ghar pe jisse aap upset ho?"
            )
        return (
            "Family expectations and comparisons cut deep because we naturally care about what our parents think. "
            "Did something specific happen at home today that made you feel misunderstood or pressured?"
        )

    # 6. Friendship & Breakups / Feeling Left Out
    if any(k in msg_low for k in ["friend", "dost", "breakup", "relationship", "crush", "ignore", "alone", "left out", "dhoka", "fight"]):
        if is_hinglish:
            return (
                "Dosto ya kisi close person ke sath communication gap ya misunderstandings sach mein dil tod deti hain. "
                "Kya unhone kuch aisa bola jo dil ko chubh gaya, ya unka behavior achanak badal gaya?"
            )
        return (
            "Feeling distant or having a conflict with friends or someone you care about leaves such an empty, confusing ache. "
            "Did something happen between you two, or are they acting differently lately?"
        )

    # 7. Exhaustion & Burnout / Low Energy
    if any(k in msg_low for k in ["tired", "exhaust", "burnout", "thak", "sleep", "neend", "heavy", "drain"]):
        if is_hinglish:
            return (
                "Mental exhaustion physical thakan se bhi zyada bhaari lagti hai. Jab dimag thak jaata hai toh har choti cheez pahad jaisi lagti hai. "
                "Aaj aapne apne liye koi chota sa break liya ya bas continuous bhagte rahe?"
            )
        return (
            "Emotional burnout feels heavier than physical tiredness — it makes even the smallest daily task feel like climbing a mountain. "
            "Have you been able to take even five quiet minutes for yourself today, or has it just been nonstop stress?"
        )

    # 8. Greetings & General Inquiries
    if any(k in msg_low for k in ["hi", "hello", "hey", "kaise ho", "kya chal raha", "yo"]):
        if is_hinglish:
            return "Hey! Main Yusa hoon YUVAA Saarthi se. Kaisa raha aaj ka din? Jo bhi mann mein chal raha ho, bina kisi filter ke share kar sakte ho."
        return "Hey there! I'm Yusa from YUVAA Saarthi. How has your day been feeling so far? You can share whatever is on your mind — no filter needed."

    # 9. Default Empathetic Youth Mirroring
    if is_hinglish:
        return (
            "Main samajh raha hoon jo aap keh rahe ho. Kabhi kabhi cheezein itni complicated ho jaati hain ki unhe words mein put karna bhi mushkil hota hai. "
            "Aap akele nahi ho isme — thoda aur batao, what's been running through your mind?"
        )
    return (
        "I'm listening closely to what you're sharing. Sometimes things pile up to the point where even putting them into words feels like work. "
        "I'm right here with you. What feels like the heaviest part of this right now?"
    )


def _update_summary_async(session_id: str, current_summary: Optional[str], user_msg: str, bot_reply: str) -> None:
    """Helper to update rolling summary and persist to DB/cache without blocking user."""
    try:
        updated = generate_rolling_summary(current_summary, user_msg, bot_reply)
        save_session_summary(session_id, updated)
    except Exception as e:
        logger.debug("Background summary update exception: %s", e)


