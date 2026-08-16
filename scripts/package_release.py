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

    # 6. Create instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整离线运行包
============================================================

【Windows 系统运行方法】
直接双击运行【一键启动考研英语.bat】，系统将自动在浏览器中打开。

【Mac 系统运行方法】
方式 A（推荐）：
1. 打开 Mac【终端】(Terminal)；
2. 执行以下命令为脚本赋予运行权限：
   chmod +x 一键启动_Mac.command 停止服务_Mac.command
3. 以后直接在访达中双击【一键启动_Mac.command】即可极速启动！

方式 B（终端直接运行）：
在终端中进入本文件夹，直接输入：
   python3 server.py
回车即可自动在浏览器中打开。

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
                
                # Check if it's a .command file
                zinfo = zipfile.ZipInfo.from_file(file_path, arcname)
                if file.endswith('.command') or file.endswith('.sh'):
                    # Set Unix permission to 0755 (-rwxr-xr-x)
                    zinfo.external_attr = (0o755 << 16) | 0x20
                else:
                    zinfo.external_attr = (0o644 << 16) | 0x20
                
                with open(file_path, 'rb') as fp:
                    zipf.writestr(zinfo, fp.read())

    print(f"Successfully generated complete offline zip at {zip_path}!")

if __name__ == '__main__':
    build_offline_package()
