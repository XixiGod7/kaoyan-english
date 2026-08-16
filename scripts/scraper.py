import os
import json
import urllib.request
import urllib.parse
import time

BASE_URL = "https://zhentiqiang.com/kaoyan/english1"
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
PUBLIC_THUMBS_DIR = os.path.join(ROOT_DIR, "public", "thumbs")

os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)
os.makedirs(PUBLIC_THUMBS_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://zhentiqiang.com/kaoyan/english1/",
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def main():
    print("=== Step 1: Downloading API JSON data ===")
    
    endpoints = {
        "papers_by_type.json": f"{BASE_URL}/api/papers/by_type/kaoyan",
        "knowledge_points.json": f"{BASE_URL}/api/knowledge_points",
        "task_index.json": f"{BASE_URL}/api/task_index?exam_type=kaoyan",
        "kaoyan1_dict.json": f"{BASE_URL}/static/kaoyan1_dict.json",
    }
    
    for filename, url in endpoints.items():
        out_path = os.path.join(PUBLIC_DATA_DIR, filename)
        print(f"Fetching {filename} from {url}...")
        data = fetch_url(url)
        if data:
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"Saved {filename} ({len(data)} bytes).")
        else:
            print(f"Failed to fetch {filename}.")
        time.sleep(0.5)
        
    print("\n=== Step 2: Downloading Thumbnails ===")
    papers_path = os.path.join(PUBLIC_DATA_DIR, "papers_by_type.json")
    if os.path.exists(papers_path):
        with open(papers_path, "r", encoding="utf-8") as f:
            papers_data = json.load(f)
            
        thumbnail_ids = set()
        for group in papers_data:
            for q in group.get("questions", []):
                tid = q.get("thumbnail_id")
                if tid:
                    thumbnail_ids.add(tid)
                    
        print(f"Found {len(thumbnail_ids)} unique thumbnail IDs.")
        for tid in sorted(thumbnail_ids):
            thumb_name = f"{tid}.png"
            out_img_path = os.path.join(PUBLIC_THUMBS_DIR, thumb_name)
            if os.path.exists(out_img_path) and os.path.getsize(out_img_path) > 0:
                continue
            
            img_url = f"{BASE_URL}/static/thumbs/{thumb_name}"
            print(f"Downloading thumbnail {thumb_name}...")
            img_data = fetch_url(img_url)
            if img_data:
                with open(out_img_path, "wb") as f:
                    f.write(img_data)
            time.sleep(0.1)

    print("\n=== Scraper finished successfully! ===")

if __name__ == "__main__":
    main()
