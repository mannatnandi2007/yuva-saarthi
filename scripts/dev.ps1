# Yuva Saarthi — Development Orchestrator Script
# Starts both FastAPI Backend (port 8000) and Vite Frontend (port 5173)

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting Yuva Saarthi Development Servers " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check backend virtual environment
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Write-Host "--> Launching FastAPI Backend on http://localhost:8000" -ForegroundColor Green
$backendJob = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000" -WorkingDirectory $backendDir -PassThru

Write-Host "--> Launching Vite Frontend on http://localhost:5173" -ForegroundColor Green
$frontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -PassThru

Write-Host "`nServers are running." -ForegroundColor Yellow
Write-Host "Backend PID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host "Press Ctrl+C or close terminal windows to stop.`n" -ForegroundColor Yellow

try {
    Wait-Process -Id $backendJob.Id, $frontendJob.Id
} finally {
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
}
