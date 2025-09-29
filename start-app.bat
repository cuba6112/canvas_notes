@echo off
echo Starting Canvas Notes Application...
echo.

REM Start backend server in a new window
echo Starting Backend Server (Port 5000)...
start "Canvas Notes Backend" cmd /k "cd /d %~dp0backend && node server.js"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend dev server in a new window
echo Starting Frontend Dev Server (Port 5173)...
start "Canvas Notes Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ====================================
echo Canvas Notes Application Started!
echo ====================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open the app in your browser...
pause >nul

REM Open the frontend in default browser
start http://localhost:5173

echo.
echo Both servers are running in separate windows.
echo Close this window anytime - servers will keep running.
echo To stop servers, close their individual windows.
pause