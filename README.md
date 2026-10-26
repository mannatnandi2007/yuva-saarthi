# Yuva Saarthi

**Yuva Saarthi** ("Youth Companion") is an AI-powered youth mental well-being and crisis intervention web application designed specifically for Indian teenagers (ages 13–18).

The app combines empathetic conversational support with proactive clinical safety safeguards, natural code-switched Hinglish dialogue, visual emotional feedback via the Yusa mascot, and automated emergency escalation.

---

## Key Features

- **Empathetic Hinglish Companion:** Natural, culturally aware conversations that match the user's register without clinical platitudes or robotic tone.
- **Visual Emotional Feedback (Yusa Mascot):** 2D companion mascot reflecting real-time emotional states (`NORMAL`, `HAPPY`, `OVERJOYED`, `SAD`, `ANGRY`, `ANXIOUS`, `TIRED`).
- **Clinical Risk Classification:** Multi-tier risk screening distinguishing everyday hyperbole (*"exam dekh ke mar jaunga"*) from acute self-harm crises.
- **Automated Emergency Telephony:** Automated voice calls to priority emergency contacts via Bland AI when acute self-harm is detected.
- **Rule §3.4a Abuse Safeguard:** Automatically bypasses personal emergency contacts if domestic abuse is detected, routing immediately to verified helplines (Tele-MANAS `14416`, KIRAN `1800-599-0019`, Childline `1098`) to protect the minor.
- **RAG-Grounded Guidance:** Responses anchored in adolescent health protocols from WHO, NIMHANS, and ICMR.
- **Multi-Session Management:** Persistent chat history with rolling summaries, headings, and batch session deletion.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+)
- Supabase account (PostgreSQL with `pgvector`)

### 1. Clone & Set Up Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase, Gemini, and Groq keys
```

### 2. Set Up Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

### 3. Start Development Servers
Use the unified development script:
```powershell
.\scripts\dev.ps1
```
- **Backend API:** `http://localhost:8000` (Swagger docs at `/docs`)
- **Frontend App:** `http://localhost:5173`

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon / service role key |
| `GEMINI_API_KEY` | Google Gemini API key (Primary LLM) |
| `GROQ_API_KEY` | Groq Cloud API key (Automatic failover) |
| `BLAND_AI_KEY` | Bland AI API key for emergency voice calls |
| `JWT_SECRET` | Secret key for HS256 JWT session tokens |
| `DEV_BYPASS_AUTH` | Set `false` in production (allows dev auth bypass) |
| `ENABLE_DEMO_ROUTES` | Set `true` to mount `/demo` walkthrough routes |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:8000`) |

---

## RAG Knowledge Ingestion

To index clinical documents from `docs/rag_documents/`:
```powershell
.\scripts\ingest_rag.ps1
```

---

## Testing

Run the full backend test suite:
```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## Android Build (Capacitor)

The frontend is designed mobile-first and packaged for Android using Capacitor:

```bash
cd frontend
# 1. Build production web bundle
npm run build

# 2. Sync web bundle to Android native project
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

---

## Documentation

- **Living Specification & Architecture:** [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md)
- **UI & Mascot Design System:** [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
