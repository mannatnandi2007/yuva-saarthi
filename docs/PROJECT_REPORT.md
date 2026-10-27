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
| **Phase 3: Telephony & Mood Engine** | Voice Calls & Mood Persistence | **Completed** | Bland AI voice alert loop, Rule §3.4a domestic abuse bypass, `messages.mood` and `mood_confidence` DB persistence |
| **Phase 4: Context & Session CRUD** | Summarization & Session Polish | **Completed** | 150-word rolling session summarizer, local document RAG (MiniLM), lazy session creation, date-grouped history |
| **Phase 5: Multi-Channel Alerts** | Notification Dispatcher & Safety | **Completed** | SMS (Fast2SMS), Telegram bot, Email (Resend) alert dispatch with 30-min deduplication and dry-run mode |
| **Phase 6: UI & Emotion Engine** | 3D Yusa & System Theme | **Completed** | Interactive 3D Yusa mascot, real-time Hinglish emotional engine, system-default theme (`prefers-color-scheme`), zero gradients |
| **Phase 7: Android Platform** | Capacitor & Mobile Architecture | **Completed** | Capacitor integration (`@capacitor/core`, `@capacitor/preferences`, `@capacitor/app`), safe-area CSS insets, native back button |
| **Phase 8: Security Hardening** | CORS, Rate Limiting & JWT | **Completed** | Configurable CORS whitelist (`CORS_ORIGINS`), in-memory sliding-window limiter on `/chat`, production JWT enforcement |
| **Phase 9: Automated Test Suite** | Comprehensive Verification | **Completed** | 154 passing unit and integration tests across 7 test suites, 100% green pass rate, clean frontend production build |
| **Phase 10: Documentation & Deploy** | Master Report & Production Signoff | **Completed** | Living architecture specification, environment matrix, Android build guide, and production checklist |

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
- [x] Backend-driven mood persistence on message records (Phase 3)
- [x] Multi-channel alert notifications: Fast2SMS, Telegram, Email (Phase 5)
- [x] Interactive 3D Yusa mascot + real-time Hinglish emotional engine (Phase 6)
- [x] Automatic system-default theme (`prefers-color-scheme`) with zero gradients (Phase 6)
- [x] Capacitor Android packaging and mobile-first responsive layout (Phase 7)
- [x] In-memory sliding-window rate limiting on `/chat` with 429 Retry-After (Phase 8)
- [x] Strict CORS origin validation & production JWT enforcement (Phase 8)
- [x] Comprehensive test suite with 154 automated passing tests (Phase 9)
- [x] Production documentation, packaging scripts, and deployment guide (Phase 10)

---

## 8. Test Coverage & Quality Assurance

The test suite in `backend/tests/` verifies end-to-end functionality across 154 automated unit and integration tests:

| Test Module | Tests | Primary Validations |
|---|:---:|---|
| `test_api.py` | 90 | User registration, authentication, chat completion, session CRUD, batch deletion, RAG retrieval, LLM health checks, provider telemetry |
| `test_phase2_llm.py` | 17 | Multi-turn context windowing, circuit breaker state transitions (closed/open/half-open), structured JSON output parsing, pre-filter safety floor enforcement, word-boundary fallback |
| `test_phase3_mood.py` | 6 | MoodEnum validation, DB persistence on `messages.mood` and `mood_confidence`, chat service mood retrieval |
| `test_phase4_sessions.py` | 4 | Lazy session creation, pagination bounds (`limit`/`offset`), cross-session context seeding |
| `test_phase5_notifications.py` | 19 | Multi-channel dispatch (SMS, Telegram, Email), dry-run mode, 30-min deduplication, abuse safeguard bypass, helpline verification |
| `test_escalation_loop.py` | 8 | Sequential voice call retry loop, alert attempt database logging, Rule §3.4a abuse bypass, false positive thresholds |
| `test_phase8_security.py` | 10 | Sliding-window rate limiter, HTTP 429 Retry-After, strict CORS parsing, production JWT validation, dev-bypass lockdown |

**All 154 tests pass cleanly with `pytest` (100% green pass rate).**

---

## 9. Deployment & Environment Configuration

### Required Environment Variables

