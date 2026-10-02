# YUVAA Saarthi — Prototype Project Report
> **As of:** October 2, 2026 | **Version:** 1.3.0 | **Repository:** `mannatnandi2007/yuvva-saarthi`

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Team & Ownership](#2-team--ownership)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Feature Implementation Status](#6-feature-implementation-status)
7. [NLP Mood Detection & Yusa Mapping](#7-nlp-mood-detection--yusa-mapping)
8. [User Workflow](#8-user-workflow)
9. [System Workflow (Technical)](#9-system-workflow-technical)
10. [Implementation Process Phase-by-Phase](#10-implementation-process-phase-by-phase)
11. [Known Bugs Fixed](#11-known-bugs-fixed)
12. [Pending Features & Incomplete Tasks](#12-pending-features--incomplete-tasks)
13. [Testing Coverage](#13-testing-coverage)
14. [Deployment Configuration](#14-deployment-configuration)
15. [Local Development Setup](#15-local-development-setup)
16. [Security Considerations](#16-security-considerations)

---

## 1. Project Overview

**YUVAA Saarthi** ("Youth Companion") is a youth mental well-being web application designed specifically for Indian teenagers (13-18). The app provides:

- **Empathetic AI companionship** through natural, code-switched Hinglish conversation.
- **Real-time clinical risk detection** — identifying self-harm ideation, domestic abuse, and acute emotional distress.
- **Intelligent safety escalation** — calling registered emergency contacts via AI voice telephony (Bland AI), with a critical abuse safeguard that bypasses personal contacts entirely to protect the user.
- **RAG-grounded responses** — replies anchored in WHO, NIMHANS, and ICMR clinical guidelines.

The prototype was built in a compressed **7-day sprint (August 14-20, 2026)** by a 4-person team with distinct ownership areas.

---

## 2. Team & Ownership

| Member | Role | Primary Responsibilities |
|:---|:---|:---|
| **Mannat** | Lead / LLM / Escalation | Project scaffold, Gemini/Groq LLM pipeline, Bland AI telephony integration, rolling summary generator, risk classifier tuning, RAG context wiring |
| **Khushal** | Backend & API | Supabase Auth wiring, Phone-OTP flow, FastAPI endpoints for chat/sessions, backend bug fixes |
| **Aakansha** | DB / SQL | PostgreSQL schema design, pgvector migration, RAG table, DB index optimization, similarity search function (latest PR Sep 8) |
| **Yashika** | NLP / UI | Hinglish keyword lists, Signup UI multi-contact form, priority ordering UI, test case sets |

---

## 3. System Architecture

```
+------------------------------------------------------------------+
|                   FRONTEND  (React 18 + Vite)                    |
|   Pages:      Signup -> OTP Verify -> Consent -> Chat            |
|   Components: BrainLogo  PolicyModal  ContactsDrawer             |
|   State:      localStorage session persistence                    |
+----------------------------+-------------------------------------+
                             | HTTP (Axios)
                             | Bearer JWT tokens
                             v
+------------------------------------------------------------------+
|                  BACKEND  (FastAPI, Python 3.12)                 |
|                                                                  |
|  Routers:                                                        |
|   /auth       - signup, login, OTP verify, JWT issue             |
|   /chat       - session CRUD, message send, history              |
|   /escalation - Bland AI voice escalation trigger                |
|   /rag        - document ingest, retrieval, folder scan          |
|   /risk       - risk event lookup                                |
|   /users      - profile & contacts fetch                         |
|   /demo       - end-to-end demo walkthrough endpoint             |
|                                                                  |
|  Services (Core Pipeline per message):                           |
|   1. pre_filter       <- Regex keyword tripwire                  |
|   2. classifier       <- LLM JSON-structured risk classifier     |
|   3. rag_service      <- In-memory KB + pgvector retrieval       |
|   4. folder_rag_service <- Local .docx/.pdf folder RAG          |
|   5. llm_service      <- Gemini -> Groq failover pipeline        |
|   6. summary_service  <- Rolling 150-word summary generator      |
|   7. bland_ai         <- Telephony escalation loop               |
|   8. chat_service     <- Orchestrates all above                  |
+-------------------+------------------------+--------------------+
                    |                        |
                    v                        v
+----------------------+     +----------------------------------+
|  Supabase (Postgres) |     |  External AI APIs                |
|   users              |     |   Google Gemini 2.5 Flash        |
|   emergency_contacts |     |     (Primary LLM)                |
|   sessions           |     |   Groq Cloud llama-3.3-70b       |
|   messages           |     |     (Auto-failover LLM)          |
|   risk_events        |     |   Bland AI (Voice telephony)     |
|   alert_attempts     |     +----------------------------------+
|   rag_documents      |
|   (VECTOR 384 dims)  |
+----------------------+
```

### Technology Stack

| Layer | Technology |
|:---|:---|
| Frontend | React 18, Vite, Vanilla CSS (custom dark glassmorphism) |
| Backend | FastAPI 0.100+, Python 3.12, Uvicorn |
| Database | Supabase (PostgreSQL 15 + pgvector extension) |
| Auth | HS256 JWT (app-issued) + Supabase OTP (phone-based) |
| Primary LLM | Google Gemini 2.5 Flash (via REST API) |
| Fallback LLM | Groq Cloud (llama-3.3-70b-versatile) |
| Telephony | Bland AI conversational voice agent (REST API) |
| Embeddings | all-MiniLM-L6-v2 (SentenceTransformers, 384 dimensions) |
| Orchestration | LangChain sequential pipeline (custom LCEL chain) |
| Testing | pytest 9.1, pytest-asyncio |
| Deployment (planned) | Vercel (frontend), Railway/Render (backend) |

---

## 4. Database Schema

8 core tables in PostgreSQL (Supabase):

### `users`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | Auto-generated |
| phone | TEXT UNIQUE | Primary contact identity |
| username | TEXT UNIQUE | Chosen at signup |
| first_name, last_name | TEXT | Display name |
| age_band | TEXT | `under-13`, `13-15`, `16-17`, `18-plus`, `other` |
| consent_given_at | TIMESTAMPTZ | Safety promise timestamp |
| policy_ack_at | TIMESTAMPTZ | Policy acknowledgement timestamp |
| created_at | TIMESTAMPTZ | Auto |

### `emergency_contacts`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| user_id | UUID FK -> users | Cascade delete |
| phone, first_name, last_name | TEXT | |
| relationship | TEXT | `Parent`, `Guardian`, `Sibling`, `Friend`, `Other` |
| priority_order | INT 1-3 | Dial order for escalation |

### `sessions`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| user_id | UUID FK -> users | |
| started_at | TIMESTAMPTZ | |
| summary_snapshot | TEXT | Rolling 150-word LLM summary |

### `messages`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| session_id | UUID FK -> sessions | |
| sender | TEXT | `user`, `assistant`, `system` |
| content | TEXT | Message body |
| risk_tier | TEXT | `none`, `low`, `medium`, `high` |
| risk_rationale | TEXT | LLM classification justification |
| created_at | TIMESTAMPTZ | |

### `risk_events`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| user_id | UUID FK -> users | |
| message_id | UUID FK -> messages | |
| severity | TEXT | `none`, `low`, `medium`, `high` |
| category | TEXT | `self_harm`, `abuse`, `distress`, `none` |
| action_taken | ENUM | `call_placed`, `sms_sent`, `attempted_failed`, `logged_only`, `routed_to_helpline` |

### `alert_attempts`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| risk_event_id | UUID FK | |
| emergency_contact_id | UUID FK | |
| attempt_order | INT | 1, 2, or 3 |
| channel | TEXT | `call`, `sms` |
| outcome | TEXT | `answered`, `no_answer`, `declined`, `invalid_number`, `sent` |

### `rag_documents`
| Column | Type | Notes |
|:---|:---|:---|
| id | UUID PK | |
| source | TEXT | e.g., `"WHO Psychological First Aid"` |
| title | TEXT | |
| chunk_text | TEXT | Raw clinical guideline chunk |
| embedding | VECTOR(384) | MiniLM-L6-v2 embedding, IVFFlat cosine index |

---

## 5. API Endpoints Reference

### Auth `/auth`
| Method | Path | Description |
|:---|:---|:---|
| POST | `/auth/signup` | Register user with emergency contacts + consent |
| POST | `/auth/login` | Login by username, triggers OTP send |
| POST | `/auth/verify-otp` | Verify OTP code, issues JWT token |
| POST | `/auth/logout` | Invalidate session |

### Chat `/chat` and `/sessions`
| Method | Path | Description |
|:---|:---|:---|
| POST | `/sessions` | Create a new conversation session |
| GET | `/sessions` | List all sessions for user (with AI headings) |
| DELETE | `/sessions/{id}` | Delete a single session + messages |
| DELETE | `/sessions` | Wipe all sessions and history |
| POST | `/chat` | Send message, get AI reply + risk classification |
| GET | `/chat/history/{session_id}` | Retrieve message history |
| DELETE | `/chat/history/{session_id}` | Alias for deleting a session |

### Users
| Method | Path | Description |
|:---|:---|:---|
| GET | `/users/me` | Get authenticated user profile |
| GET | `/contacts` | Get emergency contacts ordered by priority |

### Escalation
| Method | Path | Description |
|:---|:---|:---|
| POST | `/escalation/trigger` | Trigger Bland AI sequential voice call loop |

### RAG
| Method | Path | Description |
|:---|:---|:---|
| POST | `/rag/ingest` | Insert document chunk + embedding into DB |
| POST | `/rag/retrieve` | Retrieve top-k similar clinical guidelines |
| GET | `/rag/files` | List indexed local RAG document files |
| POST | `/rag/scan` | Re-scan and refresh local folder RAG cache |

### Risk
| Method | Path | Description |
|:---|:---|:---|
| GET | `/risk/events` | Get risk events for session |

### Demo
| Method | Path | Description |
|:---|:---|:---|
| GET | `/demo/scenarios` | List preset demo scenarios |
| POST | `/demo/run` | Execute a full pipeline demo with a scenario |

---

## 6. Feature Implementation Status

### Fully Implemented (30 Features)

| # | Feature | Details |
|:---|:---|:---|
| 1 | **User Signup & Onboarding** | Username, phone, age band, up to 3 prioritized emergency contacts with relationship tags |
| 2 | **OTP Authentication** | Supabase phone-OTP flow, HS256 JWT issued on verify |
| 3 | **Scroll-to-Read Consent Page** | Policy box with scroll-unlock gate before checkboxes enabled. Timestamps `consent_given_at` and `policy_ack_at` |
| 4 | **Dedicated Policies Page** | Standalone `/policies` view with full disclosure: data policy, abuse safeguard mechanics, user rights |
| 5 | **Multi-Session Chat UI** | Sidebar showing previous sessions with AI-generated headings, inline delete buttons, new session creation |
| 6 | **Keyword Pre-filter (Tripwire)** | Dual regex engine: ~40 English patterns + ~40 Hinglish (Roman-script) patterns for self-harm, abuse, distress |
| 7 | **LLM Clinical Risk Classifier** | LangChain JSON-mode pipeline, structured output `{severity, category, rationale}` using Gemini/Groq |
| 8 | **Hinglish Culture-Aware Prompting** | Extensive system prompt with colloquial hyperbole guards (e.g. `"mar jaunga"` as exam stress, not suicide) |
| 9 | **False Positive Guard (Phase 5)** | `BENIGN_CONTEXT_PHRASES` list + minimum word count thresholds prevent academic-stress messages triggering high-severity |
| 10 | **Multi-Provider LLM Failover** | Primary: Gemini 2.5 Flash -> Auto-failover: Groq Cloud llama-3.3-70b -> Final: local Hinglish fallback engine |
| 11 | **Gemini Quota Circuit Breaker** | `trip_gemini_cooldown(seconds)` in `config.py` — HTTP 429 routes all calls to Groq for configurable cooldown window |
| 12 | **Dynamic LLM-Generated Crisis Guidance** | Removed hardcoded canned replies. Clinical protocols injected as dynamic `crisis_guidance` into every LLM call |
| 13 | **Abuse Safeguard (PRD 3.4a)** | If `severity==high` AND `category==abuse`: personal contacts **completely bypassed**. Routes to Childline 1098 / KIRAN 1800-599-0019 only |
| 14 | **Self-Harm Escalation (Bland AI)** | Priority-ordered sequential voice call loop (P1 -> P2 -> P3) dispatched as async background task via `asyncio.create_task` |
| 15 | **Rolling Conversation Summary** | LLM-generated 150-word summary per turn (Gemini -> Groq -> local fallback), persisted to `sessions.summary_snapshot` |
| 16 | **AI Chat Headings** | `generate_chat_heading()` derives human-readable session titles from rolling summaries |
| 17 | **Session Deletion** | Full cascade delete of session + messages (both Supabase and in-memory cache cleared) |
| 18 | **In-Memory RAG Knowledge Base** | 8 curated entries from WHO, NIMHANS, ICMR: exam anxiety, crisis de-escalation, somatic grounding, loneliness, family conflict, emotional regulation, abuse support, teen self-care |
| 19 | **Folder RAG Service** | Scans `docs/` and `docs/rag_documents/` for `.txt`, `.md`, `.docx`, `.pdf` files; chunks, embeds with MiniLM-L6-v2 |
| 20 | **Supabase pgvector Search** | `search_supabase_rag()` — 384-dim query embeddings, calls `match_rag_documents` pgvector RPC for similarity retrieval |
| 21 | **Local Folder RAG Fallback** | Token-overlap similarity search when Supabase is unreachable |
| 22 | **Cross-Login Session Context** | `summary_snapshot` loaded at start of new session for persistent psychological context across logins |
| 23 | **Emergency Contacts Drawer** | Slide-out drawer from Chat UI showing all registered emergency contacts with one-tap SOS call links |
| 24 | **Policy Modal** | Lightweight in-app policy overlay accessible from chat header |
| 25 | **Demo Endpoint** | `/demo/run` executes full pre-filter -> classifier -> RAG -> response pipeline for 5 preset scenarios |
| 26 | **61-Test Automated Suite** | Covers: auth, session CRUD, chat pipeline, risk classification, escalation loop, cross-login context, false positive guard |
| 27 | **Batch Launch Scripts** | `run.bat` — single-click launcher for both backend (port 8000) and frontend (port 5173) |
| 28 | **Supabase Schema Migrations** | 4 migration files: initial schema, missing columns, pgvector dimension change (1536 -> 384), master consolidated |
| 29 | **NLP Mood Detection Engine** | Client-side dictionary-based NLP system scanning last 3 user messages across 10 mood categories (English + Hinglish). Includes negation handling, priority-based mood arbitration, and ~300 bilingual phrases. See [§7](#7-nlp-mood-detection--yusa-mapping) for full details. |
| 30 | **Yusa Visual Mood Mapping** | Real-time mapping of all 10 detected moods to distinct Yusa mascot visual states — unique body color, SVG facial expression (eyes, mouth, brows), blush toggle, animation speed/type, and contextual speech bubble per mood. |

---

### Failed / Not Implemented (12 Items)

| # | Feature | Reason / Status |
|:---|:---|:---|
| 1 | **SMS Fallback for Emergency Contacts** | `action_taken_type` enum includes `sms_sent` and DB schema supports it, but no SMS provider (Twilio/fast2sms) was integrated. Calls only. |
| 2 | **WHO/NIMHANS/ICMR Vector Ingestion into DB** | 5 PDFs present in `docs/rag_documents/` (ICMR Anxiety, ICMR Depression, 3 WHO docs) but no automated ingestion pipeline. Documents served via local folder RAG only, not Supabase pgvector. |
| 3 | **Real Supabase Phone-OTP Integration** | OTP UI and backend route exist but prototype runs in dev bypass mode (`DEV_BYPASS_AUTH=true`). True OTP with live phone numbers not tested end-to-end. |
| 4 | **Cross-Login Context API (Khushal's Task)** | Listed uncompleted in `TASKS.md`. Rolling summary stored and loaded per session, but formal cross-session retrieval API not delivered. |
| 5 | **Abuse Disclosure Copy in Chat UI (Yashika's Task)** | Marked incomplete in `TASKS.md`. Consent page has safeguard language and policies page exists, but in-chat visible disclosure copy for section 3.4a not finalized. |
| 6 | **Test Conversation Sets (Yashika's Task)** | Structured English + Hinglish + abuse test scenario files not formally delivered. Testing done manually via `/demo` endpoint. |
| 7 | **Frontend Production Deployment (Vercel)** | App builds locally. No live hosted URL exists. Vercel config not executed. |
| 8 | **Backend Cloud Deployment (Railway/Render)** | Not deployed. Backend runs only on local `localhost:8000`. |
| 9 | **Row-Level Security (RLS) in Supabase** | All 7 tables have `DISABLE ROW LEVEL SECURITY` in master schema. RLS policies not yet written. |
| 10 | **Full Account Deletion (Right-to-Erase)** | Consent page mentions it; session deletion exists. But no endpoint atomically deletes user row + contacts + all sessions + messages. |
| 11 | **Bland AI Live Testing** | Integration fully coded with dev-mode simulation fallback. No live API key confirmed active during sprint — calls simulated/logged only. |
| 12 | **sentence-transformers in requirements.txt** | `sentence_transformers` used in `folder_rag_service.py` but missing from `requirements.txt`. Must be installed manually. |

---

## 7. NLP Mood Detection & Yusa Mapping

YUVAA Saarthi implements a client-side NLP mood detection engine that scans user messages in real-time and maps the detected emotional state to the Yusa companion mascot's visual appearance. This system runs entirely in the browser (`Chat.jsx`) with zero backend latency, providing immediate emotional feedback.

### 7.1 Detection Architecture

The mood detection pipeline (`detectMood()` in `Chat.jsx`) follows a 4-stage process:

```
User sends a message
  |
  +--[Stage 1]-- Extract last 3 user messages (most recent first)
  |
  +--[Stage 2]-- Text normalization: lowercase, strip punctuation, collapse whitespace
  |
  +--[Stage 3]-- Dictionary phrase matching (10 mood categories × ~30 phrases each)
  |              For each matched phrase:
  |                → Check negation context (20-char prefix window)
  |                → Apply priority-based arbitration (VERY_SCARED=5, distress=4, ...)
  |                → Highest-priority non-negated match wins
  |
  +--[Stage 4]-- Return detected mood → passed as prop to <YusaCompanion mood={...} />
```

### 7.2 Supported Mood Categories & Bilingual Dictionaries

Each mood category contains ~25-50 bilingual phrases covering both English and Hinglish (Hindi in Roman script), curated for Indian teen conversational patterns.

| # | Mood | Priority | Sample English Phrases | Sample Hinglish Phrases | Total Phrases |
|:---|:---|:---|:---|:---|:---|
| 1 | **VERY_SCARED** | 5 (Critical) | `suicide`, `kill myself`, `want to die`, `end my life`, `self-harm` | — | ~13 |
| 2 | **ANXIOUS** | 4 (High) | `anxious`, `panic`, `overthinking`, `can't calm down`, `my mind won't stop` | `tension mein hoon`, `ghabrahat`, `dimag ruk nahi raha`, `chain nahi hai` | ~48 |
| 3 | **SCARED** | 4 (High) | `scared`, `terrified`, `don't feel safe`, `afraid` | `dar lag raha hai`, `darr gaya`, `safe feel nahi ho raha` | ~26 |
| 4 | **SAD** | 4 (High) | `sad`, `crying`, `heartbroken`, `depressed`, `empty` | `dukhi`, `udaas`, `rona aa raha hai`, `dil toot gaya`, `mood off hai` | ~46 |
| 5 | **ANGRY** | 4 (High) | `angry`, `furious`, `frustrated`, `rage`, `fed up` | `gussa`, `dimag kharab`, `pak gaya hoon`, `chidh raha hoon` | ~37 |
| 6 | **LONELY** | 4 (High) | `lonely`, `isolated`, `nobody cares`, `i have nobody` | `akela`, `koi nahi hai`, `koi samajhta nahi`, `baat karne wala koi nahi` | ~29 |
| 7 | **CONFUSED** | 4 (High) | `confused`, `overwhelmed`, `can't decide`, `stuck`, `lost` | `samajh nahi aa raha`, `handle nahi ho raha`, `dimag overload ho gaya` | ~37 |
| 8 | **TIRED** | 3 (Medium) | `tired`, `exhausted`, `drained`, `burnt out`, `no energy` | `thak gaya`, `energy nahi hai`, `dimag thak gaya`, `drained hoon` | ~33 |
| 9 | **OVERJOYED** | 2 (Positive) | `overjoyed`, `ecstatic`, `thrilled`, `best day ever` | `bahut zyada khush`, `dil garden garden`, `aaj toh kamaal ho gaya` | ~28 |
| 10 | **HAPPY** | 2 (Positive) | `happy`, `excited`, `amazing`, `feeling good` | `khush`, `mast`, `sab badhiya`, `maza aa raha hai`, `sukoon hai` | ~48 |
| 11 | **NORMAL** | 1 (Default) | `okay`, `fine`, `alright`, `calm` | `theek hoon`, `chill hoon`, `koi problem nahi` | ~32 |

**Total: ~377 bilingual mood phrases across 11 categories.**

### 7.3 Negation Handling

The system checks for negation prefixes within a 20-character window before each matched phrase to prevent false mood assignments:

```
Negation tokens: 'not', "don't", 'dont', "doesn't", 'doesnt', 'never',
                 'no longer', 'not feeling', "don't feel", 'dont feel'

Example:
  "I'm not sad"        → 'sad' is negated → does NOT trigger SAD
  "I'm sad"            → 'sad' is not negated → triggers SAD
  "I don't feel happy" → 'happy' is negated → does NOT trigger HAPPY
```

### 7.4 Priority-Based Mood Arbitration

When multiple mood signals appear in a single message, the highest-priority mood wins:

| Priority Level | Moods | Rationale |
|:---|:---|:---|
| **5 — Critical** | VERY_SCARED | Immediate crisis (suicidal ideation) overrides all other moods |
| **4 — High** | ANXIOUS, SCARED, SAD, ANGRY, LONELY, CONFUSED | Distress-class emotions take precedence over positive/neutral signals |
| **3 — Medium** | TIRED | Fatigue is notable but less urgent than active distress |
| **2 — Positive** | OVERJOYED, HAPPY | Positive signals are captured when no distress is present |
| **1 — Default** | NORMAL | Fallback when no mood signal is detected |

### 7.5 Yusa Visual Mood Mapping

Each detected mood maps to a distinct Yusa visual state, creating an ambient emotional mirror in the chat UI:

| Mood | Yusa Body Color | Facial Expression | Blush | Animation | Speech Bubble |
|:---|:---|:---|:---|:---|:---|
| **NORMAL** | `#D4D4D8` Soft white | Gentle oval eyes, small smile | ✅ | Float 4s | "I'm here with you 💜" |
| **HAPPY** | `#FDE047` Soft yellow | Bright round eyes with highlights, curved smile | ✅ | Float 3s | "Love to see you smile! 💜" |
| **OVERJOYED** | `#FBBF24` Warm golden | Crescent happy-arc eyes, wide open-mouth grin | ✅ | Float 2s (fast) | "You're glowing! ✨" |
| **SAD** | `#93C5FD` Light blue | Drooped brows, small round eyes, inverted frown | ❌ | None (still) | "I'm here for you 💙" |
| **ANGRY** | `#ea580c` Fiery orange | Thick V-shaped brows, dark round eyes, deep frown | ❌ | None (still) | "Take a deep breath 🌿" |
| **ANXIOUS** | `#FDBA74` Soft orange | Small worried eyes, raised brows, wavy mouth | ❌ | Float 1.5s (fast) | "We'll get through this 💜" |
| **SCARED** | `#CBD5E1` Pale gray-blue | Wide eyes with tiny pupils, raised brows, blue sweat drop, open 'O' mouth | ❌ | Float 1s (rapid) | "You are safe here 🛡️" |
| **VERY_SCARED** | Gradient (crisis) | Wide terrified white eyes, tiny pupils, raised brows, screaming oval mouth | ❌ | Float 0.3s (trembling) | — (crisis mode) |
| **LONELY** | `#C4B5FD` Soft purple | Drooped brows, small sad eyes, flat line mouth | ❌ | Float 4s (slow) | "I'm right here with you 🫂" |
| **TIRED** | `#D6D3D1` Warm grey | Closed drooping eyes (curved lines), small yawn mouth | ✅ | Float 5s (very slow) | "Rest is important 🌙" |
| **CONFUSED** | `#E9D5FF` Pale violet | Spiral/rolling eyes, wavy squiggle mouth | ❌ | Float 3.5s | "Let's take it one step at a time 🧩" |

### 7.6 Design Principles

- **Zero-latency feedback**: Mood detection runs client-side with no network calls, providing instant visual response as the user types.
- **Recency bias**: The system prioritizes the most recent message; it only falls back to older messages if the latest has no detectable mood.
- **Cultural sensitivity**: Dictionaries are curated for Indian teen conversational patterns, including Hinglish code-switching, exam stress hyperbole, and colloquial emotional expressions.
- **Non-clinical communication**: Yusa never displays clinical labels. Emotional state is conveyed through expressive character design — colors, facial expressions, animation tempo, and warm speech bubbles — to maintain a safe, non-judgemental atmosphere.
- **Responsive scaling**: Yusa renders at 180px (desktop), 150px (tablet), and 90px (mobile) to ensure presence without obstructing the chat UI.

---

## 8. User Workflow

```
NEW USER JOURNEY
================

[1] Open App --> Signup Page
    Enter: username, first name, last name, phone, age band
    Add 1-3 emergency contacts with name, phone, relationship, priority order
    Click "Continue to Safety Agreement"

[2] Consent Page
    Scroll through policy box (checkboxes are LOCKED until fully scrolled)
    Optionally open "Full Policies Page" (dedicated standalone view)
    Check both acknowledgement boxes (Policy Ack + Safety Promise)
    Click "I Agree, Let's Begin"

[3] OTP Verification
    Receive OTP on registered phone (dev mode: skipped automatically)
    Enter 6-digit code -> verified -> JWT issued -> redirect to Chat

[4] Chat Page (Main Experience)
    Sidebar: list of previous sessions with AI-generated headings
    Click any session to resume, or click "+" for a new session
    Type message in Hinglish, Hindi, or English
    AI responds empathetically, grounded in clinical guidelines
    Yusa mascot reacts in real-time to detected mood (NLP mood detection)
    If distress detected     -> supportive, warm, non-robotic response
    If self-harm detected    -> KIRAN / Tele-MANAS + background Bland AI call
    If abuse detected        -> Childline 1098; NO personal contacts called (Rule 3.4a)

[5] Emergency Contacts Drawer
    Click SOS icon in top-right of Chat header
    Slide-out drawer shows all registered contacts with one-tap call links

[6] Policy Modal
    Click Shield icon in header -> in-app policy overlay (quick reference)

RETURNING USER JOURNEY
======================

[1] Open App -> Auto-logged in from localStorage session
[2] Previous sessions listed with AI headings, newest first
[3] Click any session to resume with full psychological context
[4] Yusa mood updates with each new message based on NLP mood detection
[5] Or click logout to return to signup
```

---

## 9. System Workflow (Technical)

### Per-Message Pipeline: POST /chat

```
Client --> POST /chat  {session_id, message}
  |
  +--[Auth]-- JWT verified via get_current_user() dependency
  |
  +--[Step 0]-- session ownership validated
  |             rolling summary loaded from DB / in-memory cache
  |
  +--[Step 1]-- pre_filter.check_message_tripwire()
  |              Regex scan: ~80 English + Hinglish patterns
  |              Returns: (is_triggered, matched_keywords, language)
  |
  +--[Step 2]-- classifier.classify_message_risk()
  |              Benign phrase guard (false positive protection)
  |              LangChain -> Gemini -> JSON: {severity, category, rationale}
  |              Auto-failover to Groq if Gemini HTTP 429 or offline
  |              Local keyword fallback if both LLMs unavailable
  |
  +--[Step 3]-- Crisis guidance selection (dynamic, no hardcoded strings)
  |              severity==high + category==abuse     -> Safe Haven Abuse Protocol
  |              severity==high + category==self_harm -> Crisis De-escalation Protocol
  |              severity==medium                     -> Emotional Support Protocol
  |
  +--[Step 4]-- LangChain chain.invoke({user_message, rolling_summary, crisis_guidance})
  |              Primary:  _call_gemini_chat()  with full clinical system prompt
  |              Failover: _call_groq_chat()
  |              Fallback: local Hinglish reply engine
  |
  +--[Step 5]-- User message + AI reply saved to `messages` table
  |
  +--[Step 6]-- Risk event logged to `risk_events` table
  |
  +--[Step 7]-- Escalation routing:
  |              severity==high AND category==abuse:
  |                Rule 3.4a: NO calls. action_taken = "routed_to_helpline"
  |              severity==high AND category!=abuse:
  |                asyncio.create_task -> Bland AI sequential loop (P1->P2->P3)
  |
  +--[Step 8]-- Background summary update (asyncio.create_task)
  |              new rolling summary -> chat heading derived -> saved to sessions
  |
  +--> RESPONSE: {reply, risk_classification, action_taken, heading, session_id}


Client-side (after response received):
  |
  +--[Step 9]-- NLP Mood Detection (Chat.jsx, runs entirely in browser)
  |              detectMood(messages) scans last 3 user messages
  |              Dictionary phrase match → negation check → priority arbitration
  |              Returns: NORMAL | HAPPY | OVERJOYED | SAD | ANGRY | ANXIOUS |
  |                       SCARED | VERY_SCARED | LONELY | TIRED | CONFUSED
  |
  +--[Step 10]- Yusa Visual State Update
  |              <YusaCompanion mood={currentMood} />
  |              Maps detected mood → body color, facial SVG, animation, speech bubble
  |              Zero-latency (no network call), instant visual feedback
```

### Bland AI Escalation Loop

```
trigger_sequential_escalation(user_id, contacts=[P1, P2, P3])
  |
  +--> Loop: for each contact in priority order:
  |      fetch emergency_contact from DB
  |      trigger_bland_ai_call(phone, task_prompt, first_sentence, voice="maya")
  |      log_alert_attempt(attempt_order, channel="call", outcome)
  |      if outcome == "answered" AND stop_on_first_answer: STOP
  |
  +--> Returns: {total_attempts, calls_dispatched, attempts[]}
```

### Rolling Summary Pipeline

```
generate_rolling_summary(existing_summary, user_message, assistant_reply)
  |
  +--> 1. Gemini REST API (1.8s timeout, model pool: gemini-flash-latest, 3.8-flash...)
  +--> 2. Groq Cloud API  (qwen/qwen3.8-27b, 5s timeout)
  +--> 3. Local deterministic concatenation fallback
       |
       +--> _truncate_to_word_cap(summary, max_words=150)
       +--> saved to sessions.summary_snapshot + _IN_MEMORY_SUMMARIES dict
```

---

## 10. Implementation Process Phase-by-Phase

### Phase 1: Setup & Auth — Aug 14-15 — COMPLETE
- FastAPI + React + Vite project skeleton scaffolded
- Supabase project created; core tables: `users`, `emergency_contacts`, `sessions`, `messages`
- Phone OTP authentication wired to Supabase Auth
- HS256 JWT token generation implemented (72-hour expiry)
- Signup UI: multi-contact form with priority ordering
- Consent page with policy acknowledgement checkboxes

### Phase 2: Core Chat & Risk Prep — Aug 16 — COMPLETE
- Chat UI connected to FastAPI `/chat` endpoint
- Session create / list / history APIs built
- Hinglish mirroring system prompt authored
- RAG document table schema created with `pgvector` extension
- Hinglish keyword lists authored (`pre_filter.py`)

### Phase 3: Risk Engine & Escalation — Aug 17-18 — MOSTLY COMPLETE
- LLM JSON-structured risk classifier built (LangChain pipeline)
- Bland AI integration written (`bland_ai.py`)
- Sequential escalation loop implemented
- Abuse bypass safeguard (section 3.4a) implemented and tested
- `risk_events` and `alert_attempts` DB tables created
- **Missed:** Keyword/regex pre-filter stub (Yashika), Policy disclosure copy (Yashika)

### Phase 4: RAG & Context — Aug 19 — PARTIALLY COMPLETE
- Rolling summary generator built (Gemini -> Groq -> fallback)
- RAG context wired into LLM system prompt
- Folder RAG service built (scans .txt, .md, .docx, .pdf)
- pgvector similarity search function added by Aakansha (PR merged Sep 8)
- **Missed:** Cross-login context API (Khushal), WHO/NIMHANS/ICMR full vector ingestion (Aakansha)

### Phase 5: Testing & Prototype Wrap — Aug 20 — MOSTLY COMPLETE
- False positive threshold tuning (`BENIGN_CONTEXT_PHRASES`, `MIN_WORDS_FOR_MEDIUM_TRIPWIRE`)
- Demo script integration (`/demo/run` with 5 preset scenarios)
- 61-test automated pytest suite written and all passing
- Batch launch scripts created (`run.bat`, `start.bat`)
- **Missed:** Yashika's formal test conversation sets, cloud deployment

### Post-Sprint Improvements — Aug 21 through Oct 2
- Dynamic crisis guidance system (replaced all hardcoded canned crisis replies)
- Gemini quota circuit breaker (`trip_gemini_cooldown`)
- Multi-session sidebar with AI-generated headings
- Session deletion endpoints (single + wipe-all)
- New UI components: ContactsDrawer, PolicyModal, BrainLogo
- Dedicated PoliciesPage
- Scroll-to-unlock consent gate
- Hallmark dark glassmorphism UI redesign
- Supabase pgvector `search_supabase_rag()` function (Aakansha, Sep 8)
- Master consolidated schema migration
- Auth improvements: username uniqueness check order, transient session UUID error resilience
- **NLP Mood Detection Engine** — Client-side dictionary-based NLP system with ~377 bilingual (English + Hinglish) phrases across 10 mood categories, negation handling, and priority-based arbitration (`Chat.jsx`)
- **Yusa Visual Mood Mapping** — Full 11-state visual mapping from detected mood to Yusa mascot appearance: distinct body colors, SVG facial expressions (eyes, brows, mouth), blush toggles, animation speeds, and contextual speech bubbles (`YusaCompanion.jsx`)
- **Yusa 3D Rendering** — CSS 3D-styled Modak character with mood-reactive color and crisis trembling effect (`Yusa3D.jsx`)
- **PWA Installation & Offline Support (Task 1)** — Web App Manifest (`manifest.json`), service worker (`sw.js`) with cache fallback, standalone display mode, and responsive SVG icons.
- **Dynamic Environment & Emotional Animation (Task 2)** — Real-time reactive environment shifts (`.dynamic-env`, `.env-happy`, `.env-sad`, `.env-angry`, `.env-anxious`, `.env-tired`) with jumping & wiggling Yusa (`@keyframes yusaJumpWiggle`), gloomy dimmed mist for sadness, and 4-second breathing cues for panic.
- **Hallmark & SATQuery Standard (Tasks 3 & 4)** — Eradication of 20 banned AI generator patterns (`docs/UIrules.md`), strict 8-state interactive buttons, 4-pt/8-pt spacing tokens, Roman-only headings, and tabular numerals.
- **Youth-Centric Non-Technical Landing Page (Task 5)** — Empathetic, relatable landing experience addressing board exam stress, family pressure, and loneliness, with 3 easy steps and interactive FAQ (`LandingPage.jsx`).
- **LangChain Anti-Generic Engine (Task 6)** — Eradicated robotic cliches ("take a deep breath", "sab theek ho jayega"). Implemented active listening topic mirroring and dynamic Hinglish/English contextual fallbacks (`llm_service.py`).
- **Bland AI Auto-Calling Escalation (Task 7)** — Auto-dialing on self-harm OR high anxiety/panic detection; agent introduces itself as Yusa, addresses guardian by user-designated relationship, and issues an explicit emergency warning stating this is not a mock call (`bland_ai.py`, `chat_service.py`).
- **User-Friendly Clean UI (Task 8)** — Removed technical tags ("Rule §3.4a Active", "Neural Engine", etc.) and added 0.6s cubic-bezier smooth mood transitions.
- **Pink & Purple Design Palette (Task 9)** — Curated pink & purple palette system across cards, buttons, tabs, Yusa emotions, and dynamic ambient glows.
- **Smooth Navigation Transitions (Task 10)** — Animated router transitions (`pageFadeSlideIn`) for seamless shifts between Landing, Auth, Chat, and Policies.
- **Jumping & Chittering Yusa Companion (Task 11)** — Interactive animated companion on Login/Signup pages (`YusaSideMascot.jsx`) with playful bouncing, speech bubbles, and tap reactions.

---

## 11. Known Bugs Fixed

| Bug ID | Description | Fix Applied |
|:---|:---|:---|
| BUG-001 | Chat failing when Gemini API key absent | Multi-provider failover chain: Gemini -> Groq -> local |
| BUG-002 | `/rag/ingest` not writing to Supabase | Fixed to actually call `supabase.table("rag_documents").insert()` |
| BUG-003 | Auth issuing plain-text tokens instead of JWTs | `_create_access_token()` with HS256 PyJWT implemented |
| BUG-004 | Missing `consent_given_at` / `policy_ack_at` columns | Added in schema migration `20260831000001` |
| BUG-007 | Missing identity fields (first_name, last_name, username) | Added in schema migration |
| BUG-008 | In-memory dict used as primary user store instead of Supabase | Refactored: Supabase is primary; in-memory is dev-cache only |
| BUG-009 | Hardcoded canned crisis replies had no empathy variation | Replaced with dynamic clinical guidance injected into LLM prompt |
| BUG-010 | Session deletion not clearing in-memory summary cache | `delete_session()` now calls `_IN_MEMORY_SUMMARIES.pop()` |
| BUG-011 | Invalid UUID session IDs crashing Supabase lookup | `validate_session_ownership()` now handles transient/local session IDs gracefully |
| BUG-012 | `folder_rag_service.py` raising exception on Supabase RLS failure | Changed to warning + local fallback; does not re-raise |
| BUG-013 | Missing blank line between `search_folder_rag()` and `search_supabase_rag()` | Fixed PEP 8 spacing + added section header comment |

---

## 12. Pending Features & Incomplete Tasks

### Active Focus Sprint — In Progress (Phase 6)

- **Multi-Session Deletion**:
  - UI multi-selection mode in sidebar (checkboxes, "Select All", animated confirmation modal).
  - Backend batch deletion endpoint (`DELETE /chat/sessions/bulk` or `POST /chat/sessions/batch-delete`), cascading database cleanup of messages and sessions, and RAG/summary cache purge.
- **LLM Multi-Provider Failover & Resilience**:
  - Robust multi-tier provider fallback chain: Gemini 2.5 Flash → Groq Llama 3 / Mixtral → Fallback.
  - Quota circuit breaker (`trip_gemini_cooldown`), automated cooldown recovery timer, and failover latency retry logic.
- **Hallmark UI Improvements**:
  - Cohesive anti-AI-slop design system rollout with dark glassmorphism tokens, refined typography (Outfit / Inter), tactile touch targets, smooth sidebar transitions, and accessibility polish.

### High Priority — Production Blockers

1. **Row-Level Security (RLS)** — All 7 tables have RLS disabled. RLS policies must be written before any user-facing deployment.
2. **Real Supabase Phone-OTP** — Live OTP flow needs end-to-end testing with real phone numbers (non-dev bypass mode).
3. **`sentence_transformers` missing from requirements.txt** — Add `sentence-transformers>=2.6.0` to prevent broken deployments.
4. **Account Deletion endpoint** — No endpoint atomically deletes user row + contacts + sessions + messages.

### Medium Priority — Feature Gaps

5. **WHO/NIMHANS/ICMR PDF ingestion pipeline** — 5 PDFs in `docs/rag_documents/` need chunking and embedding into Supabase pgvector.
6. **SMS escalation channel** — `alert_attempts.channel` supports `sms` but no provider integrated.
7. **Vercel + Railway deployment** — Frontend and backend not deployed; no live URL exists.
8. **Abuse disclosure UI copy in Chat** — In-chat section 3.4a visible disclosure panel language needs finalization (Yashika's task).

### Low Priority — Polish

9. **Formal test conversation sets** — Structured English + Hinglish + abuse test data files (Yashika's task).
10. **Bland AI live key verification** — Confirm API key is active; test real call dispatch.
11. **CORS lock-down** — Backend allows `allow_origins=["*"]`; should be restricted to Vercel URL in production.
12. **httpx2 migration** — FastAPI test client deprecation warning: `httpx` vs `httpx2`.
13. **pgvector IVFFlat index tuning** — Index has `lists=10`; may need tuning for larger production data volumes.

---

## 13. Testing Coverage

### Automated — pytest 9.1

| Test File | Coverage Area |
|:---|:---|
| `test_api.py` (53 tests) | Signup, login, OTP, session create/list/delete, chat send, risk classification, escalation routing, RAG retrieval, demo endpoint, cross-login context, history |
| `test_escalation_loop.py` (8 tests) | Bland AI sequential loop mechanics, abuse bypass safeguard, alert attempt logging |

> **Last run:** September 9, 2026 — **61 passed, 0 failed, 3 deprecation warnings** — Runtime: 97 seconds

### Demo Scenarios — `/demo/run`

| Scenario | Test Case | Expected Outcome |
|:---|:---|:---|
| `exam_stress` | Hinglish exam anxiety | LOW distress, no escalation |
| `self_harm` | Explicit self-harm ideation | HIGH self_harm, helplines surfaced |
| `abuse_bypass` | Domestic violence disclosure | HIGH abuse, rule 3.4a fires, contacts bypassed |
| `false_positive_guard` | "Help me with study tips" | NOT escalated despite distress words |
| `normal_chat` | Casual bored conversation | NONE severity, friendly response |

---

## 14. Deployment Configuration

### Frontend
- **Framework:** Vite + React 18
- **Build output:** `frontend/dist/`
- **Key env variable:** `VITE_API_URL` (must point to deployed backend URL)
- **Target platform:** Vercel (not yet deployed)
- **Build command:** `npm run build`
- **Build verified:** Produces 270.92 kB JS bundle (82.36 kB gzipped) — zero errors

### Backend
- **Server:** Uvicorn + FastAPI
- **Port:** 8000
- **Target platforms:** Railway or Render (not yet deployed)
- **Required `.env` variables:**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
BLAND_AI_KEY=your-bland-ai-key
JWT_SECRET=your-strong-random-32-byte-hex-secret
JWT_EXPIRE_HOURS=72
DEV_BYPASS_AUTH=false
```

### Database
- **Platform:** Supabase
- **Required extensions:** `uuid-ossp`, `vector` (pgvector)
- **Apply migrations:**
  - Fresh setup: use `00000000000000_master_consolidated_schema.sql`
  - Existing project: apply numbered migrations in sequence

---

## 15. Local Development Setup

```powershell
# 1. Clone
git clone https://github.com/mannatnandi2007/yuvva-saarthi.git
cd yuva_saarthi

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install sentence-transformers   # Not in requirements.txt yet!
cp .env.example .env
# Edit .env with your API keys

# 3. Frontend
cd ..\frontend
npm install

# 4. Launch both (Windows - single command)
cd ..
.\start.bat      # Or .\run.bat

# 5. RAG Document Ingestion (Optional / Re-indexing)
.\ingest_rag.bat # Ingests/re-ingests all clinical PDFs in docs\rag_documents\ into Supabase
# Backend:  http://localhost:8000/docs  (Swagger UI)
# Frontend: http://localhost:5173
```

---

## 16. Security Considerations

| Area | Current State | Production Requirement |
|:---|:---|:---|
| **Row-Level Security** | Disabled on all 7 tables | Enable per-table RLS policies |
| **CORS** | `allow_origins=["*"]` | Restrict to Vercel deployment URL |
| **JWT Secret** | Default dev secret in config | Strong random 32-byte hex, set in env |
| **DEV_BYPASS_AUTH** | Must be `false` in prod | Enforce false in all non-dev environments |
| **User ID trust** | Always derived from JWT, never from request body | Already implemented correctly |
| **Session ownership** | Validated before every read/write | `validate_session_ownership()` called everywhere |
| **Abuse safeguard** | Contacts bypassed for `category==abuse` | Hardcoded enforcement, cannot be overridden by API |
| **Phone numbers** | Stored in plain text | Consider masking non-primary contact numbers |
| **Bland AI key** | Prefix-checked to prevent dev key leaks | Validate in CI pipeline before deployment |
| **RLS + service key** | Service key has full DB access | Switch to row-scoped anon key after RLS enabled |

---

*Report generated by Antigravity IDE — October 2, 2026*
