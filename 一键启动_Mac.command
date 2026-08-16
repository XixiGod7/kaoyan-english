#!/usr/bin/env bash
cd "$(dirname "$0")"

# 考研英语一真题库 - Mac 一键极速启动脚本
echo "=========================================================="
echo "    考研英语一真题库 (Mac 极速启动器)    "
echo "=========================================================="

if [ -f "index.html" ]; then
    open "index.html"
elif [ -f "kaoyan-english-v1.0.0-standalone.html" ]; then
    open "kaoyan-english-v1.0.0-standalone.html"
elif [ -f "dist/index.html" ]; then
    open "dist/index.html"
elif command -v python3 >/dev/null 2>&1 && [ -f "scripts/app_runner.py" ]; then
    python3 scripts/app_runner.py
elif command -v npm >/dev/null 2>&1; then
    echo "[提示] 正在使用 npm 启动服务..."
    npm run dev -- --port 8085 &
    sleep 2
    open "http://localhost:8085"
fi
