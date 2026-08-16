#!/usr/bin/env bash
cd "$(dirname "$0")"

# 考研英语一真题刷题系统 - Mac 一键极速启动脚本
echo "=========================================================="
echo "    考研英语一真题刷题系统 (Mac 独立应用/PWA 启动器)    "
echo "=========================================================="

if command -v python3 >/dev/null 2>&1; then
    python3 scripts/app_runner.py
elif command -v python >/dev/null 2>&1; then
    python scripts/app_runner.py
else
    echo "[提示] 未检测到 Python，正在使用 npm 启动服务..."
    npm run dev -- --port 8085 &
    sleep 2
    open "http://localhost:8085"
fi
