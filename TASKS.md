# YUVAA Saarthi — Tasks & Team Ownership Dashboard

This file tracks the project building progress across the 8-day build schedule. Developers can update checkboxes as modules are completed.

## Day-by-Day Table & Ownership

| Day | Mannat (40% - Lead / LLM / Escalation Review) | Khushal (22% - Backend & DSA) | Aakansha (18% - DB/SQL) | Yashika (20% - NLP / UI) |
| :--- | :--- | :--- | :--- | :--- |
| **1 (Sat)** | [x] Create project skeleton scaffold<br>[ ] Review Supabase project setup | [ ] Supabase Auth wiring<br>[ ] Phone-OTP flow for user | [ ] Postgres schema setup (`users`, `emergency_contacts`, `sessions`, `messages` tables) | [ ] Signup UI: Multi-contact form layout<br>[ ] Add priority order + relationships |
| **2 (Sun)** | [ ] Chat UI ↔ FastAPI ↔ LLM reply loop (no risk yet)<br>[ ] Add Hinglish mirroring to reply prompt | [ ] API endpoints for chat send/receive<br>[ ] Session handling APIs | [ ] RAG document table (`rag_documents`) schema<br>[ ] pgvector extension migration | [ ] Start high-risk keyword phrase lists |
| **3 (Mon)** | [ ] LLM structured risk classification (JSON output)<br>[ ] Wire risk call into chat pipeline | [ ] `risk_events` + `alert_attempts` db log wiring | [ ] Review DB indexes<br>[ ] Add `routed_to_helpline` to action enum | [ ] Keyword/regex pre-filter stub<br>[ ] Incorporate Hinglish/Roman term set |
| **4 (Tue)** | [ ] Bland AI pathway setup & API trigger | [ ] Call escalation logic (priority & timeout)<br>[ ] Short-circuit check for `category == abuse` | [ ] Twilio SMS fallback fan-out (parallel SMS) | [ ] Support-test escalation calls manually<br>[ ] Verify abuse events do NOT trigger personal call |
| **5 (Wed)** | [ ] Rolling summary generator (LLM)<br>[ ] Inject summary into system prompt | [ ] Cross-login context loading API endpoint | [ ] Session table wiring<br>[ ] Save `summary_snapshot` to database | [ ] Policy disclosure UI (§3.5)<br>[ ] Add abuse-routing disclosure copy |
| **6 (Thu)** | [ ] Wire RAG context into reply prompt | [ ] Support retrieval API calls | [ ] Ingest WHO/NIMHANS/ICMR vector excerpts | [ ] Create Day 7 test conversation set (with Hinglish & abuse subsets) |
| **7 (Fri)** | [ ] Run full test conversations<br>[ ] Tune false positive/negative thresholds | [ ] Fix backend bugs from testing | [ ] Fix database schema/indexing issues | [ ] Run tests, log results<br>[ ] Flag classification errors |
| **8 (Sat)** | [ ] Live demo script integration (Hinglish + abuse highlights) | [ ] Deploy backend (Railway/Render) | [ ] Deploy DB checks & schema sanity pass | [ ] Deploy frontend (Vercel)<br>[ ] Polish signup/consent screens |

---

## Key Sync Milestones
1. **Day 1 → Day 2**: Aakansha's core tables must be ready before Khushal writes Auth/API endpoints that query them.
2. **Day 3 → Day 4**: `risk_events` and `alert_attempts` logging tables must exist before the escalation logic is written.
3. **Day 4 Start (Highest Coordination)**: Sync on data models passed between LLM classifier, Khushal's state machine, and Mannat's Bland AI trigger. Ensure the `category == abuse` check intercepts the escalation path before anyone is dialed.
4. **Day 6 → Day 7**: Yashika locks down the test set (English + Hinglish + abuse cases) before Friday testing begins.
