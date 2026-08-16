#!/usr/bin/env python3
import os
import sys
import webbrowser
import urllib.parse
from http.server import SimpleHTTPRequestHandler
import socket
import time

try:
    from http.server import ThreadingHTTPServer as BaseServer
except ImportError:
    from socketserver import ThreadingMixIn
    from http.server import HTTPServer
    class BaseServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True

PORT = 8085
URL = f"http://127.0.0.1:{PORT}"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, 'dist') if os.path.isdir(os.path.join(ROOT_DIR, 'dist')) else ROOT_DIR
DATA_DIR = os.path.join(ROOT_DIR, 'public', 'data') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'data')) else os.path.join(ROOT_DIR, 'data')
IMAGES_DIR = os.path.join(ROOT_DIR, 'public', 'images') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'images')) else os.path.join(ROOT_DIR, 'images')
THUMBS_DIR = os.path.join(ROOT_DIR, 'public', 'thumbs') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'thumbs')) else os.path.join(ROOT_DIR, 'thumbs')
ICONS_DIR = os.path.join(ROOT_DIR, 'public', 'icons') if os.path.isdir(os.path.join(ROOT_DIR, 'public', 'icons')) else os.path.join(ROOT_DIR, 'icons')

class CustomHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def address_string(self):
        # Override to prevent reverse DNS lookup delay on Windows
        return self.client_address[0]

    def translate_path(self, path):
        raw_path = path.split('?', 1)[0].split('#', 1)[0]
        decoded = urllib.parse.unquote(raw_path)
        
        # Explicit root index.html mapping to prevent directory listing
        if decoded in ['', '/', '/index.html']:
            idx_in_dist = os.path.join(DIST_DIR, 'index.html')
            if os.path.exists(idx_in_dist):
                return idx_in_dist
            idx_in_root = os.path.join(ROOT_DIR, 'index.html')
            if os.path.exists(idx_in_root):
                return idx_in_root

        # Map /icons/* -> ICONS_DIR
        if decoded.startswith('/icons/') and os.path.isdir(ICONS_DIR):
            rel = decoded[7:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(ICONS_DIR, rel)
        if decoded.startswith('icons/') and os.path.isdir(ICONS_DIR):
            rel = decoded[6:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(ICONS_DIR, rel)

        # Fallback root icons -> ICONS_DIR
        if decoded.lstrip('/') in ['favicon.ico', 'favicon.png', 'favicon.svg', 'apple-touch-icon.png', 'manifest.json', 'icon-192.png', 'icon-512.png', 'vite.svg'] and os.path.isdir(ICONS_DIR):
            return os.path.join(ICONS_DIR, decoded.lstrip('/'))

        # Map /data/* -> DATA_DIR
        if decoded.startswith('/data/') and os.path.isdir(DATA_DIR):
            rel = decoded[6:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(DATA_DIR, rel)
        if decoded.startswith('data/') and os.path.isdir(DATA_DIR):
            rel = decoded[5:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(DATA_DIR, rel)
            
        # Map /images/* -> IMAGES_DIR
        if decoded.startswith('/images/') and os.path.isdir(IMAGES_DIR):
            rel = decoded[8:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(IMAGES_DIR, rel)
        if decoded.startswith('images/') and os.path.isdir(IMAGES_DIR):
            rel = decoded[7:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(IMAGES_DIR, rel)

        # Map /thumbs/* -> THUMBS_DIR
        if decoded.startswith('/thumbs/') and os.path.isdir(THUMBS_DIR):
            rel = decoded[8:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(THUMBS_DIR, rel)
        if decoded.startswith('thumbs/') and os.path.isdir(THUMBS_DIR):
            rel = decoded[7:].replace('/', os.sep).replace('\\', os.sep)
            return os.path.join(THUMBS_DIR, rel)

        return super().translate_path(path)

    def end_headers(self):
        p = self.path.lower().split('?')[0]
        if p.endswith(('.png', '.svg', '.jpg', '.jpeg', '.webp', '.ico', '.woff2', '.woff', '.json', '.js', '.css')):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-cache, must-revalidate")
            
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        pass

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def open_in_browser(url):
    try:
        if sys.platform == 'darwin':
            os.system(f'open "{url}" &')
        else:
            webbrowser.open(url)
    except Exception:
        try:
            webbrowser.open(url)
        except Exception:
            pass

def main():
    print("=" * 60)
    print("      考研英语一真题库 (2010-2026) - 高性能多线程服务器")
    print("=" * 60)
    print(f"前端根目录: {DIST_DIR}")
    print(f"题库数据目录: {DATA_DIR}")
    print(f"访问地址: {URL}")
    print("提示：直接关闭本命令行窗口即可自动停止服务。")
    print("-" * 60)

    if is_port_in_use(PORT):
        print(f"[提示] 服务已在端口 {PORT} 正常运行中，正在为您打开浏览器...")
        open_in_browser(URL)
        return

    server_address = ('127.0.0.1', PORT)
    try:
        httpd = BaseServer(server_address, CustomHandler)
    except Exception as e:
        print(f"[错误] 绑定端口 {PORT} 失败: {e}")
        return

    print(f"[成功] 多线程并发引擎已就绪！正在为您自动弹出浏览器: {URL}")
    print("=" * 60)
    
    open_in_browser(URL)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("\n服务已停止。")

if __name__ == '__main__':
    main()
