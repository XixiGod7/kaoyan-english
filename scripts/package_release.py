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
    
    # 3. Copy clean launchers (Only 1 bat and 1 command)
    shutil.copy2(os.path.join(root_dir, '一键启动考研英语.bat'), os.path.join(out_dir, '一键启动考研英语.bat'))
    shutil.copy2(os.path.join(root_dir, '一键启动_Mac.command'), os.path.join(out_dir, '一键启动_Mac.command'))

    # 4. Copy icons folder (all icons, favicon, manifest neatly inside icons/)
    icons_src = os.path.join(root_dir, 'public', 'icons')
    if os.path.exists(icons_src):
        shutil.copytree(icons_src, os.path.join(out_dir, 'icons'))

    # 5. Copy data
    shutil.copytree(os.path.join(root_dir, 'public', 'data'), os.path.join(out_dir, 'data'))

    # 6. Copy images and thumbs if exist
    img_dir = os.path.join(root_dir, 'public', 'images')
    if os.path.exists(img_dir):
        shutil.copytree(img_dir, os.path.join(out_dir, 'images'))

    thumb_dir = os.path.join(root_dir, 'public', 'thumbs')
    if os.path.exists(thumb_dir):
        shutil.copytree(thumb_dir, os.path.join(out_dir, 'thumbs'))

    # 7. Create clean instructions text
    instructions = """============================================================
考研英语一真题库 (2010-2026) - 完整运行包
============================================================

【Windows 系统运行方法】
直接双击运行【一键启动考研英语.bat】，系统将自动启动服务并弹出浏览器。

【Mac 系统运行方法】
直接双击运行【一键启动_Mac.command】，系统将自动启动服务并弹出浏览器。
（或在 Mac 终端中运行：python3 server.py）

【停止服务】
直接关闭打开的命令行/终端黑色窗口，服务即会自动停止。
"""
    with open(os.path.join(out_dir, '使用说明.txt'), 'w', newline='\r\n', encoding='utf-8') as f:
        f.write(instructions)

    # 8. Zip with Unix POSIX executable permissions and UTF-8 flag preserved!
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
                zinfo.date_time = (2026, 8, 16, 20, 0, 0)
                
                is_exec = file.endswith('.command') or file.endswith('.sh') or file.endswith('.py') or file.endswith('.bat')
                if is_exec:
                    zinfo.external_attr = (0o100755 << 16) | 0x20
                else:
                    zinfo.external_attr = (0o100644 << 16) | 0x20
                
                with open(file_path, 'rb') as fp:
                    content = fp.read()
                    # Ensure Unix scripts strictly have LF line endings (strip \r)
                    if file.endswith(('.command', '.sh', '.py')):
                        content = content.replace(b'\r\n', b'\n')
                    zipf.writestr(zinfo, content)

    print(f"Successfully generated clean offline zip at {zip_path}!")

if __name__ == '__main__':
    build_offline_package()
