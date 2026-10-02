@echo off
title YUVAA Saarthi Launcher
color 0D
echo =====================================================================
echo           YUVAA SAARTHI - ADOLESCENT MENTAL HEALTH COMPANION         
echo           PWA + Dynamic Yusa Animations + Pink & Purple Palette
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check if Python virtual environment exists
if not exist "%ROOT_DIR%backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at:
    echo         %ROOT_DIR%backend\.venv
    echo Please install dependencies first or run setup.
    pause
    exit /b 1
)

echo [1/2] Launching FastAPI Backend Server (port 8000)...
start "YUVAA Saarthi - Backend Server [Port 8000]" cmd /k "cd /d ""%ROOT_DIR%backend"" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo [2/2] Launching React Vite Frontend Server (port 5173)...
start "YUVAA Saarthi - Frontend Web [Port 5173]" cmd /k "cd /d ""%ROOT_DIR%frontend"" && npm run dev"

echo.
echo =====================================================================
echo   YUVAA Saarthi services are running!
echo   * Web App UI:       http://localhost:5173
echo   * API & Swagger:    http://localhost:8000/docs
echo   * Health Endpoint:  http://localhost:8000/health
echo   * RAG Ingestion:    Run ingest_rag.bat to index docs
echo =====================================================================
echo.
echo   Press any key to close this launcher window (servers stay active).
pause >nul
