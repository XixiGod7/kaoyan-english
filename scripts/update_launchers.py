import os

def update_all_launchers():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 1. 一键启动考研英语.bat (Windows)
    win_bat = """@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 考研英语一真题库

echo ========================================================
echo       考研英语一真题库 (2010-2026) - 本地极速启动器
echo ========================================================

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
"""
    with open(os.path.join(root, '一键启动考研英语.bat'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(win_bat)

    # 2. 停止服务.bat (Windows)
    win_stop = """@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在停止考研英语本地服务 (端口 8085)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8085" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [成功] 考研英语服务已安全关闭！
timeout /t 2 >nul
"""
    with open(os.path.join(root, '停止服务.bat'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(win_stop)

    # 3. server.py (Universal Python Server with full Windows & Mac support, LF line endings)
    server_py = """#!/usr/bin/env python3
import os
import sys
import webbrowser
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer
import socket
import time

PORT = 8085
URL = f"http://localhost:{PORT}"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, 'dist') if os.path.isdir(os.path.join(ROOT_DIR, 'dist')) else ROOT_DIR
DATA_DIR = os.path.join(ROOT_DIR, 'public', 'data') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'data')) else os.path.join(ROOT_DIR, 'data')
IMAGES_DIR = os.path.join(ROOT_DIR, 'public', 'images') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'images')) else os.path.join(ROOT_DIR, 'images')
THUMBS_DIR = os.path.join(ROOT_DIR, 'public', 'thumbs') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'thumbs')) else os.path.join(ROOT_DIR, 'thumbs')

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def translate_path(self, path):
        raw_path = path.split('?', 1)[0].split('#', 1)[0]
        decoded = urllib.parse.unquote(raw_path)
        
        # Map /data/* -> DATA_DIR
        if decoded.startswith('/data/') and os.path.isdir(DATA_DIR):
            rel = decoded[6:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(DATA_DIR, rel)
        if decoded.startswith('data/') and os.path.isdir(DATA_DIR):
            rel = decoded[5:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(DATA_DIR, rel)
            
        # Map /images/* -> IMAGES_DIR
        if decoded.startswith('/images/') and os.path.isdir(IMAGES_DIR):
            rel = decoded[8:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(IMAGES_DIR, rel)
        if decoded.startswith('images/') and os.path.isdir(IMAGES_DIR):
            rel = decoded[7:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(IMAGES_DIR, rel)

        # Map /thumbs/* -> THUMBS_DIR
        if decoded.startswith('/thumbs/') and os.path.isdir(THUMBS_DIR):
            rel = decoded[8:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(THUMBS_DIR, rel)
        if decoded.startswith('thumbs/') and os.path.isdir(THUMBS_DIR):
            rel = decoded[7:].replace('/', os.sep).replace('\\\\', os.sep)
            return os.path.join(THUMBS_DIR, rel)

        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        # Silent or concise logging
        pass

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def open_in_browser(url):
    try:
        if sys.platform == 'darwin':
            os.system(f'open "{url}" &')
        else:
            webbrowser.open(url)
    except Exception:
        try:
            webbrowser.open(url)
        except Exception:
            pass

def main():
    print("=" * 60)
    print("      考研英语一真题库 (2010-2026) - 本地轻量服务器")
    print("=" * 60)
    print(f"前端根目录: {DIST_DIR}")
    print(f"题库数据目录: {DATA_DIR}")
    print(f"访问地址: {URL}")
    print("-" * 60)

    if is_port_in_use(PORT):
        print(f"[提示] 服务已在端口 {PORT} 正常运行中，正在为您打开浏览器...")
        open_in_browser(URL)
        return

    server_address = ('0.0.0.0', PORT)
    try:
        httpd = HTTPServer(server_address, CustomHandler)
    except Exception as e:
        print(f"[错误] 绑定端口 {PORT} 失败: {e}")
        return

    print(f"[成功] 服务已就绪！正在为您自动弹出浏览器: {URL}")
    print("如需停止服务，请直接关闭本窗口，或运行【停止服务】脚本。")
    print("=" * 60)
    
    open_in_browser(URL)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("\\n服务已停止。")

if __name__ == '__main__':
    main()
"""
    with open(os.path.join(root, 'server.py'), 'w', newline='\n', encoding='utf-8') as f:
        f.write(server_py)

    # 4. 一键启动_Mac.command (macOS with strict LF endings)
    mac_command = """#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"

PORT=8085
URL="http://localhost:${PORT}"

echo "=========================================================="
echo "      考研英语一真题库 (2010-2026) - macOS 启动器"
echo "=========================================================="

PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif [ -x "/usr/bin/python3" ]; then
    PYTHON_CMD="/usr/bin/python3"
elif [ -x "/opt/homebrew/bin/python3" ]; then
    PYTHON_CMD="/opt/homebrew/bin/python3"
elif [ -x "/usr/local/bin/python3" ]; then
    PYTHON_CMD="/usr/local/bin/python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
    echo "[1/2] 找到 Python 环境: $($PYTHON_CMD --version 2>&1)"
    echo "[2/2] 正在启动本地服务器并打开浏览器..."
    $PYTHON_CMD server.py
else
    echo "=========================================================="
    echo "[错误] 未检测到 Python3 环境！"
    echo "请在 Mac 终端中运行 'xcode-select --install' 安装命令行工具。"
    echo "=========================================================="
    read -p "按回车键退出..."
fi
"""
    with open(os.path.join(root, '一键启动_Mac.command'), 'w', newline='\n', encoding='utf-8') as f:
        f.write(mac_command)

    # 5. 停止服务_Mac.command (macOS with strict LF endings)
    mac_stop = """#!/bin/bash
echo "正在停止考研英语本地服务 (端口 8085)..."
kill -9 $(lsof -t -i:8085) >/dev/null 2>&1
echo "[成功] 考研英语服务已安全关闭！"
sleep 1
"""
    with open(os.path.join(root, '停止服务_Mac.command'), 'w', newline='\n', encoding='utf-8') as f:
        f.write(mac_stop)

    print("All launchers updated successfully with correct LF/CRLF line endings!")

if __name__ == '__main__':
    update_all_launchers()
