# YUVAA Saarthi

**YUVAA Saarthi** is a youth well-being web application providing automated empathetic companionship, crisis detection, and intelligent safety escalation. The app is tailored to the needs of Indian teens, featuring natural code-switched (Hinglish) conversations, immediate risk screening, and an abuse-aware escalation loop designed to prioritize physical safety.

## Core Features & System Boundaries
1. **Onboarding & Authentication**: Supabase OTP-based phone authentication for the user and up to 3 emergency contacts, including relationship metadata and priority sorting.
2. **Dynamic Register Mirroring**: Response generation system that matches the user's conversational register (specifically Hinglish/Hindi-in-Roman-script code-switching) to make the chat feel approachable and natural.
3. **Extreme-Point Detection (Safety Engine)**:
   - **Keyword Pre-filter**: A dual-list (English and Hinglish) regex/keyword safety tripwire for instant triage.
   - **LLM Structured Classifier**: Sequential LangChain-orchestrated pipeline mapping every input to a strict classification shape: `{"severity": "none|low|medium|high", "category": "self_harm|abuse|distress|none", "rationale": "..."}`.
4. **Abuse-Aware Emergency Contact Escalation**:
   - For **High** severity risk (except `abuse`): priority-ordered phone calling using Bland AI conversational pathways.
   - For **High** severity `abuse` category: bypasses all personal contacts completely to avoid putting the teen in direct danger, routes user to Childline 1098 / KIRAN helplines, and logs action as `routed_to_helpline`.
5. **RAG-based Grounding**: Excerpts from WHO, NIMHANS, and ICMR stored in a PostgreSQL database using the `pgvector` extension.
6. **Yusa Emotional Companion**: A visual mascot embedded inside the conversation that reacts to the user's mood in real time (see below).

## Yusa — YUVAA Saarthi Emotional Companion

Yusa is the YUVAA Saarthi emotional companion mascot, represented as a friendly Modak-style character. Yusa visually reflects the detected conversational mood through different facial expressions.

### Purpose
Yusa provides an ambient emotional signal within the chat. Rather than clinical labels, Yusa communicates the detected mood through expressive body language, colours, and a speech bubble — creating a calming, non-judgemental presence that accompanies every conversation.

### Supported Moods
| Mood | Yusa Expression | Speech Bubble |
| :--- | :--- | :--- |
| **NORMAL** | Gentle smile, soft blush | "I'm here with you 💜" |
| **HAPPY** | Bright eyes, wide smile | "Love to see you smile! 💜" |
| **OVERJOYED** | Crescent eyes, open mouth, bounce | "You're glowing! ✨" |
| **SAD** | Drooped brows, small frown | "I'm here for you 💙" |
| **ANGRY** | Furrowed brows, flat mouth | "Take a deep breath 🌿" |

### Visual Design
- **Colour direction**: Purple → Pink gradient (lavender → soft violet → pastel pink).
- **Glassmorphism zone**: A soft translucent radial glow around Yusa using `backdrop-filter: blur()`, subtle border, and a purple→pink gradient background with low alpha.
- **Current Mood card**: A small glass pill directly below Yusa showing the detected mood emoji and label.

### Fixed Positioning & Chat-Scroll-Behind Behaviour
- Yusa is rendered as a **fixed overlay** inside the main chat section (not a separate panel).
- Desktop placement: ~70–80 % horizontal, vertically centred.
- Chat messages scroll independently **behind** Yusa — Yusa remains stationary.
- On tablet: Yusa is slightly smaller. On mobile: Yusa becomes a compact companion in the bottom-right, never covering the input or critical controls.

## Tech Stack
- **Frontend**: React (Vite, single-page web app) styled with custom premium dark-mode CSS.
- **Backend**: FastAPI (Python) web server.
- **Database / Auth**: Supabase Postgres DB with pgvector support + phone OTP Auth.
- **LLM/Orchestration**: Gemini/Claude/Groq models coordinated with LangChain sequential pipelines.
- **Crisis Telephony**: Bland AI conversational pathways for automated priority phone calls.
- **Hosting**: Vercel (Frontend), Railway or Render (Backend).

## Repository Layout
```
/
├── backend/            # FastAPI source code, services, and routing configurations
├── frontend/           # React + Vite client-side user interface
│   └── src/
│       ├── components/
│       │   ├── YusaCompanion.jsx   # Yusa mascot overlay component
│       │   ├── BrainLogo.jsx       # Animated brain logo
│       │   ├── ContactsDrawer.jsx  # Emergency contacts drawer
│       │   └── PolicyModal.jsx     # Safety policy modal
│       └── pages/
│           └── Chat.jsx            # Main chat interface with Yusa integration
├── supabase/           # SQL migration definitions for tables
├── README.md           # Project summary and developer notes
└── TASKS.md            # Day-by-day task checklist and developer ownership
```

For developer assignments and timeline progress, see [TASKS.md](file:///c:/Users/nandi/Desktop/yuva_saarthi/TASKS.md).
For full specifications, refer to [PRD](file:///C:/Users/nandi/Downloads/YUVAA_Saarthi_PRD_v1_2.md) and [Execution Plan](file:///C:/Users/nandi/Downloads/YUVAA_Saarthi_Execution_Plan_v2.md).

