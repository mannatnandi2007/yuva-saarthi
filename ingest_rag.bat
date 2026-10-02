@echo off
title YUVAA Saarthi - RAG Document Ingestion
color 0D
echo =====================================================================
echo           YUVAA SAARTHI - RAG CLINICAL DOCUMENT INGESTION
echo           Vector Embedding Pipeline (all-MiniLM-L6-v2)
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%backend"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at:
    echo         %ROOT_DIR%backend\.venv
    echo Please install dependencies first.
    pause
    exit /b 1
)

echo Scanning "docs\rag_documents\" and "docs\" for PDFs, DOCX, TXT, MD...
echo Generating 384-dimensional MiniLM embeddings...
echo Inserting vector embeddings into Supabase "rag_documents" table...
echo.

.\.venv\Scripts\python.exe -m app.services.folder_rag_service

echo.
echo =====================================================================
echo Ingestion task finished. Press any key to exit.
echo =====================================================================
pause >nul
