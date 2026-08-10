# YUVAA Saarthi

**YUVAA Saarthi** is a youth well-being web application providing automated empathetic companionship, crisis detection, and intelligent safety escalation. The app is tailored to the needs of Indian teens, featuring natural code-switched (Hinglish) conversations, immediate risk screening, and an abuse-aware escalation loop designed to prioritize physical safety.

## Core Features & System Boundaries
1. **Onboarding & Authentication**: Supabase OTP-based phone authentication for the user and up to 3 emergency contacts, including relationship metadata and priority sorting.
2. **Dynamic Register Mirroring**: Response generation system that matches the user's conversational register (specifically Hinglish/Hindi-in-Roman-script code-switching) to make the chat feel approachable and natural.
3. **Extreme-Point Detection (Safety Engine)**:
   - **Keyword Pre-filter**: A dual-list (English and Hinglish) regex/keyword safety tripwire for instant triage.
   - **LLM Structured Classifier**: Sequential LangChain-orchestrated pipeline mapping every input to a strict classification shape: `{"severity": "none|low|medium|high", "category": "self_harm|abuse|distress|none", "rationale": "..."}`.
4. **Abuse-Aware Emergency Contact Escalation**:
   - For **High** severity risk (except `abuse`): parallel SMS notification to all emergency contacts + priority-ordered phone calling using Bland AI pathways.
   - For **High** severity `abuse` category: bypasses all personal contacts completely to avoid putting the teen in direct danger, routes user to Childline 1098 / KIRAN helplines, and logs action as `routed_to_helpline`.
5. **RAG-based Grounding**: Excerpts from WHO, NIMHANS, and ICMR stored in a PostgreSQL database using the `pgvector` extension.

## Tech Stack
- **Frontend**: React (Vite, single-page web app) styled with custom premium dark-mode CSS.
- **Backend**: FastAPI (Python) web server.
- **Database / Auth**: Supabase Postgres DB with pgvector support + phone OTP Auth.
- **LLM/Orchestration**: Gemini/Claude models coordinated with LangChain sequential pipelines.
- **Crisis Call/SMS**: Bland AI conversational pathways for phone calls, Twilio for SMS alerts.
- **Hosting**: Vercel (Frontend), Railway or Render (Backend).

## Repository Layout
```
/
├── backend/            # FastAPI source code, services, and routing configurations
├── frontend/           # React + Vite client-side user interface
├── supabase/           # SQL migration definitions for tables
├── README.md           # Project summary and developer notes
└── TASKS.md            # Day-by-day task checklist and developer ownership
```

For developer assignments and timeline progress, see [TASKS.md](file:///c:/Users/nandi/Desktop/yuva_saarthi/TASKS.md).
For full specifications, refer to [PRD](file:///C:/Users/nandi/Downloads/YUVAA_Saarthi_PRD_v1_2.md) and [Execution Plan](file:///C:/Users/nandi/Downloads/YUVAA_Saarthi_Execution_Plan_v2.md).
