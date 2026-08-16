#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "    考研英语一真题库 (Mac 极速启动器)    "
echo "=========================================================="

PORT=8085
URL="http://localhost:${PORT}"

# 1. 检查服务是否已在运行
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "[提示] 检测到服务已在运行，正在直接打开浏览器..."
    open "$URL"
    exit 0
fi

# 2. 检查 Python3 / Python
if command -v python3 >/dev/null 2>&1; then
    echo "[1/2] 正在启动 Python3 本地服务..."
    python3 server.py
elif command -v python >/dev/null 2>&1; then
    echo "[1/2] 正在启动 Python 本地服务..."
    python server.py
elif [ -d "node_modules" ] && command -v npm >/dev/null 2>&1; then
    echo "[1/2] 正在启动 Vite 开发服务..."
    npm run dev -- --port $PORT &
    sleep 2
    open "$URL"
else
    echo "[错误] 未检测到 Python 环境。"
    read -p "按回车键退出..."
fi

