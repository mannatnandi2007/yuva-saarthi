# Yuva Saarthi — Consolidated Project Report

> **Product:** Yuva Saarthi ("Youth Companion")  
> **Status:** Living Master Report | **Repository:** `mannatnandi2007/yuvva-saarthi`  
> **Target Audience:** Indian teenagers & young adults (ages 13–18)

---

## Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [Team, Status & Ownership](#2-team-status--ownership)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Clinical Safety & Escalation Design](#6-clinical-safety--escalation-design)
7. [Feature Implementation Status](#7-feature-implementation-status)
8. [Test Coverage & Quality Assurance](#8-test-coverage--quality-assurance)
9. [Deployment & Environment Configuration](#9-deployment--environment-configuration)
10. [Decisions Log](#10-decisions-log)
11. [Changelog](#11-changelog)

---

## 1. Executive Overview

**Yuva Saarthi** is an AI-powered youth well-being and crisis intervention web application designed specifically for Indian teenagers (ages 13–18). The platform provides:

- **Empathetic AI Companionship:** Natural, culturally grounded, code-switched Hinglish and English conversations without clinical platitudes or robotic tone.
- **Visual Emotional Feedback (Yusa Mascot):** A friendly companion mascot reflecting real-time emotional states across 7 core moods (`NORMAL`, `HAPPY`, `OVERJOYED`, `SAD`, `ANGRY`, `ANXIOUS`, `TIRED`).
- **Multi-Stage Risk Screening:** Deterministic keyword pre-filtering coupled with structured LLM safety classification to assess severity (`none`, `low`, `medium`, `high`) and category (`self_harm`, `abuse`, `distress`, `none`).
- **Automated Emergency Escalation:** Sequential voice call escalation to registered emergency contacts via Bland AI telephony during acute self-harm emergencies.
- **Rule §3.4a Abuse Safeguard:** If abuse or domestic violence is detected, personal contacts are strictly bypassed to prevent retaliatory violence against the minor, routing immediately to verified national helplines.
- **Clinical RAG Grounding:** Knowledge retrieval anchored in evidence-based guidelines from NIMHANS, WHO Adolescent Health, and ICMR protocols.

---

## 2. Team, Status & Ownership

### 2.1 Core Team Members

| Member | Role | Primary Responsibilities |
|:---|:---|:---|
| **Mannat Nandi** | Project Lead / LLM / Escalation | System architecture, Gemini & Groq LLM pipelines, Bland AI telephony integration, rolling summary generator, crisis classifier tuning, RAG context injection |
| **Khushal** | Backend & API Engineering | Supabase Auth, custom JWT tokens, FastAPI chat/session endpoints, batch session deletion, API resiliency |
| **Aakansha** | Database & SQL Architecture | PostgreSQL schema design, pgvector migrations, RAG documents table, DB performance indexes, relational constraints |
| **Aklesh** *(took over from Yashika)* | Frontend Architecture / UI & NLP | Modern responsive UI, design system implementation, SVG companion mascot, Hinglish keyword sets, test conversation suites |

### 2.2 Phase Execution Record

| Phase & Milestone | Focus Area | Status | Key Deliverables |
|:---|:---|:---:|:---|
| **Phase 1: Setup & Auth** | Scaffold & User Registration | **Completed** | FastAPI backend, Supabase Auth, phone-based signup with prioritized emergency contacts |
| **Phase 2: Core Chat & Risk** | Chat Pipeline & Classification | **Completed** | Real-time chat loop, Hinglish prompt engineering, keyword pre-filter, structured LLM classification |
| **Phase 3: Telephony Escalation**| Voice Calls & Abuse Bypass | **Completed** | Bland AI voice alert loop, `alert_attempts` logging, Rule §3.4a domestic abuse contact bypass |
| **Phase 4: Context & RAG** | Summarization & Clinical Retrieval | **Completed** | 150-word rolling session summarizer, local document RAG (MiniLM) + pgvector integration |
| **Phase 5: Safety Guardrails** | False Positive Tuning & Tests | **Completed** | Contextual false-positive guards, end-to-end integration test suite, demo runner |
| **Phase 6: Resilience & Bulk Delete** | Failover & Session Management | **Completed** | Gemini ↔ Groq quota circuit breaker, batch session deletion API, telemetry logging |
| **Overhaul v2 (Current)** | Full System Refactor | **In Progress** | Async LLM, backend-driven mood, flat pastel UI, Capacitor Android build, multi-channel alerts |

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 18 + Vite / Android)         │
│  Pages: LandingPage | Signup | OtpVerification | Consent | Chat        │
│  Components: YusaCompanion (SVG) | MessageBubble | SafetyBanner        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JWT Auth)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FASTAPI BACKEND SERVICE                          │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Routers: /auth, /chat, /sessions, /risk, /escalation, /rag   │     │
│   └───────────────────────────────┬──────────────────────────────┘     │
│                                   │                                    │
│   ┌───────────────────────────────▼──────────────────────────────┐     │
│   │ Risk Pipeline:                                               │     │
│   │ 1. Deterministic Pre-Filter (pre_filter.py)                  │     │
│   │ 2. Structured LLM Risk Classifier (classifier.py)            │     │
│   │ 3. Clinical Knowledge Retrieval (rag_service.py)             │     │
│   │ 4. LLM Response Generator (llm_service.py: Gemini ↔ Groq)    │     │
│   └───────────────────────────────┬──────────────────────────────┘     │
│                                   │                                    │
│   ┌───────────────────────────────┴──────────────────────────────┐     │
│   │ Escalation Engine (chat_service.py):                         │     │
│   │ - Rule §3.4a Check: Abuse -> Bypass Contacts -> Helpline     │     │
│   │ - High Self-Harm -> Bland AI Telephony Voice Call Loop       │     │
│   └───────────────────────────────┬──────────────────────────────┘     │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
┌─────────────────────────┐               ┌─────────────────────────────┐
│  SUPABASE (PostgreSQL)  │               │   EXTERNAL SERVICES         │
│  - users                │               │   - Google Gemini API       │
│  - emergency_contacts   │               │   - Groq Cloud API          │
│  - sessions             │               │   - Bland AI Telephony      │
│  - messages             │               │   - Fast2SMS / Telegram     │
│  - risk_events          │               │     (Alert Channels)        │
│  - alert_attempts       │               └─────────────────────────────┘
│  - rag_documents        │
└─────────────────────────┘
```

---

## 4. Database Schema

The persistence layer runs on Supabase (PostgreSQL 15) with the `pgvector` extension enabled for semantic knowledge retrieval.

### Tables & Relationships

```
 users (id, phone, username, first_name, age_band, created_at)
   │
   ├──< emergency_contacts (id, user_id, phone, relationship, priority_order, is_active)
   │
   ├──< sessions (id, user_id, started_at, ended_at, summary_snapshot, heading)
   │      │
   │      └──< messages (id, session_id, sender, content, risk_tier, mood, created_at)
   │
   └──< risk_events (id, user_id, session_id, severity, category, action_taken, trigger_text)
          │
          └──< alert_attempts (id, risk_event_id, contact_id, status, error, created_at)
```

### Table Definitions

1. **`users`**: Youth account profiles identified by unique phone number and username.
2. **`emergency_contacts`**: Prioritized list of guardians or trusted adults (priorities 1, 2, 3).
3. **`sessions`**: Dialogue sessions containing `summary_snapshot` (150-word rolling context) and session `heading`.
4. **`messages`**: Individual turns (`user`, `assistant`, `system`). Stores `risk_tier` and `mood`.
5. **`risk_events`**: Audit log for every detected risk incident, recording severity, category, and action taken.
6. **`alert_attempts`**: Granular attempt logs for voice calls and external notifications.
7. **`rag_documents`**: Clinical knowledge chunks with 384-dimension vector embeddings (`all-MiniLM-L6-v2`).

---

## 5. API Reference

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `POST` | `/auth/signup` | Public | Register user account with 1–3 prioritized emergency contacts |
| `POST` | `/auth/login` | Public | Authenticate via username or phone OTP |
| `GET` | `/users/me` | JWT | Fetch current authenticated user profile |
| `GET` | `/sessions` | JWT | List active user sessions with summaries and headings |
| `POST` | `/sessions` | JWT | Create a new session (lazy creation supported) |
| `DELETE`| `/sessions/{id}` | JWT | Delete a session and cascade delete its messages |
| `POST` | `/chat/sessions/batch-delete` | JWT | Atomically delete multiple sessions |
| `POST` | `/chat` | JWT | Core messaging endpoint: returns reply, risk assessment, and mood |
| `GET` | `/chat/history/{session_id}` | JWT | Retrieve ordered message history for a session |
| `POST` | `/escalation/trigger` | JWT | Trigger manual escalation workflow (internal testing) |
| `POST` | `/rag/retrieve` | Public | Semantic query against knowledge base |
| `GET` | `/rag/files` | Public | List indexed clinical guidance files |
| `POST` | `/rag/scan` | Public | Re-scan and re-index docs in `docs/rag_documents/` |
| `GET` | `/health/llm` | Public | Provider status and circuit breaker telemetry |

---

## 6. Clinical Safety & Escalation Design

### 6.1 Multi-Layered Screening Pipeline
1. **Stage 1 — Deterministic Keyword Pre-Filter:** Scans English and Hinglish terms targeting explicit suicide, self-harm, and severe abuse. Instantly flags high-risk messages before LLM processing.
2. **Stage 2 — Contextual Risk Classifier:** Structured JSON evaluation determining severity (`none`, `low`, `medium`, `high`) and category (`self_harm`, `abuse`, `distress`, `none`). Uses contextual disambiguation to distinguish hyperbole (e.g., *"exam dekh ke mar jaunga"*) from acute intent.
3. **Stage 3 — Escalation Decision:**
   * `high + self_harm`: Triggers immediate emergency voice calls to priority emergency contacts via Bland AI.
   * `high + abuse` (**Rule §3.4a**): Personal contacts are strictly bypassed to protect the user from potential domestic abuse perpetrators. Replaces calls with direct national helpline routing (Childline 1098, KIRAN 1800-599-0019, Tele-MANAS 14416).
   * `medium distress`: Displays in-app grounding techniques (5-4-3-2-1 exercise, Physiological Sigh) and helpline cards without alerting external contacts.

### 6.2 Core System Prompts

#### Crisis Detection Prompt (Reference: `docs/prompt.txt`)
```
You are the crisis detection system for Yuva Saarthi, an Indian youth mental well-being companion.
Analyze the user's message and classify the level of risk into valid JSON:
- severity: "none" | "low" | "medium" | "high"
- category: "self_harm" | "abuse" | "distress" | "none"
- rationale: brief justification

Understand English, Hindi, and Hinglish. Do not answer questions or give advice; classify only.
```

#### Companion System Prompt Guidelines
- **Strict Identity:** Introduce only as "Yuva Saarthi", never revealing underlying foundation models.
- **Banned Clichés:** Avoid generic platitudes (*"Take a deep breath"*, *"Everything will be fine"*, *"Tension mat lo"*).
- **Active Listening:** Mirror the specific issue (academic pressure, parental comparison, loneliness) in natural Hinglish or English matching the user's conversational register.
- **Pacing:** Keep responses to 2–4 sentences with one thoughtful follow-up question.

---

## 7. Feature Implementation Status

- [x] Multi-contact prioritized emergency contact registration
- [x] Natural Hinglish empathetic dialogue generation
- [x] Dual-provider LLM failover (Gemini ↔ Groq) with circuit breaker
- [x] Deterministic keyword pre-filtering (English + Hinglish)
- [x] Automated voice escalation calls via Bland AI
- [x] Rule §3.4a domestic abuse contact bypass safeguard
- [x] 150-word rolling context summarization
- [x] Local document RAG retrieval with vector similarity
- [x] Batch session deletion with foreign key cascading
- [x] Multi-turn context injection (12 turns, 10,000 char budget)
- [x] Sane provider circuit breaker with half-open probe recovery
- [x] Single-turn structured JSON output with mood and confidence
- [x] Deterministic keyword pre-filter safety floor (can only elevate severity)
- [x] Anti-cliché empathetic system prompt with 5 few-shot examples
- [x] Honest degraded fallback with word-boundary regex checks and helplines
- [ ] Backend-driven mood persistence on message records (Phase 3)
- [ ] Multi-channel alert notifications: Fast2SMS, Telegram, Email (Phase 5)
- [ ] Pure SVG 2D Yusa Mascot with 7 expressive moods (Phase 6)
- [ ] Flat pastel design system without gradients (Phase 6)
- [ ] Capacitor Android packaging and mobile-first responsive layout (Phase 7)

---

## 8. Test Coverage & Quality Assurance

The test suite in `backend/tests/` verifies end-to-end functionality across 115 automated unit and integration tests:

| Test Module | Tests | Primary Validations |
|---|:---:|---|
| `test_api.py` | 90 | User registration, authentication, chat completion, session CRUD, batch deletion, RAG retrieval, LLM health checks, provider telemetry |
| `test_phase2_llm.py` | 17 | Multi-turn context windowing, circuit breaker state transitions (closed/open/half-open), structured JSON output parsing, pre-filter safety floor enforcement, word-boundary fallback |
| `test_escalation_loop.py` | 8 | Sequential voice call retry loop, alert attempt database logging, Rule §3.4a abuse bypass, false positive thresholds |

All 115 tests pass cleanly with `pytest`.


---

## 9. Deployment & Environment Configuration

### Required Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# LLM Providers
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key

# Telephony Escalation
BLAND_AI_KEY=your-bland-ai-key

# Security & Config
JWT_SECRET=strong-random-secret
DEV_BYPASS_AUTH=false
ENABLE_DEMO_ROUTES=false
```

---

## 10. Decisions Log

| Decision ID | Context | Resolution | Rationale |
|---|---|---|---|
| **DEC-001** | Telephony Provider Selection | Selected Bland AI over Twilio | Native conversational voice agents with programmable situational directives |
| **DEC-002** | Fallback Architecture | Groq Cloud as immediate failover for Gemini | Prevents user disruption during Gemini quota exhaustion or latency spikes |
| **DEC-003** | Local Vector Search | MiniLM embedded directly on local documents | Enables document search without dependency on external hosted vector services |
| **DEC-004** | Product Name Normalization | Unified to "Yuva Saarthi" across all UI, docs, and code | Clean, professional branding consistency across developer and user interfaces |
| **DEC-005** | Demo Route Isolation | Gated `routers/demo.py` behind `ENABLE_DEMO_ROUTES` | Prevents unauthorized mock scenario execution in production |

---

## 11. Changelog

* **v2.3.0 (Phase 4 Session Management & History Polish):**
  * Implemented lazy session creation: DB rows are never created on mount or "New Chat" click until the first message is sent.
  * Banned fake local IDs (`local-...`, `default-session`): all sessions enforce real UUIDs returned by backend.
  * Added resilient frontend API client (`frontend/src/api/client.js`) with auth interceptor and startup cold-start health ping (`pingBackendWarmup`).
  * Added session history grouping in sidebar by date: Today, Yesterday, This Week, and Earlier, with a friendly empty state.
  * Added rapid session switching protection via `AbortController` in history loading.
  * Added `limit` and `offset` query parameters to `GET /sessions`.
  * Added dedicated Phase 4 session unit test suite (`test_phase4_sessions.py`).
* **v2.2.0 (Phase 3 Backend Mood Engine & Persistence):**
  * Added `mood` and `mood_confidence` columns to `messages` table via Supabase migration `20261027000000_add_mood_column.sql`.
  * Added `MoodEnum` (`normal`, `happy`, `overjoyed`, `sad`, `angry`, `anxious`, `tired`) to backend schemas.
  * Updated `MessageHistoryItem` and `ChatResponse` with mood and confidence fields.
  * Updated `chat_service.py` (`save_message`, `get_message_history`, `send_chat_message`) to persist and retrieve mood with graceful schema fallback.
  * Removed brittle client-side substring keyword mood matching (`detectMood`) in favor of backend-driven emotion detection with transition smoothing.
  * Added dedicated Phase 3 mood unit test suite (`test_phase3_mood.py`).
* **v2.1.0 (Phase 2 LLM & Chat Architecture Overhaul):**
  * Implemented resilient async HTTP client with connection pooling, 15s timeout, 3s connect timeout.
  * Multi-turn conversational memory: loads 12 recent turns with 10,000 character budget pruning.
  * Implemented `ProviderCircuitBreaker` handling HTTP 429 (`Retry-After`), consecutive 5xx error thresholds, and half-open probe recovery.
  * Overhauled system prompt with culturally grounded Indian youth tone, anti-cliché directives, and 5 few-shot examples.
  * Single-turn structured JSON output (`reply`, `mood`, `mood_confidence`, `severity`, `category`, `language`, `rationale`).
  * Enforced deterministic pre-filter safety floor (tripwire can elevate severity, model cannot downgrade).
  * Implemented honest degraded fallback with word-boundary regex checks and verified emergency helplines.
  * Added RAG document chunk and embedding disk caching (`.rag_cache.pkl`).
* **v2.0.0 (Phase 1 Overhaul):**
  * Consolidated documentation into `docs/PROJECT_REPORT.md` and `docs/DESIGN_SYSTEM.md`.
  * Removed deprecated chat stubs (`/chat/session/start`, `/chat/message/send`).
  * Gated demo routes behind `ENABLE_DEMO_ROUTES` flag.
  * Standardized product name to "Yuva Saarthi" across frontend, backend, manifest, and system prompts.
  * Created unified development orchestrator scripts (`scripts/dev.ps1`, `scripts/ingest_rag.ps1`).
  * Achieved 100% green test pass rate on full backend test suite.
* **v1.3.0:** Multi-session batch deletion and LLM failover telemetry.
* **v1.2.0:** RAG local document retrieval and rolling conversation summaries.
* **v1.1.0:** Bland AI voice telephony escalation loop and Rule §3.4a abuse safeguard.
* **v1.0.0:** Initial MVP sprint with Supabase auth, chat interface, and risk classifier.

