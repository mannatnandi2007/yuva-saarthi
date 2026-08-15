# YUVAA Saarthi — Tasks & Team Ownership Dashboard

This file tracks the project building progress across a 5-phase execution schedule to ensure completion by August 20th.

## Phase-by-Phase Execution & Ownership

**Timeline: August 14 - August 20 (7 Days)**

| Phase & Dates | Mannat (Lead / LLM / Escalation) | Khushal (Backend & API) | Aakansha (DB / SQL) | Yashika (NLP / UI) |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Setup & Auth**<br>*(Aug 14 - Aug 15)* | [x] Project skeleton scaffold<br>[x] Review Supabase project setup<br>[x] API structure review | [x] Supabase Auth wiring<br>[x] Phone-OTP flow APIs | [x] Postgres schema setup (`users`, `emergency_contacts`, `sessions`, `messages`) | [x] Signup UI: Multi-contact form<br>[x] Add priority order UI |
| **Phase 2: Core Chat & Risk Prep**<br>*(Aug 16)* | [ ] Chat UI ↔ FastAPI ↔ LLM loop<br>[ ] Add Hinglish mirroring prompt | [ ] API endpoints for chat send/receive<br>[ ] Session handling APIs | [ ] RAG document table schema<br>[ ] pgvector extension migration | [ ] Start high-risk keyword lists<br>[ ] Incorporate Hinglish terms |
| **Phase 3: Risk Engine & Escalation**<br>*(Aug 17 - Aug 18)* | [ ] LLM risk classification (JSON output)<br>[ ] Bland AI pathway setup | [ ] Call escalation logic & SMS fan-out<br>[ ] Short-circuit check for abuse | [ ] `risk_events` & `alert_attempts` logs<br>[ ] Add `routed_to_helpline` enum | [ ] Keyword/regex pre-filter stub<br>[ ] Policy disclosure UI |
| **Phase 4: RAG & Context**<br>*(Aug 19)* | [ ] Rolling summary generator (LLM)<br>[ ] Wire RAG context into prompt | [ ] Cross-login context APIs<br>[ ] Support retrieval APIs | [ ] Ingest WHO/NIMHANS/ICMR vectors<br>[ ] DB indexes review | [ ] Create test conversation sets<br>[ ] Abuse-routing disclosure copy |
| **Phase 5: Testing & Go-Live**<br>*(Aug 20)* | [ ] Tune false positive thresholds<br>[ ] Demo script integration | [ ] Fix backend bugs<br>[ ] Deploy backend (Railway/Render) | [ ] Fix DB schema issues<br>[ ] Schema sanity check on production | [ ] Run tests & flag errors<br>[ ] Deploy frontend (Vercel) |

---

## Key Sync Milestones
1. **End of Phase 1**: Aakansha's core tables must be ready before Khushal integrates Auth/API endpoints that query them.
2. **Start of Phase 3**: `risk_events` and `alert_attempts` logging tables must exist before the escalation logic is written.
3. **Mid Phase 3 (Highest Coordination)**: Sync on data models passed between LLM classifier, Khushal's state machine, and Mannat's Bland AI trigger. Ensure the `category == abuse` check intercepts the escalation path before anyone is dialed.
4. **End of Phase 4**: Yashika locks down the test set (English + Hinglish + abuse cases) before final testing on August 20th begins.
