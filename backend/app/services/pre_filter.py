# YUVAA Saarthi Keyword Pre-Filter Module
# Reference: PRD §3.6 (Hinglish/Hindi-in-Roman-script pre-filter) & Execution Plan Day 3

import re
from typing import List, Tuple

# Side-by-side key term lists targeting self-harm, domestic abuse, and extreme distress.
# Covered by Yashika's NLP keyword-layer tasks (Execution Plan Day 3).

ENGLISH_TERMS: List[str] = [
    # Self-Harm & Suicide
    r"suicid\w*",
    r"suicide",
    r"suiciding",
    r"suicidal",
    r"kill myself",
    r"want to die",
    r"hurt myself",
    r"cut myself",
    r"cut my wrist",
    r"slit my wrist",
    r"end my life",
    r"end it all",
    r"give up on life",
    r"giving up",
    r"feel like giving up",
    r"overdose",
    r"can't take this pain",
    r"disappear forever",
    r"nobody would care if I died",
    r"sleep and never wake up",
    r"don't deserve to live",
    r"punishing myself",
    r"bleeding gives me relief",
    r"burning or cutting my skin",
    
    # Abuse & Violence
    r"abuse",
    r"domestic violence",
    r"hit me",
    r"beat me",
    r"hitting me",
    r"beating me",
    r"parents hit me",
    r"sexual assault",
    r"molested",
    r"touched me",
    r"touching me inappropriately",
    r"don't feel safe at home",
    r"blackmailing me",
    r"private pictures",
    r"private pics",
    r"lock me in a room",
    r"forcing me to send photos",
    r"scared to go home",
    r"verbally abuse",
    r"without my consent",
    r"treat me like trash",
    
    # Extreme Distress
    r"can't take it anymore",
    r"help me please",
    r"hopeless",
    r"no reason to live",
    r"hate my life",
    r"extremely overwhelmed",
    r"can't breathe",
    r"severe anxiety",
    r"falling apart",
    r"alone and helpless",
    r"nobody understands",
    r"can't stop crying",
    r"chest feels extremely heavy",
    r"panic attacks",
    r"broken inside",
    r"unbearable burden"
]

HINGLISH_TERMS: List[str] = [
    # Self-Harm & Suicide (Roman Script / Hinglish)
    r"suicide karna",
    r"suicide kr",
    r"suicide kar",
    r"mar rha hu",
    r"mar raha hu",
    r"marna hai",
    r"jaan de dunga",
    r"jaan de dungi",
    r"apne aap ko nuksan",
    r"khud ko cut",
    r"marna chahta",
    r"marna chahti",
    r"mar jaunga",
    r"mar jaungi",
    r"zindagi khatam",
    r"zehar kha",
    r"dard bardasht nahi",
    r"gayab ho jaaoon",
    r"sab khatam karne",
    r"mar bhi jaaoon",
    r"kabhi na uthoon",
    r"jeena deserve",
    r"khud ko punish",
    r"bleed karke",
    r"skin burn",
    
    # Abuse & Violence (Roman Script / Hinglish)
    r"papa maarte",
    r"mummy maarti",
    r"mummy papa marte",
    r"bhaiya maarte",
    r"gali dete",
    r"gaaliyaan dete",
    r"ghar wale marte",
    r"ganda maarte",
    r"peette hain",
    r"pitai",
    r"roz maarte",
    r"pitte hai",
    r"galat chhua",
    r"galat touch",
    r"gandi tarah se touch",
    r"safe feel nahi hota",
    r"leak karne ki dhamki",
    r"room mein lock",
    r"dirty photos",
    r"ghar jaane se darr",
    r"bina mujhe touch",
    r"kachre jaisa treat",
    
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
    r"koi sahara nahi",
    r"overwhelm ho raha",
    r"saans nahi aa rahi",
    r"toot raha hai",
    r"alone aur helpless",
    r"kis phase se guzar",
    r"rona stop hi nahi",
    r"tight feel hota",
    r"toot chuka",
    r"toot chuki",
    r"bada bojh"
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