```env
# Runtime Environment
ENVIRONMENT=development                # Set to "production" in production deployments

# Supabase (Database & Realtime)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# LLM Providers (Dual-failover)
GEMINI_API_KEY=your-gemini-key         # Primary LLM provider
GROQ_API_KEY=your-groq-key             # Automatic failover provider

# Telephony Escalation
BLAND_AI_KEY=your-bland-ai-key         # Voice call emergency escalation

# Multi-Channel Notifications (Phase 5)
NOTIFY_CHANNELS=sms_fast2sms,telegram,email # Enabled channels (comma-separated)
NOTIFY_DRY_RUN=true                    # True in dev/staging (logs payloads without network charges)
FAST2SMS_API_KEY=your-fast2sms-key     # Fast2SMS Quick Transactional SMS
TELEGRAM_BOT_TOKEN=your-telegram-token # Telegram Bot API token
EMAIL_API_KEY=your-resend-key          # Resend / SendGrid API key
EMAIL_FROM=alerts@yuvasaarthi.in       # Verified sender email

# Security & CORS Hardening (Phase 8)
JWT_SECRET=strong-random-secret-32-chars-minimum # HS256 secret (enforced 32+ chars in production)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,https://localhost
RATE_LIMIT_PER_MINUTE=30               # Sliding-window rate limit on /chat
DEV_BYPASS_AUTH=false                  # Must be false in production (enforced at startup)
ENABLE_DEMO_ROUTES=false               # Set true only when testing mock demonstration scenarios
```

### Android Packaging (Capacitor)

```bash
cd frontend
# 1. Build production web bundle
npm run build

# 2. Sync web bundle with Capacitor Android platform
npm run build:android

# 3. Open in Android Studio for APK/AAB signing
npm run open:android
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
| **DEC-006** | Cross-Platform Storage Adapter | Unified `storage.js` layer | Uses native `@capacitor/preferences` on Android and `localStorage` on Web with synchronous fallback |
| **DEC-007** | Sliding-Window Rate Limiting | In-memory limiter with `Retry-After` header | Protects LLM inference budgets and `/chat` endpoints from abusive request flooding |
| **DEC-008** | Automatic System Theme | OS-level media query `(prefers-color-scheme: dark)` | Eliminates conflicting manual toggles while perfectly respecting user preferences |
| **DEC-009** | Emotional Resonance Engine | Hybrid Hinglish regex + backend mood states | Drives 3D Yusa expressions in real-time as the user types without waiting for server response |

---

## 11. Changelog

* **v2.10.0 (Phase 7–10: Android Packaging, Security Hardening & Full Overhaul Signoff):**
  * Integrated Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/preferences`, `@capacitor/status-bar`, `@capacitor/app`).
  * Created cross-platform `storage.js` adapter and hardware back button listener for Android.
  * Added CSS safe-area inset variables and mobile touch target rules (min 44px).
  * Added in-memory sliding-window rate limiter on `POST /chat` returning HTTP 429 with `Retry-After`.
  * Added configurable CORS whitelist (`CORS_ORIGINS`) and production JWT secret enforcement.
  * Created Phase 8 security unit test suite (`test_phase8_security.py`) bringing total automated tests to 154 (100% passing).
  * Updated living documentation in `docs/PROJECT_REPORT.md` and `README.md`.
* **v2.6.0 (Phase 6 UI Design Overhaul & 3D Yusa Emotional Resonance):**
  * Flat pastel design system with 2.5px solid strokes, warm surfaces, and zero gradients.
  * Automatic system-default theme (`prefers-color-scheme`) with dynamic listener and no conflicting toggles.
  * Interactive 3D Yusa companion mascot with procedural Three.js geometry and fluid float animation.
  * Real-time emotional resonance engine mapping Hinglish keywords to 3D facial expressions (`NORMAL`, `HAPPY`, `DISTRESSED`, `STRESSED`, `HURT`, `FRUSTRATED`, `OVERWHELMED`, `EXHAUSTED`).
* **v2.5.0 (Phase 5 Multi-Channel Emergency Notification System):**
  * Created `notification_dispatcher.py` supporting SMS (Fast2SMS), Telegram bot, and Email (Resend).
  * Implemented 30-minute deduplication window per user and category.
  * Enforced Rule §3.4a domestic abuse contact bypass on all external notification channels.
  * Added dry-run mode and 19 dedicated unit tests in `test_phase5_notifications.py`.
* **v2.4.0 (Phase 4 Session Management & History Polish):**
  * Lazy session creation on first message; eliminated dummy session IDs.
  * Resilient API client with cold-start server warmup ping and auth interceptors.
  * Sidebar date grouping (Today, Yesterday, This Week, Earlier) and 4 dedicated unit tests.
* **v2.3.0 (Phase 3 Backend Mood Engine & Persistence):**
  * Database persistence on `messages.mood` and `mood_confidence` with 6 dedicated unit tests.
* **v2.1.0 (Phase 2 LLM & Chat Architecture Overhaul):**
  * Dual Gemini ↔ Groq failover, circuit breaker, single-turn structured JSON, pre-filter safety floor.
* **v2.0.0 (Phase 1 Clean Foundation):**
  * Cleaned deprecated routes, gated demo routes, unified naming to "Yuva Saarthi".


