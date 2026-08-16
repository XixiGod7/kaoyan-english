import os
import shutil
import zipfile
import pycdlib
from PIL import Image

def build_offline_package():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root_dir, 'kaoyan-english-offline')
    zip_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0-offline.zip')
    dmg_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0.dmg')
    public_dir = os.path.join(root_dir, 'public')
    dist_html = os.path.join(root_dir, 'dist', 'index.html')

    if not os.path.exists(dist_html):
        raise FileNotFoundError("dist/index.html does not exist! Please run npm run build first.")

    os.makedirs(out_dir, exist_ok=True)

    # 1. Copy web files for root offline directory
    shutil.copy2(dist_html, os.path.join(out_dir, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(out_dir, 'server.py'))
    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(out_dir, '一键启动考研英语.bat'))
    shutil.copy2(os.path.join(root_dir, '一键启动_Mac.command'), os.path.join(out_dir, '一键启动_Mac.command'))

    # 2. Windows Silent VBS Launcher
    vbs_content = '''Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = currentDir
ws.Run "cmd /c """ & currentDir & "\\一键启动考研英语.bat""", 0, False
'''
    with open(os.path.join(out_dir, '启动考研英语(无黑框后台运行).vbs'), 'w', newline='\r\n', encoding='gbk') as f:
        f.write(vbs_content)

    # 3. Create 100% self-contained macOS .app bundle
    app_bundle = os.path.join(out_dir, '考研英语一真题库.app')
    app_contents = os.path.join(app_bundle, 'Contents')
    app_macos = os.path.join(app_contents, 'MacOS')
    app_resources = os.path.join(app_contents, 'Resources')
    app_web = os.path.join(app_resources, 'web')

    os.makedirs(app_macos, exist_ok=True)
    os.makedirs(app_resources, exist_ok=True)
    os.makedirs(app_web, exist_ok=True)

    # 3.1 AppIcon.icns
    icon_512_path = os.path.join(public_dir, 'icons', 'icon-512.png')
    if os.path.exists(icon_512_path):
        img = Image.open(icon_512_path)
        img.save(os.path.join(app_resources, 'AppIcon.icns'), format='ICNS')

    # 3.2 Info.plist
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

    # 3.3 app_launcher (Self-contained launcher script)
    app_launcher = """#!/bin/bash
CONTENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$CONTENTS_DIR/Resources/web"
cd "$WEB_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"

PORT=8085
URL="http://127.0.0.1:${PORT}"

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

# Check if port 8085 is active; if not, automatically launch multi-threaded server in background
if ! nc -z 127.0.0.1 $PORT >/dev/null 2>&1; then
    if [ -n "$PYTHON_CMD" ]; then
        nohup "$PYTHON_CMD" server.py >/dev/null 2>&1 &
        sleep 0.8
    fi
fi

# Launch in dedicated App Mode or browser
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

    # 3.4 Populate self-contained Resources/web directory
    shutil.copy2(dist_html, os.path.join(app_web, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(app_web, 'server.py'))
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(app_web, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(app_web, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(app_web, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(app_web, 'thumbs'), dirs_exist_ok=True)

    # 4. Copy static assets to root offline folder for Windows/BAT users
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(out_dir, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(out_dir, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(out_dir, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(out_dir, 'thumbs'), dirs_exist_ok=True)

    # 5. Instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整离线包
============================================================

【Windows 一步到位使用方法】
解压后直接双击【启动考研英语(无黑框后台运行).vbs】（或【一键启动考研英语.bat】）即可秒开使用！

【macOS 一步到位使用方法】
解压后直接双击【考研英语一真题库.app】即可直接打开使用！
（可直接将【考研英语一真题库.app】拖到【应用程序】文件夹或桌面，自包含全部数据与自动启动引擎）

【停止服务】
直接关闭浏览器窗口即可；如需彻底退出后台服务，可重启电脑或在任务管理器/活动监视器中退出 Python。
"""
    with open(os.path.join(out_dir, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(instructions)

    # 6. Build macOS DMG installer disk image
    print("Building macOS DMG disk image installer...")
    if os.path.exists(dmg_path):
        os.remove(dmg_path)

    iso = pycdlib.PyCdlib()
    iso.new(udf='2.60', vol_ident='KaoyanEnglish')

    # Add Applications drag-and-drop link in DMG
    try:
        iso.add_symlink(udf_symlink_path='/Applications', udf_target='/Applications')
    except Exception as e:
        print(f"Note on symlink: {e}")

    # Recursively add the self-contained .app bundle into DMG root
    created_dirs = set()
    for root, dirs, files in os.walk(app_bundle):
        rel_dir = os.path.relpath(root, out_dir)
        parts = rel_dir.replace('\\', '/').split('/')
        
        curr = ''
        for p in parts:
            curr += '/' + p
            if curr not in created_dirs:
                try:
                    iso.add_directory(udf_path=curr)
                    created_dirs.add(curr)
                except Exception:
                    pass

        curr_dir = '/' + '/'.join(parts)
        for f in files:
            src_file = os.path.join(root, f)
            udf_file = curr_dir + '/' + f
            try:
                iso.add_file(src_file, udf_path=udf_file)
            except Exception as e:
                print(f"Error adding {udf_file} to DMG: {e}")

    # Add Readme to DMG
    readme_temp = os.path.join(root_dir, 'temp_dmg_readme.txt')
    dmg_readme = """============================================================
考研英语一真题库 (2010-2026) - macOS 专用 DMG 安装包
============================================================

【安装与使用说明】
1. 直接双击打开【考研英语一真题库.app】即可立即运行刷题（会自动启动后台服务并打开页面）！
2. 也可以将【考研英语一真题库.app】拖入右侧【Applications (应用程序)】文件夹，即可永久常驻 Dock 程序坞或 Launchpad 启动台！

【停止服务】
直接关闭浏览器或退出应用即可。
"""
    with open(readme_temp, 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(dmg_readme)
    
    try:
        iso.add_file(readme_temp, udf_path='/使用说明.txt')
    except Exception:
        pass

    iso.write(dmg_path)
    iso.close()
    if os.path.exists(readme_temp):
        os.remove(readme_temp)
    print(f"Successfully generated macOS DMG at {dmg_path} (Size: {os.path.getsize(dmg_path)} bytes)!")

    # 7. Build offline zip
    print("Building universal offline zip package...")
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

    print(f"Successfully generated offline zip at {zip_path} (Size: {os.path.getsize(zip_path)} bytes)!")

if __name__ == '__main__':
    build_offline_package()
