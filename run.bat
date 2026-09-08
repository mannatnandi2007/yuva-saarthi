@echo off
title YUVAA Saarthi Launcher
color 0C
echo =====================================================================
echo           YUVAA SAARTHI - ADOLESCENT MENTAL HEALTH COMPANION         
echo           Cold Snap x Hyperlane x Off-Register [Crimson & Cyber Rose]
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend (port 8000)...
start "YUVAA Saarthi - Backend Server [Port 8000]" cmd /k "cd /d "%~dp0backend" && call .\.venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo [2/2] Launching React Vite Frontend (port 5173)...
start "YUVAA Saarthi - Frontend Web [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =====================================================================
echo   Services are running!
echo   * Web App UI:       http://localhost:5173
echo   * API & Swagger:    http://localhost:8000/docs
echo   * Health Endpoint:  http://localhost:8000/health
echo =====================================================================
echo.
echo   Press any key to close this launcher window (servers stay active).
pause >nul
