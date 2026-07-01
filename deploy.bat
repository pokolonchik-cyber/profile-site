@echo off
chcp 65001 >nul
title Deploy Profile Site
echo ============================================
echo   Deploy to Render.com
echo ============================================
echo.
echo This will deploy your site to Render for 24/7 hosting.
echo.
echo Requirements:
echo   - GitHub account (free)
echo   - Render account (free, connects via GitHub)
echo.
pause
echo.

:: Check git
where git >nul 2>&1
if errorlevel 1 (
  echo Installing git...
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
)

:: Check gh
where gh >nul 2>&1
if errorlevel 1 (
  echo Installing GitHub CLI...
  winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
)

:: Init git
cd /d "%~dp0"
if not exist .git (
  git init
  git add .
  git commit -m "Initial commit"
)

:: Login to GitHub (opens browser)
echo.
echo Login to GitHub (browser will open)...
gh auth login -w

:: Create repo and push
echo.
echo Creating GitHub repository...
gh repo create profile-site --public --source=. --remote=origin --push

:: Open Render
echo.
echo ============================================
echo   Now deploy on Render:
echo   1. Go to https://dashboard.render.com
echo   2. Click "New +" - "Web Service"
echo   3. Connect your GitHub account
echo   4. Select "profile-site" repo
echo   5. Set:
echo      - Name: profile-site
echo      - Runtime: Node
echo      - Build: npm install
echo      - Start: node server.js
echo      - Plan: Free
echo   6. Click "Create Web Service"
echo   7. Wait 2-3 minutes for deploy
echo.
echo   Your site will be live at: https://profile-site.onrender.com
echo.
echo   Opening Render in browser...
echo ============================================
start https://dashboard.render.com

pause
