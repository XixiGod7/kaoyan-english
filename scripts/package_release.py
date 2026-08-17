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
    out_dir = os.path.join(root_dir, 'kaoyan-english-offline')
    zip_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0-offline.zip')
    dmg_path = os.path.join(root_dir, 'kaoyan-english-v1.0.0.dmg')
    public_dir = os.path.join(root_dir, 'public')
    dist_html = os.path.join(root_dir, 'dist', 'index.html')

    if not os.path.exists(dist_html):
        print("dist/index.html not found, running 'npm run build'...")
        subprocess.run(['npm', 'run', 'build'], cwd=root_dir, check=True)

    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    # 1. Copy web files for root offline directory
    shutil.copy2(dist_html, os.path.join(out_dir, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(out_dir, 'server.py'))
    os.chmod(os.path.join(out_dir, 'server.py'), 0o755)

    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(out_dir, '一键启动考研英语.bat'))
    
    mac_command_src = os.path.join(root_dir, '一键启动_Mac.command')
    mac_command_dst = os.path.join(out_dir, '一键启动_Mac.command')
    shutil.copy2(mac_command_src, mac_command_dst)
    os.chmod(mac_command_dst, 0o755)

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
    target_icns = os.path.join(app_resources, 'AppIcon.icns')
    public_icns = os.path.join(public_dir, 'icons', 'AppIcon.icns')
    
    if not os.path.exists(public_icns) and os.path.exists(icon_512_path):
        generate_icns(icon_512_path, public_icns)
    
    if os.path.exists(public_icns):
        shutil.copy2(public_icns, target_icns)

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

    # 3.4 Populate self-contained Resources/web directory
    shutil.copy2(dist_html, os.path.join(app_web, 'index.html'))
    shutil.copy2(os.path.join(root_dir, 'server.py'), os.path.join(app_web, 'server.py'))
    os.chmod(os.path.join(app_web, 'server.py'), 0o755)
    
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(app_web, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(app_web, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(app_web, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(app_web, 'thumbs'), dirs_exist_ok=True)

    # Recursively make sure all directories and executables in .app have correct permissions
    for root, dirs, files in os.walk(app_bundle):
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o755)
        for file in files:
            p = os.path.join(root, file)
            if file == 'app_launcher' or file.endswith(('.sh', '.command', '.py')):
                os.chmod(p, 0o755)

    # 4. Copy static assets to root offline folder for Windows/BAT users
    shutil.copytree(os.path.join(public_dir, 'icons'), os.path.join(out_dir, 'icons'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'data'), os.path.join(out_dir, 'data'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'images'), os.path.join(out_dir, 'images'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(public_dir, 'thumbs'), os.path.join(out_dir, 'thumbs'), dirs_exist_ok=True)

    # 5. Instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整离线包
============================================================

【macOS 使用方法（任选一种）】
方法一（最推荐 · 原生独立 App）：
1. 直接双击打开【考研英语一真题库.app】（自动启动极速本地服务并打开全屏 App 界面）；
2. 也可以将【考研英语一真题库.app】拖入【访达 -> 应用程序】或桌面，永久常驻 Dock 程序坞或 Launchpad 启动台。
（如果提示“来自未知开发者”，可右键点击应用选择“打开”，或在终端执行：xattr -cr /Applications/考研英语一真题库.app）

方法二（终端窗口启动）：
双击【一键启动_Mac.command】，关闭命令行窗口即可停止服务。

【Windows 使用方法（任选一种）】
方法一：直接双击【启动考研英语(无黑框后台运行).vbs】（静默后台秒开，无任何黑框）；
方法二：双击【一键启动考研英语.bat】。

【停止服务】
直接关闭浏览器窗口即可；如需彻底退出后台服务，可重启电脑或在任务管理器/活动监视器中退出 Python 进程。
"""
    with open(os.path.join(out_dir, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(instructions)

    # 6. Build macOS DMG installer disk image
    print("Building macOS DMG disk image installer...")
    if os.path.exists(dmg_path):
        os.remove(dmg_path)

    dmg_readme = """============================================================
考研英语一真题库 (2010-2026) - macOS 专用 DMG 安装包
============================================================

【安装与使用说明】
1. 直接双击打开【考研英语一真题库.app】即可立即运行刷题（会自动启动后台服务并打开页面）！
2. 也可以将【考研英语一真题库.app】拖入右侧【Applications (应用程序)】文件夹，即可永久常驻 Dock 程序坞或 Launchpad 启动台！
3. 若系统提示“未知的开发者”或已损坏，请在访达中右键点击该应用并选择【打开】，或在终端运行：
   xattr -cr /Applications/考研英语一真题库.app

【停止服务】
直接关闭浏览器或退出应用窗口即可。
"""

    if shutil.which('hdiutil'):
        # Native macOS high-compatibility DMG build using hdiutil
        staging_dir = os.path.join(root_dir, 'dmg_staging')
        if os.path.exists(staging_dir):
            shutil.rmtree(staging_dir)
        os.makedirs(staging_dir, exist_ok=True)

        # Copy .app bundle preserving permissions
        shutil.copytree(app_bundle, os.path.join(staging_dir, '考研英语一真题库.app'), symlinks=True)
        # Create genuine Applications symlink
        os.symlink('/Applications', os.path.join(staging_dir, 'Applications'))
        # Add Readme
        with open(os.path.join(staging_dir, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
            f.write(dmg_readme)

        # Ensure executable bit on app_launcher in staging
        stg_launcher = os.path.join(staging_dir, '考研英语一真题库.app', 'Contents', 'MacOS', 'app_launcher')
        if os.path.exists(stg_launcher):
            os.chmod(stg_launcher, 0o755)

        cmd = [
            'hdiutil', 'create',
            '-volname', '考研英语一真题库',
            '-srcfolder', staging_dir,
            '-ov',
            '-format', 'UDZO',
            '-imagekey', 'zlib-level=9',
            dmg_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        shutil.rmtree(staging_dir, ignore_errors=True)

        if res.returncode != 0:
            print(f"hdiutil error: {res.stderr}")
            raise RuntimeError(f"Failed to create DMG: {res.stderr}")
        print(f"Successfully generated macOS DMG at {dmg_path} (Size: {os.path.getsize(dmg_path):,} bytes) via hdiutil!")
    else:
        # Cross-platform fallback using pycdlib if available
        try:
            import pycdlib
            iso = pycdlib.PyCdlib()
            iso.new(udf='2.60', vol_ident='KaoyanEnglish')
            try:
                iso.add_symlink(udf_symlink_path='/Applications', udf_target='/Applications')
            except Exception:
                pass
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
                    except Exception:
                        pass
            readme_temp = os.path.join(root_dir, 'temp_dmg_readme.txt')
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
            print(f"Successfully generated DMG fallback at {dmg_path} (Size: {os.path.getsize(dmg_path):,} bytes)!")
        except Exception as e:
            print(f"Warning: Could not build DMG on non-macOS host: {e}")

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
                zinfo.date_time = (2026, 8, 17, 12, 0, 0)
                
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

    print(f"Successfully generated offline zip at {zip_path} (Size: {os.path.getsize(zip_path):,} bytes)!")

if __name__ == '__main__':
    build_offline_package()
