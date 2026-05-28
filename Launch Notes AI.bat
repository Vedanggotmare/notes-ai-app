@echo off
title Notes AI
cd /d "%~dp0"

echo Starting Notes AI...

:: Kill any leftover processes from a previous session
taskkill /F /IM electron.exe >nul 2>&1

:: Kill any leftover Vite server on 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start Vite dev server in background
start /B "" node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 >nul 2>&1

:: Wait for Vite to be ready (poll until port 5173 responds)
:wait
timeout /T 1 /NOBREAK >nul
netstat -an | find "127.0.0.1:5173" >nul 2>&1
if errorlevel 1 goto wait

:: Launch Electron
start "" "node_modules\electron\dist\electron.exe" .

:: Close this window
timeout /T 2 /NOBREAK >nul
exit
