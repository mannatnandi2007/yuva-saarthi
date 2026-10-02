@echo off
title YUVAA Saarthi - Development Launcher
color 0D
echo =====================================================================
echo   Starting YUVAA Saarthi (Backend + Frontend) - Dev Mode
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/2] Launching Backend API (FastAPI on port 8000)...
start "YUVAA Backend (FastAPI)" cmd /k "cd /d ""%ROOT_DIR%backend"" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo [2/2] Launching Frontend (Vite on port 5173)...
start "YUVAA Frontend (Vite)" cmd /k "cd /d ""%ROOT_DIR%frontend"" && npm run dev"

echo.
echo Both servers launched in their own terminal windows:
echo   - Backend Docs: http://localhost:8000/docs
echo   - Frontend App:  http://localhost:5173
echo.
