@echo off
title AI Beats - 1-Click Music Publisher
color 0b
echo =====================================================================
echo                     AI BEATS - 1-CLICK PUBLISHER
echo =====================================================================
echo.

:: Automatically switch to this script's folder
cd /d "%~dp0"

echo [1/3] Scanning public\audio for new MP3 songs...
node scripts/sync-music.js
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ERROR: Failed to sync songs. Check your audio files.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Checking for changes...
git add .

:: Check if git has anything new to commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    color 0a
    echo =====================================================================
    echo   No new songs detected! Your library is already 100% up to date.
    echo =====================================================================
    echo.
    pause
    exit /b 0
)

echo Packaging new songs...
git commit -m "Update AI music library [%date% %time%]"
echo.

echo [3/3] Uploading to GitHub and Vercel...
git push origin main
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ERROR: Failed to upload. Please check your internet connection.
    pause
    exit /b %errorlevel%
)

echo.
color 0a
echo =====================================================================
echo   SUCCESS! All your new songs have been published!
echo   Vercel is now deploying your app automatically.
echo   You and your friends will see the new tracks in ~30 seconds.
echo =====================================================================
echo.
pause
