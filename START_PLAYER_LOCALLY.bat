@echo off
title AI Beats - Local Music Player
color 0f
echo =====================================================================
echo                     AI BEATS - LOCAL PREVIEW
echo =====================================================================
echo.

cd /d "%~dp0"

echo Starting AI Beats local server...
echo.
npm run dev
pause
