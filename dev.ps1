# Launch YUVAA Saarthi Backend and Frontend

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Starting YUVAA Saarthi (Backend + Frontend) " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$root\backend`"; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

Write-Host "[2/2] Starting React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$root\frontend`"; npm run dev"

Write-Host "`nBoth services are now running in separate terminal windows!" -ForegroundColor Yellow
Write-Host "  - Backend API & Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Frontend Web App:   http://localhost:5173" -ForegroundColor White
