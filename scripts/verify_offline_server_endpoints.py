import os
import sys
import subprocess
import time
import urllib.request
import json

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def test_offline_package():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    offline_dir = os.path.join(root, 'kaoyan-english-offline')

    print(f"Testing offline package at: {offline_dir}")

    # Launch server.py inside kaoyan-english-offline
    proc = subprocess.Popen(
        [sys.executable, 'server.py'],
        cwd=offline_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    time.sleep(2)
    base_url = "http://localhost:8085"

    endpoints_to_test = [
        ("/", "text/html"),
        ("/manifest.json", "application/json"),
        ("/favicon.png", "image/png"),
        ("/apple-touch-icon.png", "image/png"),
        ("/icon-192.png", "image/png"),
        ("/icon-512.png", "image/png"),
        ("/data/papers_by_type.json", "application/json"),
        ("/data/kaoyan1_dict.json", "application/json"),
        ("/data/2024.json", "application/json"),
        ("/data/tasks/201401001.json", "application/json"),
        ("/thumbs/202401001.png", "image/png"),
    ]

    all_passed = True
    for ep, expected_type in endpoints_to_test:
        url = base_url + ep
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'TestClient/1.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                status = resp.status
                ct = resp.headers.get('Content-Type', '')
                content = resp.read()
                size = len(content)
                if status == 200 and size > 0:
                    print(f"  ✅ [PASS] {ep:30} -> HTTP 200 ({size} bytes, type: {ct})")
                else:
                    print(f"  ❌ [FAIL] {ep:30} -> Status {status}, size {size}")
                    all_passed = False
        except Exception as e:
            print(f"  ❌ [ERROR] {ep:30} -> {e}")
            all_passed = False

    proc.terminate()
    try:
        proc.wait(timeout=2)
    except Exception:
        proc.kill()

    if all_passed:
        print("\n🎉 ALL ENDPOINTS IN OFFLINE PACKAGE TESTED AND PASSED 100%!")
    else:
        print("\n❌ SOME ENDPOINTS FAILED!")
        sys.exit(1)

if __name__ == '__main__':
    test_offline_package()
