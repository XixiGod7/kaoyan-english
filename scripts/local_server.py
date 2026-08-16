import os
import json
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Root is one level up from scripts
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, 'public', 'data')

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # We serve from the ROOT_DIR normally, but translate_path will map correctly
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def translate_path(self, path):
        # Strip query string and fragments
        path = path.split('?', 1)[0].split('#', 1)[0]

        # Map /data/* to public/data/*
        if path.startswith('/data/'):
            # e.g. path = /data/2024.json
            relative = path[6:] # strip /data/
            return os.path.join(PUBLIC_DATA_DIR, relative)
        
        # Default behavior serves from DIST_DIR
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path == '/api/create_shortcut':
            try:
                import subprocess
                if sys.platform == 'win32':
                    script = os.path.join(ROOT_DIR, 'scripts', 'create_shortcut.py')
                    subprocess.run([sys.executable, script], check=True)
                    msg = "🎉 成功在 Windows 桌面上创建了【考研英语真题刷题系统】独立应用快捷方式！"
                else:
                    msg = "🎉 已在项目根目录下准备好【一键启动_Mac.command】，在 Finder 中双击即可极速启动！"

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": msg}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
            return

        if clean_path == '/api/save_article':
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "Empty payload")
                return


            body = self.rfile.read(content_length).decode('utf-8')
            print(f"Incoming POST /api/save_article body: {body}")
            try:
                payload = json.loads(body)
                year = payload.get('year')
                sec_key = payload.get('sectionKey')
                text_num = payload.get('textNum') # Optional, for reading-a
                new_article = payload.get('article')

                if not year or not sec_key:
                    print("Error 400: Missing year or sectionKey"); self.send_error(400, "Missing year or sectionKey")
                    return

                json_path = os.path.join(PUBLIC_DATA_DIR, f"{str(year)}.json")
                if not os.path.exists(json_path):
                    print("Error 404: JSON file not found"); self.send_error(404, "JSON file not found")
                    return

                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if sec_key not in data['sections']:
                    print("Error 404: Section not found"); self.send_error(404, "Section not found")
                    return

                sec = data['sections'][sec_key]

                if text_num is not None:
                    # It's a text group (like reading-a)
                    found = False
                    if 'texts' in sec:
                        for tg in sec['texts']:
                            if str(tg['text_num']) == str(text_num):
                                if new_article is not None:
                                    tg['article'] = new_article
                                if 'questions' in payload:
                                    tg['questions'] = payload['questions']
                                found = True
                                break
                    if not found:
                        print("Error 404: Text group not found"); self.send_error(404, "Text group not found")
                        return
                else:
                    # Single article section
                    if new_article is not None:
                        sec['article'] = new_article
                    if 'questions' in payload:
                        sec['questions'] = payload['questions']

                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))


            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_error(500, f"Internal error: {str(e)}")
        else:
            self.send_error(404, "Endpoint not found")

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print("========================================================")
    print("       Kaoyan English Local Server (With Edit API)      ")
    print("========================================================")
    print(f"Serving from: {DIST_DIR}")
    print(f"Data mapping: /data -> {PUBLIC_DATA_DIR}")
    print(f"Listening on port: {port}")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("\nServer stopped.")
