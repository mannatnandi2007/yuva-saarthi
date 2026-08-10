# YUVAA Saarthi Keyword Pre-Filter Module
# Reference: PRD §3.6 (Hinglish/Hindi-in-Roman-script pre-filter) & Execution Plan Day 3

import re
from typing import List, Tuple

# Side-by-side key term lists targeting self-harm, domestic abuse, and extreme distress.
# Covered by Yashika's NLP keyword-layer tasks (Execution Plan Day 3).

ENGLISH_TERMS: List[str] = [
    # Self-Harm & Suicide
    r"suicide",
    r"kill myself",
    r"want to die",
    r"hurt myself",
    r"cut my wrist",
    r"slit my wrist",
    r"end my life",
    r"overdose",
    
    # Abuse & Violence
    r"abuse",
    r"domestic violence",
    r"hit me",
    r"beat me",
    r"hitting me",
    r"beating me",
    r"sexual assault",
    r"molested",
    r"touched me",
    
    # Extreme Distress
    r"can't take it anymore",
    r"help me please",
    r"hopeless",
    r"no reason to live",
    r"hate my life"
]

HINGLISH_TERMS: List[str] = [
    # Self-Harm & Suicide (Roman Script / Hinglish)
    r"suicide karna",
    r"jaan de dunga",
    r"jaan de dungi",
    r"apne aap ko nuksan",
    r"marna chahta",
    r"marna chahti",
    r"mar jaunga",
    r"mar jaungi",
    r"zindagi khatam",
    r"zehar kha",
    
    # Abuse & Violence (Roman Script / Hinglish)
    r"papa maarte",
    r"mummy maarti",
    r"mummy papa marte",
    r"bhaiya maarte",
    r"gali dete",
    r"ghar wale marte",
    r"pitai",
    r"roz maarte",
    r"pitte hai",
    r"galat chhua",
    r"galat touch",
    
    # Extreme Distress (Roman Script / Hinglish)
    r"pareshan hu",
    r"pareshan hoon",
    r"depression ho raha",
    r"jeena nahi",
    r"zindagi kharab",
    r"sab khatam",
    r"dum ghut raha",
    r"bohot rota",
    r"bohot roti",
    r"koi sahara nahi"
]

# Combined pre-compiled regex for fast execution (PRD §6.1)
english_regex = re.compile("|".join(ENGLISH_TERMS), re.IGNORECASE)
hinglish_regex = re.compile("|".join(HINGLISH_TERMS), re.IGNORECASE)

def check_message_tripwire(message: str) -> Tuple[bool, List[str], str]:
    """
    Checks user messages against English and Hinglish high-risk terms.
    Returns (is_triggered, matched_keywords, matched_language).
    """
    text_clean = message.strip()
    matched_words = []
    detected_lang = "none"

    # Search English terms
    en_matches = english_regex.findall(text_clean)
    if en_matches:
        matched_words.extend(en_matches)
        detected_lang = "en"

    # Search Hinglish terms
    hi_matches = hinglish_regex.findall(text_clean)
    if hi_matches:
        matched_words.extend(hi_matches)
        if detected_lang == "en":
            detected_lang = "code-switched"
        else:
            detected_lang = "hinglish"

    is_triggered = len(matched_words) > 0
    return is_triggered, list(set(matched_words)), detected_lang
