import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer
import socket
import time

PORT = 8085
URL = f"http://localhost:{PORT}"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, 'dist') if os.path.isdir(os.path.join(ROOT_DIR, 'dist')) else ROOT_DIR
DATA_DIR = os.path.join(ROOT_DIR, 'public', 'data') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'data')) else os.path.join(ROOT_DIR, 'data')
IMAGES_DIR = os.path.join(ROOT_DIR, 'public', 'images') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'images')) else os.path.join(ROOT_DIR, 'images')
THUMBS_DIR = os.path.join(ROOT_DIR, 'public', 'thumbs') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'thumbs')) else os.path.join(ROOT_DIR, 'thumbs')

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def translate_path(self, path):
        path = path.split('?', 1)[0].split('#', 1)[0]
        
        # Map /data/* -> DATA_DIR
        if path.startswith('/data/') and os.path.isdir(DATA_DIR):
            return os.path.join(DATA_DIR, path[6:])
        if path.startswith('data/') and os.path.isdir(DATA_DIR):
            return os.path.join(DATA_DIR, path[5:])
            
        # Map /images/* -> IMAGES_DIR
        if path.startswith('/images/') and os.path.isdir(IMAGES_DIR):
            return os.path.join(IMAGES_DIR, path[8:])
        if path.startswith('images/') and os.path.isdir(IMAGES_DIR):
            return os.path.join(IMAGES_DIR, path[7:])

        # Map /thumbs/* -> THUMBS_DIR
        if path.startswith('/thumbs/') and os.path.isdir(THUMBS_DIR):
            return os.path.join(THUMBS_DIR, path[8:])
        if path.startswith('thumbs/') and os.path.isdir(THUMBS_DIR):
            return os.path.join(THUMBS_DIR, path[7:])

        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def main():
    print("=" * 60)
    print("      考研英语一真题库 - 智能轻量本地服务器")
    print("=" * 60)
    print(f"站点根目录: {DIST_DIR}")
    print(f"数据目录: {DATA_DIR}")
    print(f"访问地址: {URL}")
    print("-" * 60)

    if is_port_in_use(PORT):
        print(f"[提示] 服务已在端口 {PORT} 运行，正在打开浏览器...")
        webbrowser.open(URL)
        return

    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"[成功] 服务已就绪！正在为您自动打开浏览器: {URL}")
    
    try:
        webbrowser.open(URL)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("\n服务已停止。")

if __name__ == '__main__':
    main()
