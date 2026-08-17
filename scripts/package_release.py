import os
import sys
import shutil
import zipfile
import subprocess
from PIL import Image

def generate_icns(icon_png_path, target_icns_path):
    """Generate high-res macOS .icns file using iconutil (macOS native) or Pillow fallback."""
    if not os.path.exists(icon_png_path):
        return False
    
    # Try native macOS iconutil first for retina-quality icns
    if shutil.which('iconutil') and shutil.which('sips'):
        iconset_dir = target_icns_path + '.iconset'
        os.makedirs(iconset_dir, exist_ok=True)
        try:
            img = Image.open(icon_png_path)
            sizes = [16, 32, 64, 128, 256, 512]
            for s in sizes:
                img_s = img.resize((s, s), Image.Resampling.LANCZOS)
                img_s.save(os.path.join(iconset_dir, f'icon_{s}x{s}.png'))
                img_2x = img.resize((s * 2, s * 2), Image.Resampling.LANCZOS)
                img_2x.save(os.path.join(iconset_dir, f'icon_{s}x{s}@2x.png'))
            
            subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', target_icns_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            shutil.rmtree(iconset_dir, ignore_errors=True)
            return True
        except Exception:
            shutil.rmtree(iconset_dir, ignore_errors=True)
    
    # Fallback to Pillow
    try:
        img = Image.open(icon_png_path)
        img.save(target_icns_path, format='ICNS')
        return True
    except Exception as e:
        print(f"Warning: Could not generate ICNS: {e}")
        return False

