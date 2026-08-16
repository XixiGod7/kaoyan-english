import os
import json
import urllib.request
import time

BASE_URL = "https://zhentiqiang.com/kaoyan/english1"
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
TASKS_DIR = os.path.join(PUBLIC_DATA_DIR, "tasks")
PAPERS_DIR = os.path.join(PUBLIC_DATA_DIR, "papers")

os.makedirs(TASKS_DIR, exist_ok=True)
os.makedirs(PAPERS_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://zhentiqiang.com/kaoyan/english1/",
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def main():
    print("=== Scraping All Task Details ===")
    papers_type_path = os.path.join(PUBLIC_DATA_DIR, "papers_by_type.json")
    if not os.path.exists(papers_type_path):
        print("papers_by_type.json not found!")
        return

    with open(papers_type_path, "r", encoding="utf-8") as f:
        papers_data = json.load(f)

    # Collect all task ids grouped by year
    year_tasks_map = {}
    all_task_ids = []

    for group in papers_data:
        raw_year = group.get("name") or group.get("id")
        clean_year = raw_year.replace("(1)", "").strip()
        year_tasks_map[clean_year] = []

        for q in group.get("questions", []):
            tid = q.get("id")
            if tid:
                all_task_ids.append(tid)
                year_tasks_map[clean_year].append(q)

    print(f"Total tasks to fetch: {len(all_task_ids)}")

    # Step 1: Download each task json
    task_cache = {}
    for idx, tid in enumerate(all_task_ids, 1):
        out_path = os.path.join(TASKS_DIR, f"{tid}.json")
        if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
            with open(out_path, "r", encoding="utf-8") as tf:
                try:
                    task_cache[tid] = json.load(tf)
                    continue
                except:
                    pass

        url = f"{BASE_URL}/api/tasks?id={tid}"
        print(f"[{idx}/{len(all_task_ids)}] Fetching task {tid}...")
        data_bytes = fetch_url(url)
        if data_bytes:
            try:
                task_obj = json.loads(data_bytes.decode("utf-8"))
                with open(out_path, "w", encoding="utf-8") as tf:
                    json.dump(task_obj, tf, ensure_ascii=False, indent=2)
                task_cache[tid] = task_obj
            except Exception as e:
                print(f"Failed to parse task {tid}: {e}")
        time.sleep(0.05)

    # Step 2: Assemble yearly paper JSON bundle for lightning-fast frontend loading
    print("\n=== Assembling Yearly Paper Bundles ===")
    for year, q_list in year_tasks_map.items():
        year_bundle = {
            "year": year,
            "tasks": []
        }
        for q_meta in q_list:
            tid = q_meta.get("id")
            task_obj = task_cache.get(tid)
            if task_obj and "tasks" in task_obj and len(task_obj["tasks"]) > 0:
                task_detail = task_obj["tasks"][0]
                year_bundle["tasks"].append({
                    "meta": q_meta,
                    "detail": task_detail
                })

        out_bundle_path = os.path.join(PAPERS_DIR, f"{year}.json")
        with open(out_bundle_path, "w", encoding="utf-8") as bf:
            json.dump(year_bundle, bf, ensure_ascii=False, indent=2)
        print(f"Saved paper bundle {year}.json ({len(year_bundle['tasks'])} tasks).")

    print("\n=== All Tasks Scraped and Paper Bundles Generated! ===")

if __name__ == "__main__":
    main()
