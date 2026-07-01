@echo off
chcp 65001 >nul
title Profile Site
cd /d "%~dp0"
echo Starting server...
taskkill /f /im node.exe >nul 2>&1

:: Start server
start "Profile Site" node server.js
timeout /t 5 /nobreak >nul

:: Get URL
if exist ngrok_url.txt (
  set /p URL=<ngrok_url.txt
  echo Public: %URL%
  start "" "%URL%"
)
echo Local: http://localhost:3000
start "" "http://localhost:3000"
echo.
echo Close this window to stop.
pause >nul
taskkill /f /im node.exe >nul 2>&1
