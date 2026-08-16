#!/bin/bash
# 切换到脚本所在目录
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "      考研英语一真题库 - macOS 一键启动器"
echo "=========================================================="

# 补全 macOS 常用环境变量路径 (Apple Silicon Homebrew / Intel Homebrew / Python Framework)
export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"

PORT=8085
URL="http://localhost:${PORT}"

# 1. 查找系统中的 Python3
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
    echo "[1/2] 检测到 Python 环境: $($PYTHON_CMD --version 2>&1)"
    echo "[2/2] 正在启动本地题库服务器并自动打开浏览器..."
    $PYTHON_CMD server.py
elif [ -d "node_modules" ] && command -v npm >/dev/null 2>&1; then
    echo "[1/2] 正在使用 npm 启动 Vite 服务..."
    npm run dev -- --port $PORT &
    sleep 2
    open "$URL"
    wait
else
    echo "=========================================================="
    echo "[错误] 未检测到 Python3 环境！"
    echo "请在 Mac 终端中运行 'xcode-select --install' 安装命令行工具。"
    echo "=========================================================="
    read -p "按回车键退出..."
fi


