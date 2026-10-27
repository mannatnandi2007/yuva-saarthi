/**
 * Yuva Saarthi — Emotional Resonance Engine
 * Maps user messages, Hinglish/Hindi emotional expressions, and backend LLM telemetry
 * into canonical companion mood states, empathetic responses, and 3D visual expressions.
 */

export const EMOTIONS = {
  NORMAL: 'normal',
  HAPPY: 'happy',
  OVERJOYED: 'overjoyed',
  SAD: 'sad',
  DISTRESSED: 'distressed',
  ANXIOUS: 'anxious',
  STRESSED: 'stressed',
  ANGRY: 'angry',
  FRUSTRATED: 'frustrated',
  SCARED: 'scared',
  LONELY: 'lonely',
  TIRED: 'tired',
  CONFUSED: 'confused',
};

export const MOOD_META = {
  normal: {
    label: 'Peaceful',
    color: 'var(--lilac)',
    emoji: '🌸',
    yusa3d: 'NORMAL',
    message: "I'm here with you 🌸",
  },
  happy: {
    label: 'Uplifted',
    color: 'var(--yellow)',
    emoji: '✨',
    yusa3d: 'HAPPY',
    message: 'Love seeing you smile! ✨',
  },
  overjoyed: {
    label: 'Celebrating',
    color: 'var(--pink)',
    emoji: '🎉',
    yusa3d: 'OVERJOYED',
    message: "You're doing amazing! 🎉",
  },
  sad: {
    label: 'Holding Space',
    color: 'var(--sky)',
    emoji: '💗',
    yusa3d: 'SAD',
    message: "I hear you. I'm right here beside you 💗",
  },
  distressed: {
    label: 'Here With You',
    color: 'var(--sky)',
    emoji: '💗',
    yusa3d: 'DISTRESSED',
    message: "You are not alone in this heavy moment 💗",
  },
  anxious: {
    label: 'Grounded & Safe',
    color: 'var(--mint)',
    emoji: '🛡️',
    yusa3d: 'ANXIOUS',
    message: 'Take a slow, deep breath. You are safe here 🛡️',
  },
  stressed: {
    label: 'Breathing With You',
    color: 'var(--mint)',
    emoji: '🛡️',
    yusa3d: 'STRESSED',
    message: "One moment at a time. We'll face this together 🛡️",
  },
  angry: {
    label: 'Listening Calmly',
    color: 'var(--coral)',
    emoji: '🌿',
    yusa3d: 'ANGRY',
    message: 'Your feelings are valid. Let it out safely 🌿',
  },
  frustrated: {
    label: 'Hearing You Out',
    color: 'var(--coral)',
    emoji: '🌿',
    yusa3d: 'FRUSTRATED',
    message: "It makes total sense you feel frustrated. I'm listening 🌿",
  },
  scared: {
    label: 'Protected & Safe',
    color: 'var(--sky)',
    emoji: '🛡️',
    yusa3d: 'SCARED',
    message: "You are safe with me. I've got your back 🛡️",
  },
  lonely: {
    label: 'Beside You',
    color: 'var(--lilac)',
    emoji: '🫂',
    yusa3d: 'LONELY',
    message: 'You are never alone. I am always right here 🫂',
  },
  tired: {
    label: 'Gentle Rest',
    color: 'var(--surface-2)',
    emoji: '🌙',
    yusa3d: 'TIRED',
    message: 'Be gentle with yourself. Rest is so important 🌙',
  },
  confused: {
    label: 'Exploring Together',
    color: 'var(--yellow)',
    emoji: '💡',
    yusa3d: 'CONFUSED',
    message: 'We can figure this out together, step by step 💡',
  },
};

/**
 * Normalize any raw string (from backend LLM, database, or classifier) into a canonical mood.
 */
