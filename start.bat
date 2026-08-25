@echo off
TITLE Urban Infrastructure Cascade Simulator - Launcher
COLOR 0A

echo ==============================================================================
echo   URBAN INFRASTRUCTURE CASCADE SIMULATOR -- ONE-CLICK LAUNCHER
echo ==============================================================================
echo.

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

echo [2/3] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

echo [3/3] Starting Backend (FastAPI on Port 8000) and Frontend (Vite on Port 5173)...
echo.

:: Start FastAPI backend in a new window
start "Backend - FastAPI Server (Port 8000)" cmd /k "cd /d %~dp0 && pip install -r backend\requirements.txt && uvicorn backend.api:app --reload --port 8000"

:: Wait 2 seconds for backend initialization
timeout /t 2 /nobreak >nul

:: Start Vite frontend in a new window
start "Frontend - React Vite HUD (Port 5173)" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ==============================================================================
echo   SUCCESS! Both servers have been launched in separate terminal windows:
echo     - Backend API : http://localhost:8000
echo     - Frontend HUD: http://localhost:5173
echo.
echo   Press any key to open the web app in your default browser...
echo ==============================================================================
pause >nul
start http://localhost:5173
