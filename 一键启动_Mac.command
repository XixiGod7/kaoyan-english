#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$HOME/.pyenv/shims:$HOME/.local/bin:$HOME/miniconda3/bin:$HOME/miniforge3/bin:$HOME/anaconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PORT=8085
URL="http://127.0.0.1:${PORT}"

echo "=========================================================="
echo "      考研英语一真题库 (2010-2026) - macOS 启动器"
echo "=========================================================="
echo "提示：关闭终端窗口即可自动停止服务。"
echo "----------------------------------------------------------"

PYTHON_CMD=""
CANDIDATES=(
    "/opt/homebrew/bin/python3"
    "/usr/local/bin/python3"
    "/usr/bin/python3"
    "/Library/Frameworks/Python.framework/Versions/Current/bin/python3"
    "$(command -v python3 2>/dev/null)"
    "$(command -v python 2>/dev/null)"
)

for cmd in "${CANDIDATES[@]}"; do
    if [ -n "$cmd" ] && [ -x "$cmd" ]; then
        if "$cmd" -c 'import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)' 2>/dev/null; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [ -n "$PYTHON_CMD" ]; then
    echo "[1/2] 找到 Python 3: $($PYTHON_CMD --version 2>&1)"
    echo "[2/2] 正在启动本地多线程服务并打开浏览器..."
    $PYTHON_CMD server.py
else
    echo "=========================================================="
    echo "[错误] 未检测到 Python 3 运行环境！"
    echo "请在 Mac 终端中运行 'xcode-select --install' 安装命令行工具。"
    echo "=========================================================="
    read -p "按回车键退出..."
fi
