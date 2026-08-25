#!/bin/bash
# One-click startup script for Linux and macOS

echo "=============================================================================="
echo "  URBAN INFRASTRUCTURE CASCADE SIMULATOR -- ONE-CLICK LAUNCHER (UNIX)"
echo "=============================================================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is required. Please install Python 3.10+."
    exit 1
fi

# Check Node
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is required. Please install Node.js 18+."
    exit 1
fi

echo "[1/2] Installing backend requirements and launching FastAPI..."
pip install -r backend/requirements.txt
uvicorn backend.api:app --reload --port 8000 &
BACKEND_PID=$!

echo "[2/2] Installing frontend packages and launching Vite..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo "=============================================================================="
echo "  Servers running! Open http://localhost:5173 in your browser."
echo "  Press CTRL+C to terminate both servers."
echo "=============================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
