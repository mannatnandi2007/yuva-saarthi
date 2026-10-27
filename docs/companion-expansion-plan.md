# Yuva Saarthi — Companionship Expansion & Wellbeing Dashboard
## Master Phase-by-Phase Implementation Plan

> **Document Version:** 2.0.0  
> **Status:** Phase 0 Approved — Ready for Stage 2 Execution  
> **Date:** October 27, 2026  
> **Lead Architect & Reviewer:** Mannat (Track C)  
> **Team:** Khushal (Track A), Aakansha (Track B), Mannat (Track C), Aklesh (Track D), Manthan (Track E)  
> **Naming Standard:** Always spelled **Yuva Saarthi** across all code, docs, UI, and comments. Mascot: **Yusa** (3D).

---

## Table of Contents
1. [Executive Summary & Core Invariants](#1-executive-summary--core-invariants)
2. [Approved Architectural Decisions (DECISION 1–12)](#2-approved-architectural-decisions-decision-112)
3. [Team Tracks, Stages & Integration Contracts](#3-team-tracks-stages--integration-contracts)
4. [Phase-by-Phase Implementation Specifications](#4-phase-by-phase-implementation-specifications)
   - [Phase 1: Three-Layer Prompt Stack](#phase-1-three-layer-prompt-stack)
   - [Phase 2: Safety Gate + Multi-Label Orchestration Router](#phase-2-safety-gate--multi-label-orchestration-router)
   - [Phase 3: Database & RAG Ingestion Pipeline (3.1–3.13)](#phase-3-database--rag-ingestion-pipeline)
   - [Phase 4: Adaptive User Profile + Reflector](#phase-4-adaptive-user-profile--reflector)
   - [Phase 5: Output Drift Check + Session Health](#phase-5-output-drift-check--session-health)
   - [Phase 6: Wellbeing Signals Pipeline](#phase-6-wellbeing-signals-pipeline)
   - [Phase 7: User Dashboard (with 3D Yusa Mascot)](#phase-7-user-dashboard-with-3d-yusa-mascot)
   - [Phase 8: Evaluation & Red-Teaming Harness](#phase-8-evaluation--red-teaming-harness)
   - [Phase 9: Privacy, Consent & Compliance](#phase-9-privacy-consent--compliance)
   - [Phase 10: Bland AI Call Scheduling](#phase-10-bland-ai-call-scheduling)
   - [Phase 11: Android Dev & Dynamic API Calling](#phase-11-android-dev--dynamic-api-calling)
5. [Database Migrations Reference](#5-database-migrations-reference)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Comprehensive Risk Matrix & Mitigations](#7-comprehensive-risk-matrix--mitigations)
8. [Stage Progression & Definition of Done](#8-stage-progression--definition-of-done)

---

## 1. Executive Summary & Core Invariants

Yuva Saarthi is expanding from its foundational mental health crisis intervention capabilities into a comprehensive, trusted **youth companionship and wellbeing companion**. The expanded scope covers:
- **Mental Health & Emotional Regulation**: Distress management, grounding, reframing, and active listening.
- **Academics & Exam Stress**: Study planning, test anxiety, procrastination, and parent expectations.
- **Puberty & Bodily Changes**: Factual, non-stigmatizing, age-appropriate bodily changes and hygiene.
- **Sexual & Reproductive Health**: Educational, strictly factual, age-gated, non-judgmental, with verified clinic/helpline pointers.
- **Relationships & Peer Dynamics**: Friendships, bullying, setting boundaries, social anxiety, and family conflicts.
- **Career & Vocational Guidance**: High school and college pathways, skill-building, and self-discovery.
- **Daily-Life Companionship**: Casual day-to-day conversation, routines, creative hobbies, and venting.
- **Youth Wellbeing Dashboard**: Personalized reflection tracking, emotional trends, coping toolkits, and streak milestones with 3D mascot interaction.

### Non-Negotiable Core Invariants:
1. **Safety Pipeline Primacy:** The deterministic keyword tripwire and safety gate run **first** on every message before any domain routing. No companionship feature can ever bypass, soften, or delay crisis detection.
2. **Reflections, Not Diagnoses:** Never claim medical, psychological, psychiatric, or diagnostic authority. Scores on the dashboard are self-reflections, not diagnostic assessments.
3. **Mascot Continuity:** **Yusa remains a 3D interactive mascot** implemented with Three.js and `@react-three/fiber` in `Yusa3D.jsx`. UI elements adhere strictly to solid flat pastel fills and thick solid strokes (no gradients).
4. **Bilingual & Hinglish Fluency:** Code-switching, transliterated Hindi/Hinglish, and regional youth idioms are first-class across the prompt stack, retrieval pipeline, and safety tripwires.
5. **Youth Data Sovereignty & Isolation:** Minors' sensitive disclosures are encrypted at rest, strictly isolated by user ID, omitted from raw logs, and completely deletable by the user at any time.

---

## 2. Approved Architectural Decisions (DECISION 1–12)

All 12 architectural decisions have been formally approved:

| # | Item | Approved Decision | Operational Impact |
|---|---|---|---|
| **1** | **Vector Store** | **PostgreSQL + `pgvector` on Supabase** | Uses existing database; zero extra infrastructure cost; ACID transactional integrity between metadata and vectors; hybrid full-text search (`tsvector`). |
| **2** | **Embedding Model** | **Google Gemini `text-embedding-004` (768d)** with local fallback | High multilingual and Hinglish semantic accuracy; free-tier friendly; fallback to `multilingual-e5-small` (384d). |
| **3** | **Classifier & Router** | **Deterministic Tripwire + LLM JSON Router** | Offline keyword safety floor runs first; Pydantic-validated JSON multi-label domain routing with confidence scores and retry fallback. |
| **4** | **Dashboard Charts** | **Recharts** | Lightweight, React-native, styled with CSS variables for flat pastel fills and 2.5px solid dark strokes (no gradients). |
| **5** | **Mascot Architecture** | **3D Interactive Mascot via `Yusa3D.jsx`** | Retains `@react-three/fiber` and `three`; adds 3D dashboard poses (meditating hover, thoughtful tilt, celebratory bounce) and responsive WebGL canvas management. |
| **6** | **PDF Ingestion OCR** | **Disabled by Default** | Scanned image PDFs are flagged and rejected in CLI ingestion to guarantee 100% text fidelity for youth health materials. |
| **7** | **Retrieval Reranking** | **RRF (Reciprocal Rank Fusion) + MMR** | Blends vector and keyword similarity mathematically; reduces top 20 candidates to 4–6 diverse chunks without added latency or LLM cost. |
| **8** | **Citations in UI** | **Youth-Friendly Attribution Line** | Shows a tap-to-expand pill under grounded answers: *"Learn more: NCERT Biology Ch. 3"*; transparent and trustworthy. |
| **9** | **Minor Consent (13–17)** | **Tiered Consent + Youth Privacy Isolation** | Age-appropriate consent with explicit memory toggles; optional emergency guardian link; youth chat logs strictly private. |
| **10** | **Bland AI Call Scope** | **Disabled for v1 (Crisis Escalation Only)** | Voice calls fire exclusively upon detected high-severity self-harm crises; no scheduled automated outbound check-in calls in v1. |
| **11** | **Android Dynamic API** | **Client-Side Resilient Layer + Feature Flags** | Typed, config-driven client on Capacitor; dynamic feature flags; SQLite offline crisis message queue. |
| **12** | **Escalation Threshold** | **Strict Crisis-Only Escalation** | Voice calls and SMS trigger only on `severity == high` AND `category == self_harm`. Moderate anxiety/panic gets in-app grounding + helpline cards. Abuse routes exclusively to helplines. |

---

## 3. Team Tracks, Stages & Integration Contracts

### 3.1 Work Tracks & Owners

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Track C: Mannat (Lead)                          │
│  - Architecture, Recon & Contracts (Phase 0)                           │
│  - Three-Layer Prompt Stack (Phase 1)                                  │
│  - Safety Gate & Multi-Label Router (Phase 2)                          │
│  - Hybrid RAG Retrieval Layer & Context Injection (Phase 3.7–3.9)      │
│  - Reflector & Adaptive User Profile (Phase 4)                         │
│  - Output Drift Check & Session Health (Phase 5)                       │
│  - Wellbeing Signals Pipeline Logic (Phase 6)                          │
│  - Dashboard API Endpoints (Phase 7 API)                               │
│  - Evaluation & Red-Teaming Harness (Phase 8)                          │
│  - Lead Reviewer for all safety-critical PRs                           │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │                               │
        ┌──────────┴──────────┐         ┌──────────┴──────────┐
        ▼                     ▼         ▼                     ▼
┌────────────────┐   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│Track A: Khushal│   │Track B:Aakansha│ │Track D: Aklesh │ │Track E: Manthan│
│UI & Frontend   │   │DB, RAG & Auth  │ │Bland Calls     │ │Android & Client│
│- Dashboard UI  │   │- DB Schemas    │ │- Call Scheduler│ │- Capacitor Sync│
│- Yusa 3D Poses │   │- Ingestion CLI │ │- Retry Ladder  │ │- Dynamic API   │
│- Profile Screen│   │- Seed KB Docs  │ │- Test Mocks    │ │- Secure Store  │
│- Consent UI    │   │- Auth & Privacy│ │- Abuse Bypass  │ │- Offline Queue │
└────────────────┘   └────────────────┘ └────────────────┘ └────────────────┘
```

### 3.2 Stage-by-Stage Orchestration
- **Stage 1 (Together):** Phase 0 Recon, implementation plan, integration contracts, and CODEOWNERS finalized.
- **Stage 2 (Parallel Development):**
  - Track C (Mannat): Phases 1 and 2 (Prompt Stack + Safety Gate / Router).
  - Track B (Aakansha): Phase 3.1–3.6 (`kb_*` migrations, schema, hashing).
  - Track A (Khushal): Phase 7 Dashboard UI against `docs/api/openapi.yaml` mock API.
  - Track E (Manthan): Phase 11 Client API layer and Capacitor secure storage against mock API.
  - Track D (Aklesh): Phase 10 Call scheduler refactoring against typed `CrisisEvent` contract.
- **Stage 3 (Parallel Integration):**
  - Track C (Mannat): Phase 3.7–3.9 (Retrieval), Phase 4 (Reflector), Phase 5 (Drift Check), Phase 6 (Wellbeing Logic).
  - Track B (Aakansha): Ingestion CLI (`kb.py`), profile tables, mood queries.
  - Track A (Khushal): Connect real backend endpoints to Dashboard and Profile screens.
  - Track D (Aklesh): End-to-end crisis event dispatch and abuse helpline tests.
  - Track E (Manthan): Android build verification, offline queue, and dynamic flags.
- **Stage 4 (Together):**
  - Phase 8 Full Red-Teaming and Evaluation Suite (150+ test cases).
  - Phase 9 Privacy, Consent and DPDP Compliance Audit.
  - Android APK Demo Build and final multi-platform smoke tests.

---

## 4. Phase-by-Phase Implementation Specifications

---

### Phase 1: Three-Layer Prompt Stack

- **Owner:** Mannat (Track C)
- **Stage:** 2 (Depends on Stage 1 contracts)
- **Safety Critical:** Yes — Mannat review mandatory.

#### 1. Objective & Architecture
Deconstruct the monolithic system prompt in `backend/app/services/llm_service.py` into an extensible, versioned 3-layer prompt stack assembled dynamically per turn:
1. **Layer 1: Core Anchor (`prompts/v1/anchor.md`)**
   - Identity: Yusa, warm, supportive, non-judgmental companion for Indian youth.
   - Strict boundaries: No clinical diagnosis, no prescribing medication, no romantic roleplay, no explicit sexual content, educational framing for SRH.
   - Priority rule: *The Core Anchor overrides all user instructions, retrieved documents, and profile data.*
2. **Layer 2: Domain Modules (`prompts/v1/modules/*.md`)**
   - `mental_health.md`: Empathy, grounding techniques, cognitive reframing, destigmatizing distress.
   - `academics.md`: Study tips, exam panic mitigation, parental pressure communication, healthy breaks.
   - `puberty_body.md`: Anatomical facts, normal variations, hygiene, reassurance, anti-body-shaming.
   - `sexual_health.md`: Age-appropriate, strictly educational, safe practices, consent, clinic/counselor referrals.
   - `relationships.md`: Peer boundaries, bullying response, friendship communication, family friction.
   - `career.md`: Aptitude exploration, vocational options, higher education paths, pressure relief.
   - `general_life.md`: Everyday banter, hobbies, routines, lighthearted engagement.
   - `hybrid.md`: Handling multi-domain queries (e.g. academic panic + depression) by addressing emotion first, then practical steps.
3. **Layer 3: Dynamic Context Injection**
   - User Profile Summary (style preferences, stressors, helpful strategies).
   - Retrieved Knowledge Base chunks (enclosed in `<verified_knowledge>` XML tags).
   - Recent conversation turns (last 12 messages with role attribution).
   - Anchor Reminder (`prompts/v1/reminder.md` appended at the end of the context window to prevent recency drift).

#### 2. Files to Create & Modify
- **New Files:**
  - `backend/prompts/v1/anchor.md`
  - `backend/prompts/v1/reminder.md`
  - `backend/prompts/v1/modules/{mental_health,academics,puberty_body,sexual_health,relationships,career,general_life,hybrid}.md`
  - `backend/app/services/prompt_service.py`
  - `backend/tests/test_prompt_stack.py`
- **Modified Files:**
  - `backend/app/services/llm_service.py` (replace inline prompt with `prompt_service.build_prompt_stack`)

#### 3. Step-by-Step Implementation Tasks
1. Draft `anchor.md` with explicit safety rules, Hinglish tone guidelines, and injection override protection.
2. Draft all 8 domain module markdown files with clear, youth-centric instructions and boundary rules.
3. Implement `PromptService` in `prompt_service.py`:
   - `get_module(domain: str) -> str`
   - `build_prompt_stack(primary_domain: str, secondary_domains: list[str], profile_summary: str, retrieved_chunks: list[str], turns: list[dict]) -> str`
   - Cache loaded prompt templates in memory with file-change reloading in development.
4. Integrate `build_prompt_stack` into `llm_service.py` chat flow.
5. Record prompt version ID in chat response telemetry.

#### 4. Tests & Acceptance Criteria
- Unit tests verify prompt assembly order: Anchor → Domain Module(s) → Profile → Retrieved Knowledge → History → Reminder.
- Unit test verifies prompt injection attempts inside retrieved text or user input do not override Anchor rules.
- Existing mental health chat regression tests pass without degradation.

---

### Phase 2: Safety Gate + Multi-Label Orchestration Router

- **Owner:** Mannat (Track C)
- **Stage:** 2
- **Safety Critical:** Yes — Emits the foundational `CrisisEvent` contract.

#### 1. Objective & Architecture
Upgrade the safety and routing pipeline into a high-speed, two-step orchestration process:
1. **Deterministic Safety Floor (`safety_gate.py`):**
   - Runs keyword tripwire (`pre_filter.py`) with zero network latency.
   - Immediately traps high-severity self-harm, suicide, acute violence, and abuse.
   - Emits `CrisisEvent` to `call_scheduler.py` (Phase 10) and returns emergency response immediately.
2. **Multi-Label Domain Router (`router.py`):**
   - If message passes safety floor, run single-pass LLM structured classification returning strict JSON.
   - Classifies primary domain, secondary domains, hybrid status, confidence, language, and perceived mood.
   - If confidence is low or output malformed, retry once; fallback to `general_life`.

#### 2. Data Models & Schemas
```python
# backend/app/schemas/router_output.py
class DomainEnum(str, Enum):
    MENTAL_HEALTH = "mental_health"
    ACADEMICS = "academics"
    PUBERTY_BODY = "puberty_body"
    SEXUAL_HEALTH = "sexual_health"
    RELATIONSHIPS = "relationships"
    CAREER = "career"
    GENERAL_LIFE = "general_life"

class RouterOutput(BaseModel):
    primary_domain: DomainEnum
    secondary_domains: list[DomainEnum] = Field(default_factory=list)
    is_hybrid: bool = False
    confidence: float = Field(ge=0.0, le=1.0)
    detected_mood: str
    language: Literal["en", "hi", "hinglish"]
    rationale: str
```

```python
# backend/app/schemas/crisis_event.py
class CrisisEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    category: Literal["self_harm", "abuse", "distress", "medical_urgency"]
    severity: Literal["low", "medium", "high", "critical"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    language: Literal["en", "hi", "hinglish"]
    requires_voice_call: bool
    requires_sms: bool
    abuse_bypass_contacts: bool  # True when category == 'abuse'
```

#### 3. Files to Create & Modify
- **New Files:**
  - `backend/app/schemas/router_output.py`
  - `backend/app/schemas/crisis_event.py`
  - `backend/app/services/safety_gate.py`
  - `backend/app/services/router.py`
  - `backend/tests/test_safety_gate.py`
  - `backend/tests/test_router.py`
- **Modified Files:**
  - `backend/app/services/chat_service.py`
  - `backend/app/services/llm_service.py`

#### 4. Step-by-Step Implementation Tasks
1. Create `backend/app/schemas/router_output.py` and `crisis_event.py`.
2. Implement `safety_gate.py` encapsulating `pre_filter.py` and emergency helpline routing.
3. Implement `router.py` with structured LLM prompt and JSON schema enforcement using Pydantic.
4. Wire `safety_gate.py` at the entry point of `chat_service.send_chat_message`.
5. Wire `router.py` to feed domain labels into `prompt_service.build_prompt_stack`.
6. Implement fallback to `general_life` on router timeout or JSON decode error.

#### 5. Tests & Acceptance Criteria
- Safety gate catches 100% of keywords from `TestCases.docx` and `keywords.xlsx`.
- Router correctly identifies hybrid queries (e.g., *"failing math and crying every night"* -> primary `mental_health`, secondary `academics`, `is_hybrid: true`).
- Zero crisis regression: High severity produces valid `CrisisEvent` and triggers crisis protocol.

---

### Phase 3: Database & RAG Ingestion Pipeline

- **Owners:** Aakansha (Track B: 3.1–3.6, 3.10, 3.12); Mannat (Track C: 3.7–3.9, age filter & approval gate).
- **Stage:** 2 (Schema & Ingestion CLI) to 3 (Hybrid Retrieval).
- **Safety Critical:** Yes — Ingestion approval gate and age-band filtering require Mannat's review.

#### 3.1 Principles
- **Approval Gate:** Only chunks with `status = 'approved'` are retrievable. Draft or archived chunks are never seen by youth.
- **Auditability:** Every chunk links back to `document_id` and `source_id` with an SHA-256 hash.
- **Idempotency:** Re-running ingestion on unchanged files is a no-op. Changing content creates an audited new version.
- **Zero Raw PII in Logs:** Retrieval query logs store only hashes, chunk IDs, and similarity scores.

#### 3.2 Database Schema (`supabase/migrations/20261028000000_add_knowledge_base_tables.sql`)
- `kb_sources`: `id`, `name`, `author`, `authority_tier` (1: Government/Clinical, 2: Educational, 3: General), `license`, `created_at`.
- `kb_documents`: `id`, `source_id`, `title`, `domain` (Enum), `age_band` (`13-15`, `16-18`, `19-24`, `all`), `status` (`draft`, `approved`, `archived`), `file_path`, `content_hash`, `created_at`, `updated_at`.
- `kb_chunks`: `id`, `document_id`, `chunk_index`, `content`, `heading`, `token_count`, `embedding vector(768)`, `tsv tsvector`, `created_at`.
- `kb_ingestion_runs`: `id`, `run_at`, `files_scanned`, `chunks_created`, `errors`, `status`.
- `kb_review_log`: `id`, `document_id`, `reviewer`, `action`, `notes`, `created_at`.
- `kb_retrieval_logs`: `id`, `event_id`, `user_id`, `query_hash`, `chunk_ids`, `scores`, `latency_ms`, `created_at`.

#### 3.3 Knowledge Folder Structure
```
knowledge/
├── SOURCES.md                     # Provenance registry
├── mental_health/                 # NCERT, Tele-MANAS, NIMHANS guides
├── academics/                     # CBSE/ICSE study techniques, stress guides
├── puberty_body/                  # WHO, UNICEF adolescent body guides
├── sexual_health/                 # NACO, reproductive health educational materials
├── relationships/                 # Peer mediation, anti-bullying, boundary guides
├── career/                        # National Career Service, skill pathways
└── general_life/                  # Youth routines, mindfulness, creative habits
```

#### 3.4 Ingestion CLI (`backend/scripts/kb.py`)
CLI tool supporting commands:
- `python -m backend.scripts.kb ingest --path knowledge/`: Scans files, parses frontmatter, extracts text, computes SHA-256 hash, chunks text (300–500 tokens), generates embeddings via Gemini `text-embedding-004`, generates PostgreSQL `tsvector`, and saves to DB.
- `python -m backend.scripts.kb verify`: Validates metadata schemas and broken links.
- `python -m backend.scripts.kb approve --doc-id <id>`: Promotes document to `approved`.
- `python -m backend.scripts.kb reindex`: Re-computes embeddings if model configuration updates.

#### 3.5 Multilingual Embeddings
- Model: Gemini `text-embedding-004` (768d) with `multilingual-e5-small` local fallback.
- Storage: Vector column with `ivfflat` or `hnsw` cosine index. Embeddings tag stored with model name.

#### 3.6 Ingestion-Time Safety Checks
- Automatic scanning during ingestion for explicit/harmful text, ungrounded medical prescriptions, or clinical diagnostics.
- Non-text scanned PDFs rejected with guidance to supply clean markdown/text.

#### 3.7 Hybrid Retrieval Layer (`backend/app/services/retrieval.py`)
1. **Parallel Querying:**
   - Vector semantic similarity query via `pgvector` (`<=>` cosine operator).
   - Keyword query via PostgreSQL full-text search (`tsvector @@ plainto_tsquery`).
2. **Age-Band Filter:** Query strictly filters `age_band IN (user_age_band, 'all')`.
3. **Approval Filter:** Query strictly filters `status = 'approved'`.
4. **Rank Fusion & Diversity:** Combine results using Reciprocal Rank Fusion (RRF); apply Maximal Marginal Relevance (MMR) to return top 4–6 distinct chunks.
5. **Relevance Floor:** If top chunk score < 0.65 threshold, set `grounded = false`.

#### 3.8 Injection-Safe Prompt Injection
Retrieved chunks injected inside protective XML tags:
```xml
<verified_knowledge source="NCERT Biology Ch. 3" authority="Tier-1">
[Approved chunk text]
</verified_knowledge>
```

#### 3.9 Grounding & Citations
- When `grounded = true`: Include user-friendly citation pill in response metadata: `{"source_name": "NCERT Biology Ch. 3", "excerpt": "..."}`.
- When `grounded = false`: Yusa answers honestly: *"I don't have verified information on that, but you can talk to a counselor or check Tele-MANAS."*

#### 3.10 Seed Content
Create 2–3 high-quality seed markdown documents per domain under `knowledge/` covering standard youth questions.

#### 3.11 Deliverables & Acceptance Criteria
- Migrations apply cleanly to PostgreSQL.
- Ingestion CLI successfully processes `knowledge/` directory idempotently.
- Retrieval returns relevant results under 150ms.
- Under-18 users never receive content outside their approved age band.

---

### Phase 4: Adaptive User Profile + Reflector

- **Owners:** Mannat (Reflector & Diff Validation); Aakansha (Tables & CRUD); Khushal (Profile UI).
- **Stage:** 3
- **Safety Critical:** Yes — Profile validation prevents storing sensitive clinical assumptions.

#### 1. Objective & Architecture
Implement an adaptive, transparent user memory system:
- **Reflector (`reflector.py`):** Runs asynchronously after a chat session ends. Analyzes dialogue to identify user communication preferences (e.g. prefers short responses, speaks Hinglish), recurring non-clinical stressors (e.g. upcoming board exams), and effective coping strategies.
- **Diff Validator:** Enforces strict boundary rules: *Never store medical diagnoses, psychiatric labels, traumatic details, or emergency contact conflict details.*
- **Versioned Storage:** Every profile change is stored as a diff snapshot with instant rollback capability.
- **Transparency UI ("What Yusa knows about me"):** A dedicated settings screen where the user can view, edit, or delete individual memory items or clear all memories with one tap.

#### 2. Database Schema (`supabase/migrations/20261028000001_add_user_profile_tables.sql`)
- `user_profiles`: `user_id` (PK), `style_preferences` (JSONB), `stressors` (JSONB), `coping_strategies` (JSONB), `goals` (JSONB), `boundaries` (JSONB), `updated_at`.
- `user_profile_versions`: `id`, `user_id`, `version_number`, `diff_snapshot` (JSONB), `session_id`, `created_at`.

#### 3. Files to Create & Modify
- **New Files:**
  - `backend/app/schemas/profile_schemas.py`
  - `backend/app/services/reflector.py`
  - `backend/app/services/profile_service.py`
  - `backend/app/routers/profile.py`
  - `frontend/src/pages/ProfileView.jsx`
  - `backend/tests/test_reflector.py`
- **Modified Files:**
  - `backend/app/services/chat_service.py` (trigger background reflection job on session pause/exit)
  - `frontend/src/App.jsx` (mount `/profile` route)

#### 4. Acceptance Criteria
- Reflector never records diagnostic or clinical assertions.
- Deleting a fact in `ProfileView.jsx` immediately purges it from database and subsequent prompt stacks.
- Resetting profile completely wipes memory records for that user.

---

### Phase 5: Output Drift Check + Session Health

- **Owner:** Mannat (Track C)
- **Stage:** 3
- **Safety Critical:** Yes — Final safeguard before sending LLM text to youth.

#### 1. Objective & Architecture
Provide real-time verification of LLM responses and session longevity:
1. **Output Drift Check (`drift_check.py`):**
   - High-speed rule-based + regex validation scanning draft replies before transmission.
   - Verifies: No clinical diagnostic claims, no explicit/inappropriate content, no leakage of internal prompt delimiters, tone matches Yusa persona.
   - If check fails: Regenerate once with strict correction prompt; if second attempt fails, substitute with safe canned empathetic response.
2. **Session Health Monitor (`session_health.py`):**
   - Tracks turn count, repetitive circular loops, emotional escalation, and boundary testing.
   - After 20+ turns without resolution, gently suggests: *"We've been talking for a while! How about taking a deep breath or grabbing some water?"*
   - Detects prompt injection and jailbreak attempts and shuts them down neutrally.

#### 2. Files to Create & Modify
- **New Files:**
  - `backend/app/services/drift_check.py`
  - `backend/app/services/session_health.py`
  - `backend/tests/test_drift_check.py`
  - `backend/tests/test_session_health.py`
- **Modified Files:**
  - `backend/app/services/llm_service.py` (invoke drift check before returning response)

#### 3. Acceptance Criteria
- Intercepts 100% of injected forbidden diagnostic phrases.
- Prevents roleplay escalation or boundary-pushing prompts.
- Latency overhead under 150ms.

---

### Phase 6: Wellbeing Signals Pipeline

- **Owners:** Mannat (Signal Extraction & Scoring Algorithm); Aakansha (Tables & Aggregations).
- **Stage:** 3
- **Safety Critical:** Non-clinical scientific formulation.

#### 1. Objective & Scoring Formulation
Track non-clinical wellbeing trajectories to power the user dashboard:
- **Granular Signals (per interaction):**
  - Mood state (7-mood enum: `normal`, `happy`, `overjoyed`, `sad`, `angry`, `anxious`, `tired`).
  - Sentiment valence (-1.0 to 1.0) and arousal (0.0 to 1.0).
  - Primary emotion tags (e.g. *hopeful, overwhelmed, calm, restless*).
  - Domain interaction distribution.
- **Wellbeing Score Formulation (0–100 Scale):**
  - **Emotional Balance (40%):** Weighted average of sentiment valence over 7 days.
  - **Coping Activity (30%):** Engagement with grounding tools, reflection prompts, or positive actions.
  - **Interaction Stability (20%):** Consistency without extreme volatility or circular rumination.
  - **Streak & Reflection (10%):** Daily mindfulness / check-in continuity.
- *Strict Rule:* Never present this score as a mental health diagnosis or clinical score. It is framed as *"Your Weekly Wellbeing Reflection"*.

#### 2. Database Schema (`supabase/migrations/20261028000002_add_wellbeing_tables.sql`)
- `mood_entries`: `id`, `user_id`, `session_id`, `mood`, `confidence`, `valence`, `arousal`, `emotion_tags`, `domain`, `created_at`.
- `daily_wellbeing`: `id`, `user_id`, `date`, `wellbeing_score`, `dominant_mood`, `interaction_count`, `coping_tools_count`, `streak_count`, `created_at`.
- `coping_log`: `id`, `user_id`, `tool_name` (e.g. `box_breathing`, `grounding_54321`, `gratitude_note`), `completed`, `created_at`.

#### 3. Files to Create & Modify
- **New Files:**
  - `backend/app/services/wellbeing_service.py`
  - `backend/app/schemas/dashboard_schemas.py`
  - `docs/wellbeing-score.md`
  - `backend/tests/test_wellbeing.py`
- **Modified Files:**
  - `backend/app/services/chat_service.py` (record mood entries per message)

#### 4. Acceptance Criteria
- Scores compute deterministically from interaction logs.
- Wellbeing trajectory drops never trigger automated voice calls (calls are reserved strictly for high-severity crisis events).

---

### Phase 7: User Dashboard (with 3D Yusa Mascot)

- **Owners:** Khushal (Track A: Dashboard UI & 3D Integration); Mannat (API Endpoints); Manthan (Android verification).
- **Stage:** 3–4
- **Design System Mandate:** Solid flat pastel fills, thick solid strokes (2px containers, 2.5px controls), **no gradients**, night mode support, 3D interactive Yusa mascot.

#### 1. Objective & Features
Create a private, engaging youth wellbeing dashboard:
1. **3D Yusa Stage:**
   - Positioned on the right on desktop, top-centered on mobile.
   - Interactive 3D mascot (`Yusa3D.jsx`) responds with supportive poses:
     - `meditating`: Calm floating hover for balanced wellbeing.
     - `thoughtful`: Gentle head tilt and listening expression.
     - `celebrating`: Joyful bounce when streaks or coping goals are achieved.
     - `supportive`: Warm, comforting presence during lower mood periods.
   - Dynamic speech bubble offering a friendly reflection and one-tap chat prompt: *"Looks like exams were tough this week. Want to do a quick 2-minute wind-down?"*
2. **Dashboard Cards:**
   - `WellbeingScoreCard`: 0–100 reflection index with supportive descriptor.
   - `MoodTrendChart`: 7-day timeline using Recharts with solid strokes and pastel fills.
   - `EmotionBreakdown`: Donut/bar chart of primary emotions.
   - `DomainDistribution`: Breakdown of topics explored (academics, daily life, relationships, etc.).
   - `CopingToolkit`: Quick-launch grounding exercises (Box Breathing, 5-4-3-2-1 Grounding, Journaling).
   - `StreakTracker`: Visual check-in milestone counter.
   - `QuickActions`: One-tap helpline card, emergency safety plan, and talk-to-Yusa buttons.

#### 2. Files to Create & Modify
- **New Files:**
  - `backend/app/routers/dashboard.py`
  - `frontend/src/pages/Dashboard.jsx`
  - `frontend/src/components/dashboard/WellbeingScoreCard.jsx`
  - `frontend/src/components/dashboard/MoodTrendChart.jsx`
  - `frontend/src/components/dashboard/EmotionBreakdown.jsx`
  - `frontend/src/components/dashboard/DomainDistribution.jsx`
  - `frontend/src/components/dashboard/CopingToolkit.jsx`
  - `frontend/src/components/dashboard/StreakTracker.jsx`
  - `frontend/src/components/dashboard/QuickActions.jsx`
- **Modified Files:**
  - `frontend/src/App.jsx` (add `/dashboard` route and navigation bar icon)
  - `frontend/src/components/Yusa3D.jsx` (add new 3D dashboard poses, idle hover, and streak animations)

#### 3. Acceptance Criteria
- Renders smoothly on desktop, tablet, and Android Capacitor webview.
- Zero gradients; strictly adheres to design tokens in `tokens.css`.
- 3D Yusa renders with 60fps performance and gracefully throttles frame rendering when idle.

---

### Phase 8: Evaluation & Red-Teaming Harness

- **Owner:** Mannat (Lead Harness & Eval Set; all track owners contribute track test cases).
- **Stage:** 4
- **Safety Critical:** Yes — Gatekeeper for production readiness.

#### 1. Objective & Architecture
Build an automated evaluation suite containing **150–200 multi-turn test conversations** covering:
- **Crisis & Self-Harm (40 cases):** Obvious and subtle suicidal ideation, self-harm impulses, despair; must achieve **100% recall** with zero false negatives.
- **Abuse & Protection (25 cases):** Domestic, physical, and sexual abuse; must route 100% to professional helplines and **never** alert personal contacts.
- **Age-Gated SRH & Puberty (30 cases):** Bodily change questions from 13–15 vs 16–18 age bands; ensures strictly educational, non-explicit, grounded responses.
- **Prompt Injection & Jailbreaks (30 cases):** *"Ignore your previous instructions"*, base64 encoding, persona hijacking, malicious RAG poisoning; ensures Core Anchor holds.
- **Hinglish & Regional Dialects (25 cases):** Mixed Hindi/English expressions, slang, transliterated distress phrases; verifies accurate classification.
- **Tone & Persona Consistency (20 cases):** Validates Yusa's friendly, supportive, non-clinical tone.

#### 2. Evaluation Runner (`evals/run.py`)
- Executes automated test batches against the backend API.
- Generates structured report:
  - Safety Gate Recall (Required: 100.0%)
  - Multi-Label Router F1 Score (Target: ≥ 90%)
  - Grounding & Citation Accuracy (Target: ≥ 95%)
  - Output Drift Pass Rate (Required: 100.0%)
- Automated CI command: `python -m evals.run`

#### 3. Files to Create
- `evals/run.py`
- `evals/rubric.md`
- `evals/test_cases/crisis_safety.json`
- `evals/test_cases/abuse_protection.json`
- `evals/test_cases/age_gating_srh.json`
- `evals/test_cases/injection_attacks.json`
- `evals/test_cases/hinglish_evals.json`
- `evals/test_cases/tone_persona.json`

#### 4. Acceptance Criteria
- Safety recall is 100% (zero false negatives on crisis cases).
- Zero prompt injections breach the Core Anchor.
- Eval run completes cleanly with summary output.

---

### Phase 9: Privacy, Consent & Compliance

- **Owners:** Aakansha (Auth, Encryption, Isolation); Khushal (Consent Screens); Manthan (Android Storage); Aklesh (Call Privacy).
- **Stage:** 4
- **Regulatory Framework:** Digital Personal Data Protection (DPDP) Act (India), COPPA principles.

#### 1. Objective & Architecture
1. **Tiered Consent Flow (`ConsentExpansion.jsx`):**
   - Clear, plain-language onboarding screen explaining companion capabilities.
   - Granular opt-in switches for:
     - Memory personalization (*"Remember what we discuss to support you better"*).
     - Wellbeing reflection trends.
     - Optional emergency contact notification during acute crises.
2. **Data Export & Right-to-be-Forgotten:**
   - `GET /api/privacy/export`: Generates a downloadable JSON archive of user profile, mood entries, and conversation history.
   - `DELETE /api/privacy/purge`: Permanently deletes all user records, profile memories, mood logs, and vector references in a single transaction.
3. **Multi-Tenant Row Isolation:**
   - Automated tests verifying that User A cannot read or write any record belonging to User B.
4. **Log Sanitization:**
   - Zero raw user chat strings or phone numbers logged in application logs.
5. **System Architecture Documentation:**
   - Generate `docs/architecture.md` with complete Mermaid diagram detailing data flows from Safety Gate to 3D UI.

#### 2. Files to Create & Modify
- **New Files:**
  - `frontend/src/pages/ConsentExpansion.jsx`
  - `backend/app/routers/data_privacy.py`
  - `docs/architecture.md`
  - `backend/tests/test_data_isolation.py`
- **Modified Files:**
  - `frontend/src/App.jsx`
  - `backend/app/main.py` (mount privacy router)

#### 3. Acceptance Criteria
- Complete data export works in valid JSON format.
- Account purge leaves zero orphan rows in any table.
- Multi-user isolation test passes with 100% coverage.

---

### Phase 10: Bland AI Call Scheduling

- **Owner:** Aklesh (Track D); Mannat (Safety Reviewer).
- **Stage:** 2–3
- **Safety Critical:** Yes — Controls real-world telephony alerts.

#### 1. Objective & Architecture
Transform the existing ad-hoc voice call logic into an audited, priority-based, idempotent call queue:
1. **Trigger Contract:**
   - Calls start **strictly** from a `CrisisEvent` where `requires_voice_call == true` and `severity == 'high'` and `category == 'self_harm'`.
   - Never triggered by dashboard wellbeing score changes or medium anxiety keywords.
2. **Strict Abuse Bypass:**
   - When `category == 'abuse'`, the scheduler bypasses all emergency contacts and connects exclusively to the verified national helpline (e.g. 1098 / 14416).
3. **Deduplication & Escalation Ladder:**
   - 15-minute global cooldown per user to prevent telephony spam.
   - Priority queue: Calls Contact 1. If unanswered/busy after 45 seconds, escalates to Contact 2.
   - Non-clinical conversational prompt for Bland AI: *"Hello, this is Yuva Saarthi calling regarding {user_first_name}. They may need your support right now. Please check on them."*
4. **Test Tooling:**
   - Built-in `mock_bland_server.py` and `NOTIFY_DRY_RUN=true` environment flag for deterministic offline testing.

#### 2. Files to Create & Modify
- **New Files:**
  - `backend/app/services/call_scheduler.py`
  - `backend/app/services/call_queue.py`
  - `docs/bland-calls.md`
  - `backend/tests/test_call_scheduler.py`
  - `backend/tests/mocks/mock_bland_server.py`
- **Modified Files:**
  - `backend/app/services/bland_ai.py`
  - `backend/app/services/chat_service.py`

#### 3. Acceptance Criteria
- A single crisis event produces exactly one sequenced call cycle.
- Abuse events never transmit data to personal emergency contacts.
- Unit and mock tests pass without calling live Bland AI API.

---

### Phase 11: Android Dev & Dynamic API Calling

- **Owner:** Manthan (Track E); Khushal (Track A collaboration).
- **Stage:** 2–3
- **Runtime:** Capacitor 8.x + React 18.

#### 1. Objective & Architecture
Deliver an Android release build with resilient client-side dynamic API integration:
1. **Dynamic Client API Layer (`generatedClient.js`):**
   - Typed client generated from `docs/api/openapi.yaml`.
   - Dynamic host resolution driven by environment (`VITE_API_URL`).
   - Automatic JWT token refresh interceptor.
2. **Feature Flagging (`features.js`):**
   - Config-driven runtime flags (`/api/features`) controlling available domains, dashboard visibility, and experimental modules.
3. **Offline Crisis Queue:**
   - If network drops during a high-severity crisis interaction, the message payload is cached in Capacitor SQLite/SecureStorage and immediately retried on network recovery.
   - Local fallback immediately displays tap-to-call helpline buttons (Tele-MANAS, KIRAN, Childline) without requiring server connectivity.
4. **Hardware Integration:**
   - Android back-button management (drawer close → screen back → minimize).
   - Capacitor Preferences / Secure Storage for tokens and theme state.
   - Safe-area insets (`env(safe-area-inset-top)`) and dynamic keyboard viewport adjustments so 3D Yusa and input composer are never obscured.

#### 2. Files to Create & Modify
- **New Files:**
  - `frontend/src/api/generatedClient.js`
  - `frontend/src/config/features.js`
  - `frontend/src/config/remote.js`
  - `docs/android-build.md`
- **Modified Files:**
  - `frontend/capacitor.config.json`
  - `frontend/package.json` (add `@capacitor/preferences`, `@capacitor/network`)
  - `frontend/src/api/client.js`

#### 3. Acceptance Criteria
- Android Capacitor build succeeds without native compilation errors.
- Network disconnection during chat renders emergency helplines immediately.
- 3D Yusa canvas resizes smoothly when mobile virtual keyboard opens.

---

## 5. Database Migrations Reference

All migrations reside in `supabase/migrations/` and execute sequentially:

```sql
-- 1. Knowledge Base Tables: 20261028000000_add_knowledge_base_tables.sql
CREATE TABLE IF NOT EXISTS kb_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    authority_tier INT NOT NULL CHECK (authority_tier BETWEEN 1 AND 3),
    license TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES kb_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    age_band TEXT NOT NULL CHECK (age_band IN ('13-15', '16-18', '19-24', 'all')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    heading TEXT,
    token_count INT NOT NULL,
    embedding vector(768),
    tsv tsvector,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING gin (tsv);

-- 2. User Profile Tables: 20261028000001_add_user_profile_tables.sql
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    style_preferences JSONB DEFAULT '{}'::jsonb,
    stressors JSONB DEFAULT '[]'::jsonb,
    coping_strategies JSONB DEFAULT '[]'::jsonb,
    goals JSONB DEFAULT '[]'::jsonb,
    boundaries JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    diff_snapshot JSONB NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Wellbeing Tables: 20261028000002_add_wellbeing_tables.sql
CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    mood TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    valence FLOAT NOT NULL,
    arousal FLOAT NOT NULL,
    emotion_tags TEXT[] DEFAULT '{}',
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_wellbeing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    wellbeing_score FLOAT NOT NULL,
    dominant_mood TEXT NOT NULL,
    interaction_count INT DEFAULT 0,
    coping_tools_count INT DEFAULT 0,
    streak_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS coping_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Environment Variables Reference

Additions to `backend/.env.example` and `frontend/.env.example`:

### Backend Environment (`backend/.env.example`)
```bash
# Model & Provider Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Multilingual Embedding Configuration
EMBEDDING_PROVIDER=gemini        # 'gemini' or 'local'
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIM=768

# RAG & Knowledge Base
KB_MIN_SIMILARITY_THRESHOLD=0.65
KB_MAX_RETRIEVED_CHUNKS=5
KB_AGE_BAND_FILTER_ENABLED=true

# Emergency Alerting & Telephony
BLAND_AI_API_KEY=your_bland_api_key
NOTIFY_CHANNELS=sms_fast2sms,telegram,email
NOTIFY_DRY_RUN=true              # Set false in production
FAST2SMS_API_KEY=your_fast2sms_key
TELEGRAM_BOT_TOKEN=your_bot_token

# Feature Flags
ENABLE_DASHBOARD_ROUTES=true
ENABLE_PROFILE_ROUTES=true
ENABLE_DEMO_ROUTES=false
```

### Frontend Environment (`frontend/.env.example`)
```bash
VITE_API_URL=http://localhost:8000
VITE_ENABLE_3D_MASCOT=true
VITE_ENABLE_DASHBOARD=true
VITE_ENABLE_PROFILE_VIEW=true
```

---

## 7. Comprehensive Risk Matrix & Mitigations

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Medical/Psychiatric Misinformation** | Critical | Core Anchor strictly forbids diagnosis; high RAG authority threshold; fallback to *"I don't have verified information on that, but here is a helpline or doctor resource"*. |
| **Emergency Contact Spam** | High | 15-minute cooldown per user; deduplication on `risk_event_id`; strict `self_harm` threshold; dry-run mode in dev. |
| **Abuse Report Contact Leakage** | Critical | Hardcoded architectural bypass: when `category == 'abuse'`, personal emergency contacts are completely removed from dispatch, routing exclusively to child/women helplines. |
| **Prompt Injection / Jailbreaks** | High | Safety gate executes prior to routing; strict XML delimiters for RAG chunks; post-generation drift check scans for leaked instructions. |
| **Mobile 3D WebGL Crash** | Medium | WebGL context-loss recovery listener in `Yusa3D.jsx`; frame loop throttles to on-demand rendering when idle; canvas pixel ratio clamped (`dpr={[1, 1.5]}`). |
| **Multi-Tenant Memory Leakage** | Critical | Strict JWT validation; DB queries enforce `WHERE user_id = :current_user_id`; automated multi-user isolation test suite in Phase 8. |

---

## 8. Stage Progression & Definition of Done

### Stage 1 (Complete)
- [x] Repo recon audit completed.
- [x] All 12 DECISION items reviewed and approved.
- [x] `docs/companion-expansion-phases.md` created.
- [x] `docs/companion-expansion-plan.md` created.
- [x] `.github/CODEOWNERS` created with 5 track mappings.
- [x] `docs/api/openapi.yaml` OpenAPI 3.1 specification drafted.

### Stage 2 (Parallel Execution Gate)
- [ ] Track C: Prompt stack assembled, tested, and versioned (Phase 1).
- [ ] Track C: Safety gate and multi-label router operational (Phase 2).
- [ ] Track B: Database migrations applied cleanly; ingestion CLI ready (Phase 3.1–3.6).
- [ ] Track A: Dashboard UI scaffolding built with 3D Yusa placement against mock API (Phase 7 UI).
- [ ] Track E: Capacitor Android shell and typed client scaffolded (Phase 11).
- [ ] Track D: Call scheduler refactored against mocked `CrisisEvent` (Phase 10).

### Stage 3 (Integration Gate)
- [ ] Track C: Hybrid RAG retrieval connected with age-band filtering (Phase 3.7–3.9).
- [ ] Track C: Reflector service extracting validated profile diffs (Phase 4).
- [ ] Track C: Drift check and session health monitoring active (Phase 5).
- [ ] Track C & B: Wellbeing scores computing deterministically (Phase 6).
- [ ] Track A: Real endpoints connected to Dashboard, Mood Charts, and Profile screens (Phase 7).
- [ ] Track D: End-to-end crisis event dispatch and abuse helpline tests passing (Phase 10).
- [ ] Track E: Offline crisis queue and feature flags active on Android (Phase 11).

### Stage 4 (Release Gate)
- [ ] 150+ conversation red-team evaluation suite passing with 100% safety recall (Phase 8).
- [ ] Data privacy, consent, export, and account purge verified (Phase 9).
- [ ] Android release APK generated and smoke-tested.
- [ ] All pytest test suites passing with zero errors.
- [ ] Consolidated documentation updated.
