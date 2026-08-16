import os
import shutil
import zipfile

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
    # 3. Copy launchers
    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(out_dir, '一键启动考研英语.bat'))
    shutil.copy2(os.path.join(root_dir, '一键启动_Mac.command'), os.path.join(out_dir, '一键启动_Mac.command'))
    shutil.copy2(os.path.join(root_dir, '停止服务.bat'), os.path.join(out_dir, '停止服务.bat'))
    shutil.copy2(os.path.join(root_dir, '停止服务_Mac.command'), os.path.join(out_dir, '停止服务_Mac.command'))

    # 4. Copy data
    shutil.copytree(os.path.join(root_dir, 'public', 'data'), os.path.join(out_dir, 'data'))

    # 5. Copy images and thumbs if exist
    img_dir = os.path.join(root_dir, 'public', 'images')
    if os.path.exists(img_dir):
        shutil.copytree(img_dir, os.path.join(out_dir, 'images'))

    thumb_dir = os.path.join(root_dir, 'public', 'thumbs')
    if os.path.exists(thumb_dir):
        shutil.copytree(thumb_dir, os.path.join(out_dir, 'thumbs'))

    # 6. Create native macOS App Bundle (考研英语真题库.app)
    mac_app_dir = os.path.join(out_dir, '考研英语真题库.app', 'Contents')
    mac_macos_dir = os.path.join(mac_app_dir, 'MacOS')
    os.makedirs(mac_macos_dir, exist_ok=True)

    plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>com.kaoyan.english.app</string>
    <key>CFBundleName</key>
    <string>考研英语真题库</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
"""
    with open(os.path.join(mac_app_dir, 'Info.plist'), 'w', encoding='utf-8') as f:
        f.write(plist_content)

    launcher_content = """#!/bin/bash
DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"
if command -v python3 >/dev/null 2>&1; then
    python3 server.py
elif [ -x "/usr/bin/python3" ]; then
    /usr/bin/python3 server.py
elif [ -x "/opt/homebrew/bin/python3" ]; then
    /opt/homebrew/bin/python3 server.py
fi
"""
    launcher_path = os.path.join(mac_macos_dir, 'launcher')
    with open(launcher_path, 'w', encoding='utf-8') as f:
        f.write(launcher_content)

    # 7. Create instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整离线运行包
============================================================

【Windows 系统运行方法】
直接双击运行【一键启动考研英语.bat】，系统将自动在浏览器中打开。

【Mac 系统运行方法】
如首次双击提示权限问题，在终端运行以下一行命令即可永久解除：
   xattr -dr com.apple.quarantine . && chmod -R +x .
之后双击【考研英语真题库.app】或【一键启动_Mac.command】即可秒开！

【停止后台服务】
- Windows: 双击【停止服务.bat】
- Mac: 双击【停止服务_Mac.command】或在终端按 Ctrl+C
"""
    with open(os.path.join(out_dir, '使用说明.txt'), 'w', encoding='utf-8') as f:
        f.write(instructions)

    # 7. Zip with Unix executable permissions preserved!
    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(out_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, root_dir)
                
                # Check if it's executable script
                zinfo = zipfile.ZipInfo.from_file(file_path, arcname)
                if file.endswith('.command') or file.endswith('.sh') or file.endswith('.py') or file == 'launcher':
                    # Set Unix permission to 0755 (-rwxr-xr-x)
                    zinfo.external_attr = (0o755 << 16) | 0x20
                else:
                    zinfo.external_attr = (0o644 << 16) | 0x20
                
                with open(file_path, 'rb') as fp:
                    zipf.writestr(zinfo, fp.read())

    print(f"Successfully generated complete offline zip at {zip_path}!")

if __name__ == '__main__':
    build_offline_package()
