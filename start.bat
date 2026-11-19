@echo off
rem GapTutor launcher (Next.js dev server)
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
start "GapTutor" cmd /k "npm run dev & pause"
timeout /t 8 >nul
start "" http://localhost:3000