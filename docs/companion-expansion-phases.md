# Yuva Saarthi — Companion Expansion Phases

> **Status:** Phase 0 (Planning) — awaiting DECISION approvals before any code is written.
> **Date:** 2026-10-27
> **Author:** Mannat (Track C — RAG pipelines & backend intelligence)

---

## Phase Map (Quick Reference)

| # | Phase | Owner(s) | Stage | Status |
|---|-------|----------|-------|--------|
| 0 | Recon & Plan | Mannat (all review) | 1 | ✅ In Progress |
| 1 | Three-Layer Prompt Stack | Mannat | 2 | ⬜ Pending |
| 2 | Safety Gate + Multi-Label Router | Mannat | 2 | ⬜ Pending |
| 3 | Database & RAG Ingestion Pipeline | Aakansha (3.1–3.6, 3.10, 3.12), Mannat (3.7–3.9) | 2–3 | ⬜ Pending |
| 4 | Adaptive User Profile + Reflector | Mannat, Aakansha, Khushal | 3 | ⬜ Pending |
| 5 | Output Drift Check + Session Health | Mannat | 3 | ⬜ Pending |
| 6 | Wellbeing Signals Pipeline | Mannat, Aakansha | 3 | ⬜ Pending |
| 7 | User Dashboard (with Yusa) | Khushal, Mannat (API), Manthan (Android) | 3–4 | ⬜ Pending |
| 8 | Evaluation & Red-Teaming | Mannat + all owners | 4 | ⬜ Pending |
| 9 | Privacy, Consent & Compliance | Aakansha, Khushal, Manthan, Aklesh | 4 | ⬜ Pending |
| 10 | Bland AI Call Scheduling | Aklesh (Mannat reviews) | 2–3 | ⬜ Pending |
| 11 | Android Dev + Dynamic API | Manthan | 2–3 | ⬜ Pending |

---

## Stage-by-Stage Execution Order

### Stage 1 — Together (Blocking)
- Phase 0 plan, contracts agreed, all DECISION items approved.
- `CODEOWNERS` file created.
- `docs/api/openapi.yaml` skeleton drafted (Mannat).
- `KnowledgeStore` interface signatures agreed (Aakansha + Mannat).
- `CrisisEvent` typed schema agreed (Mannat + Aklesh).
- Auth middleware contract agreed (Aakansha).

### Stage 2 — Parallel
| Owner | Work |
|-------|------|
| Mannat | Phases 1, 2 |
| Aakansha | DB schema + auth foundation (Phase 3.1–3.6) |
| Khushal | Dashboard & screens against mock API (Phase 7 UI) |
| Manthan | API client skeleton + Android shell against OpenAPI mock (Phase 11) |
| Aklesh | Scheduler refactor against mocked `CrisisEvent` (Phase 10) |

### Stage 3 — Parallel (depends on Stage 2)
| Owner | Work |
|-------|------|
| Mannat | Phase 3.7–3.9 retrieval, Phase 4 reflector, Phase 5 drift check, Phase 6 wellbeing logic |
| Aakansha | Phase 3 ingestion CLI, Phase 4 profile tables, Phase 6 mood/dashboard tables |
| Khushal | Wire real endpoints to dashboard and profile screens |
| Aklesh | End-to-end crisis-to-call test |
| Manthan | Real API integration, secure storage |

### Stage 4 — Together
- Phase 8 evals
- Phase 9 privacy review
- Android demo build
- Final cross-review (Mannat reviews all safety-critical PRs)

---

## Phase 0 — Recon & Plan

**Owner:** Mannat
**Deliverables:**
1. This document (`docs/companion-expansion-phases.md`)
2. `docs/companion-expansion-plan.md` (implementation plan with file changes)
3. DECISION items with recommendations

**Repo Summary (from recon):**

| Aspect | Current State |
|--------|--------------|
| **Backend Framework** | FastAPI (Python 3.10+) with Pydantic v2, `pydantic-settings` |
| **Frontend Framework** | React 18 + Vite 5, Vanilla CSS, Lucide icons |
| **Database** | Supabase PostgreSQL with `pgvector` extension enabled |
| **Auth** | Custom HS256 JWT (`dependencies.py::get_current_user`) + Supabase fallback |
| **LLM Providers** | Gemini (primary) → Groq (fallback) → Third-party optional → Local fallback |
| **RAG** | `all-MiniLM-L6-v2` embeddings (384d), folder-based + Supabase pgvector + in-memory KB |
| **Crisis Pipeline** | `pre_filter.py` (keyword tripwire) → `classifier.py` (LLM risk classification) → safety floor in `llm_service.py` → escalation in `chat_service.py` → `bland_ai.py` (voice) + `notifier.py` (SMS/Telegram/Email) |
| **Abuse Routing** | `category == abuse` → helpline only (no personal contacts) |
| **System Prompt** | Monolithic string in `llm_service.py` (lines 82–111), few-shot examples inline |
| **Embedding Model** | `all-MiniLM-L6-v2` (English-only, 384d) |
| **Android** | Capacitor 8.x configured, back-button handling, StatusBar plugin |
| **Design System** | Documented in `DESIGN_SYSTEM.md` — flat colors, thick strokes, no gradients, night mode |
| **DB Schema** | `users`, `sessions`, `messages`, `risk_events`, `alert_attempts`, `emergency_contacts`, `rag_documents` |
| **Tests** | 154 tests across 8 test files (pytest), including security, notifications, sessions, mood |
| **Yusa Mascot** | 3D Interactive Mascot (`Yusa3D.jsx`) with Three.js / React Three Fiber |

