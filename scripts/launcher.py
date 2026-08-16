import os
import sys
import time
import subprocess
import webbrowser
import urllib.request
import socket

# Set Windows console to UTF-8 to prevent any garbled characters
if sys.platform == 'win32':
    try:
        os.system('chcp 65001 >nul')
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8085
URL = f"http://localhost:{PORT}"
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def is_server_responding(url, timeout=1.0):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status == 200
    except Exception:
        return False

def open_browser():
    print(f"\n[3/3] 正在为您自动弹出浏览器: {URL}")
    try:
        webbrowser.open(URL, new=2)
    except Exception:
        if sys.platform == 'win32':
            os.system(f'start "" "{URL}"')

def main():
    print("=" * 60)
    print("      考研英语一真题刷题系统 - 智能极速启动器")
    print("=" * 60)
    print(f"工作目录: {ROOT_DIR}")
    print(f"服务端口: {PORT}")
    print(f"访问地址: {URL}")
    print("-" * 60)

    # 1. Check if server is already running
    if is_port_in_use(PORT):
        print(f"[提示] 检测到服务已在端口 {PORT} 正常运行！")
        open_browser()
        print("\n[成功] 考研英语系统已在浏览器中打开！")
        time.sleep(2)
        return

    # 2. Launch Vite dev server
    print("[1/3] 正在启动题库后台服务 (npm run dev)...")
    
    cmd = f'npm run dev -- --port {PORT} --host'
    try:
        subprocess.Popen(
            cmd,
            shell=True,
            cwd=ROOT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
        )
    except Exception as e:
        print(f"[警告] 启动命令执行失败: {e}")

    # 3. Wait until server responds with 200 OK
    print("[2/3] 正在等待服务就绪...", end="", flush=True)
    ready = False
    for _ in range(30):
        time.sleep(0.5)
        print(".", end="", flush=True)
        if is_server_responding(URL):
            ready = True
            break

    print("")
    if ready:
        print("[2/3] 服务已就绪！")
        open_browser()
        print("\n" + "=" * 60)
        print("  [启动成功] 考研英语真题刷题系统已在浏览器中打开。")
        print("  [提示] 如需关闭后台服务，双击运行【停止服务.bat】即可。")
        print("=" * 60)
    else:
        print("\n[提示] 正在直接拉起浏览器...")
        open_browser()

    time.sleep(3)

if __name__ == '__main__':
    main()
