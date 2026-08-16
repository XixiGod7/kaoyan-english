@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 考研英语一真题库

echo ========================================================
echo       考研英语一真题库 (2010-2026) - 本地极速启动器
echo ========================================================
echo 提示：关闭此命令行窗口即可自动停止服务。
echo --------------------------------------------------------

REM 1. 优先尝试 python
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [启动中] 正在启动题库服务...
    python server.py
    goto :eof
)

REM 2. 尝试 py
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [启动中] 正在启动题库服务 (py)...
    py server.py
    goto :eof
)

REM 3. 尝试 python3
where python3 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [启动中] 正在启动题库服务 (python3)...
    python3 server.py
    goto :eof
)

echo ========================================================
echo [提示] 未在系统中检测到 Python 环境！
echo 请安装 Python 3 (https://www.python.org) 后重试。
echo ========================================================
pause
