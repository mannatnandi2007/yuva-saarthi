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
| `ENVIRONMENT` | Runtime environment: `development` or `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon / service role key |
| `GEMINI_API_KEY` | Google Gemini API key (Primary LLM) |
| `GROQ_API_KEY` | Groq Cloud API key (Automatic failover) |
| `BLAND_AI_KEY` | Bland AI API key for emergency voice calls |
| `NOTIFY_CHANNELS` | Enabled alert channels (e.g. `sms_fast2sms,telegram,email`) |
| `NOTIFY_DRY_RUN` | Set `true` in dev/staging to log notifications without SMS charges |
| `FAST2SMS_API_KEY`| Fast2SMS API key for emergency SMS alerts |
| `TELEGRAM_BOT_TOKEN`| Telegram Bot API token for crisis alerts |
| `EMAIL_API_KEY` | Resend / SendGrid API key for emergency email dispatch |
| `EMAIL_FROM` | Verified sender email address |
| `CORS_ORIGINS` | Comma-separated allowed origins (default includes localhost & Capacitor) |
| `RATE_LIMIT_PER_MINUTE` | In-memory sliding-window rate limit for `/chat` (default: 30) |
| `JWT_SECRET` | Secret key for HS256 session tokens (min 32 chars in production) |
| `DEV_BYPASS_AUTH` | Set `false` in production (strictly enforced at startup) |
| `ENABLE_DEMO_ROUTES` | Set `true` to mount `/demo` walkthrough routes |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of backend API (e.g. `http://localhost:8000`) |

---

## RAG Knowledge Ingestion

To index clinical documents from `docs/rag_documents/`:
```powershell
.\scripts\ingest_rag.ps1
```

---

## Testing & Quality Assurance

Run the comprehensive automated test suite (154 tests, 100% green pass rate):
```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

To run individual phase test suites:
```powershell
# Phase 8 Security & Rate Limiting:
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_phase8_security.py -v

# Phase 5 Multi-Channel Notifications:
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_phase5_notifications.py -v
```

---

## Android Build & Packaging (Capacitor)

The frontend features a mobile-first responsive layout with safe-area notch handling, 44px minimum touch targets, and native Android hardware back button support:

```bash
cd frontend

# 1. Build production web bundle and sync with Android native assets
npm run build:android

# 2. Open project in Android Studio
npm run open:android
```

---

## Documentation

- **Living Specification & Architecture:** [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md)
- **UI & Mascot Design System:** [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)