---

## Phase 1 — Three-Layer Prompt Stack

**Owner:** Mannat
**Depends on:** Phase 0 approved
**Safety-critical:** Yes (Core Anchor — Mannat review required)

### What changes
- Extract the monolithic system prompt from `llm_service.py` into a versioned `/prompts` directory
- Create three layers: Core Anchor, Domain Modules, User Adaptation
- Implement `build_prompt_stack()` function that assembles all layers per request
- Log prompt version IDs per reply

### New files
- `backend/prompts/v1/anchor.md` — Core Anchor (identity, tone, safety, priority rule)
- `backend/prompts/v1/modules/mental_health.md`
- `backend/prompts/v1/modules/academics.md`
- `backend/prompts/v1/modules/puberty_body.md`
- `backend/prompts/v1/modules/sexual_reproductive_health.md`
- `backend/prompts/v1/modules/relationships.md`
- `backend/prompts/v1/modules/career.md`
- `backend/prompts/v1/modules/general_life.md`
- `backend/prompts/v1/modules/hybrid.md`
- `backend/app/services/prompt_service.py` — assembly logic
- `backend/tests/test_prompt_stack.py`

### Modified files
- `backend/app/services/llm_service.py` — replace inline prompt with `build_prompt_stack()` call

### Acceptance criteria
- Prompt stack assembles in the order: Anchor → Domain module(s) → User profile summary → Retrieved chunks → Recent turns → Anchor reminder
- Each layer is independently versioned
- Assembly function is unit-tested with mocked layers
- Existing chat flow works identically after refactoring

---

## Phase 2 — Safety Gate + Multi-Label Orchestration Router

**Owner:** Mannat
**Depends on:** Phase 1
**Safety-critical:** Yes (Mannat review required)

### What changes
- Extract and enhance safety gate from the current scattered logic
- Add a multi-label router with confidence scores and strict JSON schema
- Define `CrisisEvent` typed schema for Phase 10 integration
- Hybrid message handling (emotional-first, then practical)
- Escalation ladder per domain

### New files
- `backend/app/services/router.py` — multi-label domain router
- `backend/app/services/safety_gate.py` — unified safety gate (wraps existing pre_filter + classifier)
- `backend/app/schemas/crisis_event.py` — `CrisisEvent` typed schema
- `backend/app/schemas/router_output.py` — `RouterOutput` schema
- `backend/tests/test_router.py`
- `backend/tests/test_safety_gate.py`

### Modified files
- `backend/app/services/llm_service.py` — integrate safety gate → router → prompt stack pipeline
- `backend/app/services/chat_service.py` — emit `CrisisEvent` on high-severity detections

### Key constraint
- Existing crisis detection and escalation behavior is NEVER weakened
- Safety gate runs FIRST, before any routing
- Router JSON is schema-validated; on malformed output, retry once then default to `general_life`

---

## Phase 3 — Database & RAG Ingestion Pipeline

**Owners:** Aakansha (3.1–3.6, 3.10, 3.12), Mannat (3.7–3.9)
**Depends on:** DECISION items approved (vector store, embedding model)
**Safety-critical:** Age-band filter and approval gate (Mannat reviews)

### New tables
- `kb_sources`, `kb_documents`, `kb_chunks`, `kb_ingestion_runs`, `kb_review_log`, `kb_retrieval_logs`

### New files
- `supabase/migrations/2026MMDD_add_knowledge_base_tables.sql`
- `backend/app/services/knowledge_store.py` — `KnowledgeStore` interface + implementation
- `backend/scripts/kb.py` — ingestion CLI
- `knowledge/` directory structure with domain subdirectories
- `knowledge/SOURCES.md`
- `backend/app/services/retrieval.py` — retrieval layer
- `docs/knowledge-base.md`
- `tests/fixtures/knowledge/` — test fixtures

### Modified files
- `backend/app/services/llm_service.py` — use new retrieval layer
- `backend/app/services/rag_service.py` — delegate to new `KnowledgeStore`
- `backend/requirements.txt` — add new embedding model dependency

