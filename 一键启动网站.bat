@echo off
chcp 65001 >nul
echo ========================================================
echo.
echo    正在启动真题伴侣增强版 (考研英语学习系统)...
echo.
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 正在检查依赖环境...
call npm install --no-fund --no-audit

echo.
echo [2/2] 正在启动本地服务器并自动打开浏览器...
echo.
echo 如果浏览器没有自动弹出，请手动在浏览器输入：http://localhost:5173
echo.
echo (请不要关闭这个黑色窗口，关闭它网站就会停止运行)
echo.

npm run dev -- --open
