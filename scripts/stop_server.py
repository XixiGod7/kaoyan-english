import os
import sys
import subprocess

if sys.platform == 'win32':
    try:
        os.system('chcp 65001 >nul')
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8085

def stop_server():
    print("=" * 60)
    print("      考研英语一真题刷题系统 - 停止后台服务")
    print("=" * 60)

    found_pids = set()
    try:
        output = subprocess.check_output(f'netstat -ano | findstr ":{PORT}"', shell=True).decode('utf-8', errors='ignore')
        for line in output.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and f":{PORT}" in parts[1]:
                pid = parts[-1]
                if pid.isdigit() and int(pid) > 0:
                    found_pids.add(pid)
    except Exception:
        pass

    if found_pids:
        for pid in found_pids:
            print(f"正在关闭占用端口 {PORT} 的后台进程 (PID: {pid})...")
            try:
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        print(f"\n[成功] 考研英语后台服务 (端口 {PORT}) 已安全关闭！")
    else:
        print(f"\n[提示] 端口 {PORT} 当前没有正在运行的服务。")

    print("=" * 60)

if __name__ == '__main__':
    stop_server()
