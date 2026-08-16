import os
import shutil
import zipfile
from PIL import Image

def build_offline_package():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root_dir, 'kaoyan-english-offline')
    zip_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0-offline.zip')

    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    # 1. Copy dist/index.html -> index.html
    shutil.copy2(os.path.join(root_dir, 'dist', 'index.html'), os.path.join(out_dir, 'index.html'))
    
    # 2. Copy server.py
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(out_dir, 'server.py'))
    
    # 3. Copy clean launchers
    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(out_dir, '一键启动考研英语.bat'))
    shutil.copy2(os.path.join(root_dir, '一键启动_Mac.command'), os.path.join(out_dir, '一键启动_Mac.command'))

    # 3.1 Windows Silent VBS Launcher
    vbs_content = 'Set ws = CreateObject("Wscript.Shell")\nws.Run "cmd /c ""%~dp0一键启动考研英语.bat""", 0, False\n'
    # Use exact path logic in VBS
    vbs_content = '''Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = currentDir
ws.Run "cmd /c """ & currentDir & "\\一键启动考研英语.bat""", 0, False
'''
    with open(os.path.join(out_dir, '启动考研英语(无黑框后台运行).vbs'), 'w', newline='\r\n', encoding='gbk') as f:
        f.write(vbs_content)

    # 4. macOS Native .app Bundle: 考研英语一真题库.app
    app_bundle = os.path.join(out_dir, '考研英语一真题库.app')
    app_contents = os.path.join(app_bundle, 'Contents')
    app_macos = os.path.join(app_contents, 'MacOS')
    app_resources = os.path.join(app_contents, 'Resources')
    os.makedirs(app_macos, exist_ok=True)
    os.makedirs(app_resources, exist_ok=True)

    # 4.1 Generate AppIcon.icns for macOS
    icon_512_path = os.path.join(root_dir, 'public', 'icons', 'icon-512.png')
    if os.path.exists(icon_512_path):
        img = Image.open(icon_512_path)
        img.save(os.path.join(app_resources, 'AppIcon.icns'), format='ICNS')

    # 4.2 Info.plist
    info_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>app_launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.kaoyan.english.app</string>
    <key>CFBundleName</key>
    <string>考研英语一真题库</string>
    <key>CFBundleDisplayName</key>
    <string>考研英语一真题库</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
"""
    with open(os.path.join(app_contents, 'Info.plist'), 'w', newline='\n', encoding='utf-8') as f:
        f.write(info_plist)

    # 4.3 app_launcher (Mac one-step double click launcher)
    app_launcher = """#!/bin/bash
DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$DIR"

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

# If server not running, start it silently in background
if ! nc -z 127.0.0.1 $PORT >/dev/null 2>&1; then
    if [ -n "$PYTHON_CMD" ]; then
        nohup $PYTHON_CMD server.py >/dev/null 2>&1 &
        sleep 0.8
    fi
fi

# Open in Chrome / Edge App Mode or default browser
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$URL"
else
    open "$URL"
fi
"""
    with open(os.path.join(app_macos, 'app_launcher'), 'w', newline='\n', encoding='utf-8') as f:
        f.write(app_launcher)

    # 5. Copy icons folder
    icons_src = os.path.join(root_dir, 'public', 'icons')
    if os.path.exists(icons_src):
        shutil.copytree(icons_src, os.path.join(out_dir, 'icons'))

    # 6. Copy data
    shutil.copytree(os.path.join(root_dir, 'public', 'data'), os.path.join(out_dir, 'data'))

    # 7. Copy images and thumbs
    img_dir = os.path.join(root_dir, 'public', 'images')
    if os.path.exists(img_dir):
        shutil.copytree(img_dir, os.path.join(out_dir, 'images'))

    thumb_dir = os.path.join(root_dir, 'public', 'thumbs')
    if os.path.exists(thumb_dir):
        shutil.copytree(thumb_dir, os.path.join(out_dir, 'thumbs'))

    # 8. Create clean instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整桌面离线包
============================================================

【macOS 一步到位使用方法】
解压后直接双击【考研英语一真题库.app】即可直接打开使用！
（可直接将【考研英语一真题库.app】拖到桌面或 Dock 程序坞中常驻）
（备用方式：双击【一键启动_Mac.command】）

【Windows 一步到位使用方法】
解压后双击【启动考研英语(无黑框后台运行).vbs】或【一键启动考研英语.bat】。

【停止服务】
直接关闭浏览器窗口；如需完全退出后台服务，重新双击脚本即可或重启浏览器。
"""
    with open(os.path.join(out_dir, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(instructions)

    # 9. Zip with Unix POSIX executable permissions
    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(out_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, out_dir)
                arcname = rel_path.replace('\\', '/')
                
                zinfo = zipfile.ZipInfo(arcname)
                zinfo.create_system = 3  # UNIX
                zinfo.flag_bits |= 0x800  # UTF-8
                zinfo.date_time = (2026, 8, 16, 22, 0, 0)
                
                is_exec = file.endswith('.command') or file.endswith('.sh') or file.endswith('.py') or file.endswith('.bat') or file == 'app_launcher'
                if is_exec:
                    zinfo.external_attr = (0o100755 << 16) | 0x20
                else:
                    zinfo.external_attr = (0o100644 << 16) | 0x20
                
                with open(file_path, 'rb') as fp:
                    content = fp.read()
                    if file.endswith(('.command', '.sh', '.py', 'plist')) or file == 'app_launcher':
                        content = content.replace(b'\r\n', b'\n')
                    zipf.writestr(zinfo, content)

    print(f"Successfully generated clean offline zip at {zip_path} with native macOS .app bundle and Windows silent launcher!")

if __name__ == '__main__':
    build_offline_package()
