@echo off
cd /d "%~dp0"
title 考研英语真题刷题系统

python scripts\launcher.py
if %ERRORLEVEL% neq 0 (
    start "" "http://localhost:8085"
    npm run dev -- --port 8085 --host
)
