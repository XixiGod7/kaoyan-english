#!/bin/bash
echo "正在停止考研英语本地服务 (端口 8085)..."
kill -9 $(lsof -t -i:8085) >/dev/null 2>&1
echo "[成功] 考研英语服务已安全关闭！"
sleep 1
