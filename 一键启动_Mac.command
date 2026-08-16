#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "      考研英语一真题库 - macOS 一键启动器"
echo "=========================================================="

export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"

PORT=8085
URL="http://localhost:${PORT}"

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
    echo "[1/2] 检测到 Python: $($PYTHON_CMD --version 2>&1)"
    echo "[2/2] 正在启动本地服务器..."
    $PYTHON_CMD server.py
else
    echo "=========================================================="
    echo "[错误] 未检测到 Python3 环境！"
    echo "请在 Mac 终端中运行 'xcode-select --install' 安装命令行工具。"
    echo "=========================================================="
    read -p "按回车键退出..."
fi
