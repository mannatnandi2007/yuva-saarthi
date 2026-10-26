# Yuva Saarthi — RAG Knowledge Ingestion Script
# Scans and indexes clinical and support documents in docs/rag_documents/

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"

$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Scanning & Ingesting Yuva Saarthi RAG Docs " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$env:PYTHONPATH = "backend"

& $pythonExe -c "
import sys
from app.services.folder_rag_service import scan_and_chunk_folder, refresh_folder_rag

print('--> Refreshing knowledge index...')
refresh_folder_rag()
chunks = scan_and_chunk_folder()
print(f'--> Ingestion complete! Total indexed chunks: {len(chunks)}')
"

Write-Host "`nDone." -ForegroundColor Green