def build_offline_package():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(root_dir, 'public')
    dist_html = os.path.join(root_dir, 'dist', 'index.html')

    win_zip_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0-windows.zip')
    mac_dmg_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0-macos.dmg')

    # Remove obsolete combined artifacts if they exist
    for obsolete in ['kaoyan-english-v1.0.0-offline.zip', 'kaoyan-english-v1.0.0.dmg']:
        p = os.path.join(root_dir, obsolete)
        if os.path.exists(p):
            os.remove(p)

    if not os.path.exists(dist_html):
        print("dist/index.html not found, running 'npm run build'...")
        subprocess.run(['npm', 'run', 'build'], cwd=root_dir, check=True)

    # =========================================================================
    # 1. BUILD WINDOWS DEDICATED RELEASE PACKAGE (kaoyan-english-v1.0.0-windows.zip)
    # =========================================================================
    print("\n[1/2] Building Windows dedicated release package...")
    win_staging = os.path.join(root_dir, 'kaoyan-english-windows')
    if os.path.exists(win_staging):
        shutil.rmtree(win_staging)
    os.makedirs(win_staging, exist_ok=True)

    # 1.1 Copy web files
    shutil.copy2(dist_html, os.path.join(win_staging, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(win_staging, 'server.py'))
    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(win_staging, '一键启动考研英语.bat'))

    # 1.2 Windows Silent VBS Launcher
    vbs_content = '''Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = currentDir
ws.Run "cmd /c """ & currentDir & "\\一键启动考研英语.bat""", 0, False
'''
    with open(os.path.join(win_staging, '启动考研英语(无黑框后台运行).vbs'), 'w', newline='\r\n', encoding='gbk') as f:
        f.write(vbs_content)

    # 1.3 Copy assets
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(win_staging, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(win_staging, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(win_staging, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(win_staging, 'thumbs'), dirs_exist_ok=True)

    # 1.4 Windows Instructions
    win_readme = """============================================================
考研英语一真题库 (2010-2026) - Windows 专用绿色免安装版
============================================================

【使用方法（任选一种）】
方法一（最推荐 · 静默秒开）：
直接双击【启动考研英语(无黑框后台运行).vbs】即可秒开刷题界面（无黑框、后台极速运行）！

方法二（带控制台日志）：
双击【一键启动考研英语.bat】。

【安装为独立桌面 App】
在打开的 Chrome 或 Edge 浏览器中，点击地址栏右侧的【在应用中打开】或【安装】图标，即可生成原生独立窗口！

【停止服务】
直接关闭浏览器窗口即可；如需彻底退出后台 Python 服务，可在任务管理器中结束 python.exe 进程。
"""
    with open(os.path.join(win_staging, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(win_readme)

    # 1.5 Create Windows Zip
    if os.path.exists(win_zip_path):
        os.remove(win_zip_path)

    with zipfile.ZipFile(win_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(win_staging):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, win_staging)
                arcname = 'kaoyan-english-windows/' + rel_path.replace('\\', '/')
                
                zinfo = zipfile.ZipInfo(arcname)
                zinfo.create_system = 0  # FAT / Windows
                zinfo.flag_bits |= 0x800  # UTF-8
                zinfo.date_time = (2026, 8, 17, 12, 0, 0)
                
                with open(file_path, 'rb') as fp:
                    zipf.writestr(zinfo, fp.read())

    shutil.rmtree(win_staging, ignore_errors=True)
    print(f"✅ Successfully built Windows release: {win_zip_path} (Size: {os.path.getsize(win_zip_path):,} bytes)")

    # =========================================================================
    # 2. BUILD macOS DEDICATED DMG PACKAGE (kaoyan-english-v1.0.0-macos.dmg)
    # =========================================================================
    print("\n[2/2] Building macOS dedicated DMG installer...")
    mac_staging = os.path.join(root_dir, 'dmg_staging')
    if os.path.exists(mac_staging):
        shutil.rmtree(mac_staging)
    os.makedirs(mac_staging, exist_ok=True)

    app_bundle = os.path.join(mac_staging, '考研英语一真题库.app')
    app_contents = os.path.join(app_bundle, 'Contents')
    app_macos = os.path.join(app_contents, 'MacOS')
    app_resources = os.path.join(app_contents, 'Resources')
    app_web = os.path.join(app_resources, 'web')

    os.makedirs(app_macos, exist_ok=True)
    os.makedirs(app_resources, exist_ok=True)
    os.makedirs(app_web, exist_ok=True)

    # 2.1 Generate ICNS
    icon_512_path = os.path.join(public_dir, 'icons', 'icon-512.png')
    target_icns = os.path.join(app_resources, 'AppIcon.icns')
    public_icns = os.path.join(public_dir, 'icons', 'AppIcon.icns')
    
    if not os.path.exists(public_icns) and os.path.exists(icon_512_path):
        generate_icns(icon_512_path, public_icns)
    
    if os.path.exists(public_icns):
        shutil.copy2(public_icns, target_icns)

    # 2.2 Info.plist
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

    # 2.3 app_launcher
    app_launcher = """#!/bin/bash
CONTENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$CONTENTS_DIR/Resources/web"
cd "$WEB_DIR" || exit 1

export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$HOME/.pyenv/shims:$HOME/.local/bin:$HOME/miniconda3/bin:$HOME/miniforge3/bin:$HOME/anaconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PORT=8085
URL="http://127.0.0.1:${PORT}"

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

if [ -z "$PYTHON_CMD" ]; then
    osascript -e 'display alert "考研英语一真题库" message "未检测到 Python 3 运行环境！\\n\\n请在终端运行 \"xcode-select --install\" 安装命令行工具，或安装 Python 3 后重试。" as critical' 2>/dev/null
    exit 1
fi

# Check if port 8085 is active; if not, automatically launch multi-threaded server in background
if ! nc -z 127.0.0.1 $PORT >/dev/null 2>&1; then
    nohup "$PYTHON_CMD" server.py >/dev/null 2>&1 &
    for i in {1..30}; do
        if nc -z 127.0.0.1 $PORT >/dev/null 2>&1; then
            break
        fi
        sleep 0.1
    done
fi

# Launch in dedicated App Window Mode if Chrome or Edge is installed
CHROME_PATHS=(
    "/Applications/Google Chrome.app"
    "$HOME/Applications/Google Chrome.app"
)
EDGE_PATHS=(
    "/Applications/Microsoft Edge.app"
    "$HOME/Applications/Microsoft Edge.app"
)

for chrome in "${CHROME_PATHS[@]}"; do
    if [ -d "$chrome" ]; then
        open -na "$chrome" --args --app="$URL"
        exit 0
    fi
done

for edge in "${EDGE_PATHS[@]}"; do
    if [ -d "$edge" ]; then
        open -na "$edge" --args --app="$URL"
        exit 0
    fi
done

# Fallback to default browser
open "$URL"
"""
    launcher_path = os.path.join(app_macos, 'app_launcher')
    with open(launcher_path, 'w', newline='\n', encoding='utf-8') as f:
        f.write(app_launcher)
    os.chmod(launcher_path, 0o755)

    # 2.4 Populate self-contained Resources/web
    shutil.copy2(dist_html, os.path.join(app_web, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(app_web, 'server.py'))
    os.chmod(os.path.join(app_web, 'server.py'), 0o755)
    
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(app_web, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(app_web, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(app_web, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(app_web, 'thumbs'), dirs_exist_ok=True)

    # Ensure all directories and executable bits in .app
    for root, dirs, files in os.walk(app_bundle):
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o755)
        for file in files:
            p = os.path.join(root, file)
            if file == 'app_launcher' or file.endswith(('.sh', '.command', '.py')):
                os.chmod(p, 0o755)

    # 2.5 macOS DMG Readme & Symlink
    dmg_readme = """============================================================
考研英语一真题库 (2010-2026) - macOS 专用 DMG 安装包
============================================================

【安装与使用说明】
1. 直接将【考研英语一真题库.app】拖入右侧【Applications (应用程序)】文件夹，即可永久常驻 Dock 程序坞与 Launchpad 启动台！
2. 之后直接双击打开【考研英语一真题库.app】即可立即运行刷题（会自动启动后台服务并打开极简 App 窗口，无需任何命令行）！
3. 若系统提示“未知的开发者”或已损坏，请在访达中右键点击该应用并选择【打开】，或在终端运行：
   xattr -cr /Applications/考研英语一真题库.app

【停止服务】
直接关闭应用窗口即可。
"""
    with open(os.path.join(mac_staging, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(dmg_readme)

    os.symlink('/Applications', os.path.join(mac_staging, 'Applications'))

    # 2.6 Build DMG with hdiutil
    if os.path.exists(mac_dmg_path):
        os.remove(mac_dmg_path)

    if shutil.which('hdiutil'):
        cmd = [
            'hdiutil', 'create',
            '-volname', '考研英语一真题库',
            '-srcfolder', mac_staging,
            '-ov',
            '-format', 'UDZO',
            '-imagekey', 'zlib-level=9',
            mac_dmg_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        shutil.rmtree(mac_staging, ignore_errors=True)

        if res.returncode != 0:
            print(f"hdiutil error: {res.stderr}")
            raise RuntimeError(f"Failed to create DMG: {res.stderr}")
        print(f"✅ Successfully built macOS release: {mac_dmg_path} (Size: {os.path.getsize(mac_dmg_path):,} bytes)")
    else:
        shutil.rmtree(mac_staging, ignore_errors=True)
        print("Warning: hdiutil not found, skipped DMG build.")

    print("\n🎉 All platform-specific release packages generated successfully!")
    print(f"  - Windows: {win_zip_path} ({os.path.getsize(win_zip_path):,} bytes)")
    if os.path.exists(mac_dmg_path):
        print(f"  - macOS:   {mac_dmg_path} ({os.path.getsize(mac_dmg_path):,} bytes)")

if __name__ == '__main__':
    build_offline_package()
