@echo off
cd /d "%~dp0"
title Í£Ö¹¿¼ÑÐÓ¢Óï·þÎñ

python scripts\stop_server.py
echo.
ping 127.0.0.1 -n 2 >nul
exit /b 0
