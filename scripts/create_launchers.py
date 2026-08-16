import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

python_dir = os.path.dirname(sys.executable)
pythonw_path = os.path.join(python_dir, 'pythonw.exe')
if not os.path.exists(pythonw_path):
    pythonw_path = 'pythonw.exe'

# VBS launcher script for Chrome Standalone App mode (Zero black window, auto life-cycle shutdown)
vbs_app_content = 'Set ws = CreateObject("WScript.Shell")\n' + \
    'Set fso = CreateObject("Scripting.FileSystemObject")\n' + \
    'currentDir = fso.GetParentFolderName(WScript.ScriptFullName)\n' + \
    'ws.CurrentDirectory = currentDir\n' + \
    f'ws.Run """{pythonw_path}""" & " """ & currentDir & "\\scripts\\app_runner.py""", 0, False\n'

# Batch script to create desktop shortcut
shortcut_app_bat_content = """@echo off
cd /d "%~dp0"
title 创建考研英语桌面快捷方式

python scripts\\create_shortcut.py
echo.
ping 127.0.0.1 -n 3 >nul
exit /b 0
"""

# Legacy bat script for users who prefer standard browser tab
start_bat_content = """@echo off
cd /d "%~dp0"
title 考研英语真题刷题系统

python scripts\\launcher.py
if %ERRORLEVEL% neq 0 (
    start "" "http://localhost:8085"
    npm run dev -- --port 8085 --host
)
"""

stop_bat_content = """@echo off
cd /d "%~dp0"
title 停止考研英语服务

python scripts\\stop_server.py
echo.
ping 127.0.0.1 -n 2 >nul
exit /b 0
"""

# Write GBK encoded batch files
files_to_write_gbk = {
    os.path.join(ROOT_DIR, '一键生成桌面应用快捷方式.bat'): shortcut_app_bat_content,
    os.path.join(ROOT_DIR, '一键生成桌面快捷方式.bat'): shortcut_app_bat_content,
    os.path.join(ROOT_DIR, '一键启动考研英语.bat'): start_bat_content,
    os.path.join(ROOT_DIR, 'start_app.bat'): start_bat_content,
    os.path.join(ROOT_DIR, 'start.bat'): start_bat_content,
    os.path.join(ROOT_DIR, '停止服务.bat'): stop_bat_content,
}

for filepath, content in files_to_write_gbk.items():
    with open(filepath, 'w', encoding='gbk', errors='ignore') as f:
        f.write(content)
    print(f"Generated GBK: {os.path.basename(filepath)}")

# Write VBS files
vbs_files = [
    os.path.join(ROOT_DIR, '考研英语一真题系统.vbs'),
    os.path.join(ROOT_DIR, '一键启动(无黑框).vbs'),
    os.path.join(ROOT_DIR, 'launch_silent.vbs')
]

for vbs_path in vbs_files:
    with open(vbs_path, 'w', encoding='utf-8') as f:
        f.write(vbs_app_content)
    print(f"Generated VBS: {os.path.basename(vbs_path)}")

print("\nAll standalone desktop app launchers generated successfully!")
