# Yuva Saarthi FastAPI Main Application
# Reference: PRD §4 (Tech Stack FastAPI) & Execution Plan Day 1

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, chat, risk, escalation, rag, users, demo, health
from app.config import settings

app = FastAPI(
    title="Yuva Saarthi Backend API",
    description="Youth well-being companion with safety-routing, crisis escalation, and Hinglish language support.",
    version="1.1.0"
)

# CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update with frontend Vercel deployment URL in production (PRD §4)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoint routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(risk.router)
app.include_router(escalation.router)
app.include_router(rag.router)
app.include_router(users.router)
app.include_router(health.router)  # Phase 6: LLM provider health

# Phase 1: demo routes gated behind ENABLE_DEMO_ROUTES (default False)
if settings.enable_demo_routes:
    app.include_router(demo.router)

@app.get("/")
async def read_root():
    return {
        "status": "healthy",
        "app": "Yuva Saarthi Backend API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
