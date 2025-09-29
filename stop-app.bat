@echo off
echo Stopping Canvas Notes Application...
echo.

REM Kill Node.js processes (backend and frontend)
echo Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul

if %ERRORLEVEL% EQU 0 (
    echo Successfully stopped all Node.js servers.
) else (
    echo No Node.js processes were running.
)

echo.
echo Canvas Notes Application stopped.
pause