---

## Phase 4 — Adaptive User Profile + Reflector

**Owners:** Mannat (reflector, diff validation), Aakansha (profile tables, CRUD), Khushal (UI)
**Depends on:** Phases 2, 3

### New tables
- `user_profiles`, `user_profile_versions`

### New files
- `supabase/migrations/2026MMDD_add_user_profile_tables.sql`
- `backend/app/services/reflector.py`
- `backend/app/services/profile_service.py`
- `backend/app/routers/profile.py`
- `frontend/src/pages/ProfileView.jsx` — "What Yusa knows about me" screen
- `backend/tests/test_reflector.py`

---

## Phase 5 — Output Drift Check + Session Health

**Owner:** Mannat
**Depends on:** Phases 1, 2
**Safety-critical:** Yes

### New files
- `backend/app/services/drift_check.py`
- `backend/app/services/session_health.py`
- `backend/tests/test_drift_check.py`
- `backend/tests/test_injection_defense.py`

---

## Phase 6 — Wellbeing Signals Pipeline

**Owners:** Mannat (signal extraction, score formula), Aakansha (tables, queries)
**Depends on:** Phases 2, 3, 4

### New tables
- `mood_entries`, `daily_wellbeing`, `coping_log`

### New files
- `supabase/migrations/2026MMDD_add_wellbeing_tables.sql`
- `backend/app/services/wellbeing_service.py`
- `docs/wellbeing-score.md`

---

## Phase 7 — User Dashboard (with Yusa)

**Owners:** Khushal (UI), Mannat (API), Manthan (Android checks)
**Depends on:** Phase 6

### New files
- `backend/app/routers/dashboard.py`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/dashboard/` — WellbeingCard, MoodChart, EmotionBreakdown, TopicDistribution, StreakTracker, CopingLog, QuickActions
- New Yusa 3D animations and mood poses (meditating, thoughtful, celebratory)

### Modified files
- `frontend/src/App.jsx` — add Dashboard route
- `frontend/src/components/Yusa3D.jsx` — add dashboard pose variants and animations

---

## Phase 8 — Evaluation & Red-Teaming

**Owner:** Mannat (harness + all owners contribute track-specific tests)
**Depends on:** Phases 1–7

### New files
- `evals/` directory with 150–200 conversation test cases
- `evals/run.py` — eval harness script
- `evals/rubric.md`

---

## Phase 9 — Privacy, Consent & Compliance

**Owners:** Aakansha (auth, encryption, isolation), Khushal (consent screens), Manthan (Android secure storage), Aklesh (call data privacy)
**Depends on:** Phases 4, 6, 7

### New/modified files
- `frontend/src/pages/ConsentExpansion.jsx`
- `backend/app/routers/data_export.py`
- `docs/architecture.md` — Mermaid diagram
- Updated `CODEOWNERS`

---

## Phase 10 — Bland AI Call Scheduling

**Owner:** Aklesh (Mannat reviews safety-critical changes)
**Depends on:** Phase 2 (`CrisisEvent` schema)

### New files
- `backend/app/services/call_scheduler.py`
- `backend/app/services/call_queue.py`
- `docs/bland-calls.md`
- `backend/tests/test_call_scheduler.py`
- `backend/tests/mocks/mock_bland_server.py`

### Modified files
- `backend/app/services/bland_ai.py` — refactored to use scheduler
- `backend/app/services/chat_service.py` — emit `CrisisEvent` instead of direct call

---

## Phase 11 — Android Dev + Dynamic API Calling

**Owner:** Manthan
**Depends on:** Phase 7 (dashboard), Phase 9 (secure storage)

### New files
- `frontend/src/api/generated-client.js` — typed API client from OpenAPI
- `frontend/src/config/features.js` — feature flag system
- `frontend/src/config/remote.js` — config-driven endpoints
- `docs/android-build.md`

### Modified files
- `frontend/capacitor.config.json` — secure storage plugin
- `frontend/package.json` — add `@capacitor/secure-storage`
- All screens — use typed client instead of raw `apiClient`

---

## DECISION Items (See Implementation Plan)

All DECISION items are listed in `docs/companion-expansion-plan.md` with recommendations. No code is written until every DECISION is approved.

---

## Hard Rules (apply to every phase)

1. **Do not weaken or bypass the existing crisis pipeline.** The safety gate runs first on every message.
2. **Extend the existing stack.** Do not swap frameworks without DECISION approval.
3. **No secrets in code.** Use env vars. Keep `.env.example` updated.
4. **Every phase ends with tests passing** and a `docs/CHANGELOG.md` entry.
5. **Never claim medical diagnosis** in code, prompts, or UI.
6. **Hinglish/code-switching** works across every new feature.
7. **Design system compliance:** solid flat colors, thick strokes, no gradients, night mode, responsive.
