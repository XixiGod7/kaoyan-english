@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在停止考研英语本地服务 (端口 8085)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8085" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [成功] 考研英语服务已安全关闭！
timeout /t 2 >nul