export function normalizeMood(rawMood, fallbackText = '') {
  if (rawMood) {
    const m = String(rawMood).toLowerCase().trim();

    // Direct matches
    if (MOOD_META[m]) return m;

    // Sad / Distress / Hurt / Low
    if (['sad', 'distressed', 'distress', 'hurt', 'heartbroken', 'crying', 'cry', 'grief', 'depressed', 'depression', 'low', 'pain', 'hopeless', 'mourning'].includes(m)) {
      return 'distressed';
    }

    // Anxious / Stressed / Overwhelmed
    if (['anxious', 'anxiety', 'stressed', 'stress', 'overwhelmed', 'overwhelm', 'panic', 'overthinking', 'tense', 'nervous', 'pressure', 'frightened'].includes(m)) {
      return 'anxious';
    }

    // Anger / Frustration
    if (['angry', 'anger', 'frustrated', 'frustration', 'irritated', 'furious', 'mad', 'rage'].includes(m)) {
      return 'angry';
    }

    // Scared / Fear
    if (['scared', 'fear', 'fearful', 'afraid', 'terrified', 'very_scared'].includes(m)) {
      return 'scared';
    }

    // Tired / Burnout / Exhausted
    if (['tired', 'exhausted', 'burnout', 'drained', 'sleepy', 'fatigue', 'fatigued'].includes(m)) {
      return 'tired';
    }

    // Lonely
    if (['lonely', 'alone', 'isolated', 'isolation', 'abandoned', 'left out'].includes(m)) {
      return 'lonely';
    }

    // Confused / Lost
    if (['confused', 'confusion', 'lost', 'uncertain', 'doubt', 'stuck', 'conflict'].includes(m)) {
      return 'confused';
    }

    // Joyful
    if (['overjoyed', 'excited', 'proud', 'celebrating', 'ecstatic', 'thrilled', 'chitter'].includes(m)) {
      return 'overjoyed';
    }

    // Happy
    if (['happy', 'hopeful', 'relief', 'relieved', 'good', 'content', 'optimistic', 'smile'].includes(m)) {
      return 'happy';
    }
  }

  // Fallback: detect from text content if provided
  if (fallbackText) {
    const detected = detectEmotionFromText(fallbackText);
    if (detected) return detected;
  }

  return 'normal';
}

/**
 * Real-time keyword & linguistic heuristic detector for Hinglish, Hindi, and English youth speech.
 * Allows Yusa to react IMMEDIATELY as soon as the user hits Send.
 */
export function detectEmotionFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();

  // 1. Distress / Hurt / Sadness / Crying / Parental reprimand
  const distressRegex = /\b(daat|daanta|daanti|maar|mummy|papa|bura|hurt|crying|cry|rona|rone|sad|dil toot|toot gaya|pain|dard|chot|depressed|low|hopeless|tears|heartbroken|rha hai bura|bhot bura|bohot bura)\b/i;
  if (distressRegex.test(t)) {
    return 'distressed';
  }

  // 2. Anxiety / Panic / Stress / Academic fear
  const anxietyRegex = /\b(anxiety|anxious|stress|stressed|panic|dar|darr|dar lg|ghabrahat|overthink|overthinking|pressure|exam|exams|board|marks|syllabus|fail|failing|jee|neet|test|result|nervous|kaise hoga)\b/i;
  if (anxietyRegex.test(t)) {
    return 'anxious';
  }

  // 3. Anger / Irritation
  const angerRegex = /\b(gussa|angry|frustrated|irritate|irritated|chidh|hate|nafrat|furious|bakwas|pagal|dimag kharab)\b/i;
  if (angerRegex.test(t)) {
    return 'angry';
  }

  // 4. Loneliness / Isolation
  const lonelyRegex = /\b(akela|akeli|lonely|alone|nobody|koi nahi|koi samajhta nahi|left out|isolated)\b/i;
  if (lonelyRegex.test(t)) {
    return 'lonely';
  }

  // 5. Exhaustion / Burnout
  const tiredRegex = /\b(thak|thak gaya|thak gayi|tired|exhausted|burnout|drained|neend|sleepy|so nahi pa raha|exhausting)\b/i;
  if (tiredRegex.test(t)) {
    return 'tired';
  }

  // 6. Joy / Happiness
  const happyRegex = /\b(happy|khush|sukoon|better|relief|smile|acha laga|achha laga|thank you|shukriya|great|awesome|pass ho gaya|pass ho gayi|masti)\b/i;
  if (happyRegex.test(t)) {
    return 'happy';
  }

  return null;
}
