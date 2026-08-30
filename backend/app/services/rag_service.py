# YUVAA Saarthi RAG Knowledge & Retrieval Service
# Reference: PRD §3.5 (RAG Grounding with WHO / NIMHANS / ICMR) & Execution Plan Day 6
# Owned by Mannat (Phase 4: Wire RAG Context into Prompt)

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Evidence-based mental health knowledge base curated from WHO Adolescent Health,
# NIMHANS Youth Well-being protocols, and ICMR Adolescent Counseling guidelines.
GROUNDED_KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    {
        "id": "nimhans-exam-anxiety",
        "source": "NIMHANS Youth Mental Health Protocol",
        "title": "Academic Pressure & Exam Anxiety Management",
        "keywords": ["exam", "exams", "study", "marks", "test", "padhai", "fail", "pressure", "score", "grades", "percentage", "stress"],
        "guideline": (
            "Acknowledge the physical and cognitive symptoms of exam panic without dismissal. "
            "Encourage 25-minute focused study chunks with 5-minute cognitive rest (Pomodoro). "
            "Remind the youth that academic performance does not define their intrinsic self-worth or future potential. "
            "Introduce gentle cognitive reframing: 'One exam is an event, not your entire identity.'"
        )
    },
    {
        "id": "who-grounding-somatic",
        "source": "WHO Adolescent Psychological First Aid",
        "title": "Acute Sensory Grounding & Somatic Calming",
        "keywords": ["panic", "anxiety", "can't breathe", "heavy", "heart racing", "overwhelmed", "saans", "ghabrahat", "shaking", "crying", "darr"],
        "guideline": (
            "Guide the youth through immediate 5-4-3-2-1 sensory grounding: identify 5 things they see, "
            "4 they can physically touch, 3 they hear, 2 they smell, and 1 slow breath they take. "
            "Suggest the Physiological Sigh: two quick inhales through the nose followed by one long, slow exhale through the mouth to rapidly reset autonomic arousal."
        )
    },
    {
        "id": "icmr-loneliness-isolation",
        "source": "ICMR Youth Counseling Guidelines",
        "title": "Social Isolation, Loneliness & Alienation",
        "keywords": ["alone", "lonely", "akela", "nobody", "friendless", "isolated", "left out", "koi nahi", "abandoned", "ignored"],
        "guideline": (
            "Validate loneliness as a universal human signal for connection rather than personal deficiency. "
            "Advise taking micro-steps toward connection: a brief casual text to an acquaintance, sitting in shared spaces, or engaging in interest-based communities. "
            "Emphasize self-compassion practices to decouple solitude from unworthiness."
        )
    },
    {
        "id": "nimhans-family-conflict",
        "source": "NIMHANS Adolescent Interpersonal Guidelines",
        "title": "Family Discord, Parental Expectations & Boundary Setting",
        "keywords": ["parents", "papa", "mummy", "family", "ghar", "expectation", "shouting", "fight", "taunt", "compare", "sharma ji"],
        "guideline": (
            "Acknowledge intergenerational cultural friction and high parental expectations common in Indian households. "
            "Encourage emotional de-escalation: taking a pause before reacting in heat. "
            "Recommend 'I-statements' (e.g., 'Jab comparisons hote hain, mujhe bohot pressure feel hota hai') over confrontational accusations. "
            "Help youth identify what is within their circle of control versus their parents' emotional responses."
        )
    },
    {
        "id": "who-emotional-regulation",
        "source": "WHO Adolescent Health & Well-being",
        "title": "Distress Tolerance & Emotional Regulation",
        "keywords": ["sad", "crying", "depressed", "hopeless", "low", "mood", "dukhi", "rona", "broken", "empty", "overthinking"],
        "guideline": (
            "Practice emotional naming: naming an emotion ('name it to tame it') reduces amygdala reactivity. "
            "Encourage non-judgmental acceptance of difficult feelings: emotions are waves that peak and subside within 90 seconds if not fed by ruminative spirals. "
            "Suggest physical transition: washing face with cold water, stepping outside, or drinking warm water."
        )
    }
]


def retrieve_relevant_guidelines(query_text: str, limit: int = 2) -> List[Dict[str, Any]]:
    """
    Retrieve nearest guideline chunks based on user text keywords and clinical intent.
    Supports English, Hindi, and Hinglish queries.
    """
    if not query_text:
        return GROUNDED_KNOWLEDGE_BASE[:limit]

    query_lower = query_text.lower()
    query_tokens = set(re.findall(r"\b\w+\b", query_lower))

    scored_entries = []
    for item in GROUNDED_KNOWLEDGE_BASE:
        score = 0.0
        # Keyword matches
        for kw in item["keywords"]:
            if kw in query_lower:
                score += 2.0
            elif kw in query_tokens:
                score += 1.5

        # Title/source matches
        if any(token in item["title"].lower() for token in query_tokens):
            score += 1.0

        if score > 0:
            scored_entries.append((score, item))

    # Sort descending by relevance score
    scored_entries.sort(key=lambda x: x[0], reverse=True)

    if scored_entries:
        results = [entry[1] for entry in scored_entries[:limit]]
    else:
        # Fallback to general emotional regulation guidelines if no specific keyword matched
        results = [GROUNDED_KNOWLEDGE_BASE[1], GROUNDED_KNOWLEDGE_BASE[4]][:limit]

    logger.debug("Retrieved %d RAG guideline chunks for query snippet: '%s...'", len(results), query_text[:30])
    return results


def build_rag_prompt_context(query_text: str) -> str:
    """
    Format retrieved clinical guidelines into a clean prompt injection block.
    Injected into the system prompt to ground companion replies.
    """
    guidelines = retrieve_relevant_guidelines(query_text, limit=2)
    if not guidelines:
        return ""

    context_lines = [
        "EVIDENCE-BASED COUNSELING GUIDELINES (WHO / NIMHANS / ICMR):",
        "Incorporate principles from these clinical guidelines gently and conversationally (do not quote verbatim):"
    ]
    for idx, g in enumerate(guidelines, 1):
        context_lines.append(f"{idx}. [{g['source']} — {g['title']}]: {g['guideline']}")

    return "\n".join(context_lines)
