import urllib.request
import urllib.parse
import json
import os
import sys
import time
import re
import string

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://yanbrick.com"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
}

def clean_branding(obj):
    """Recursively clean any mentions of 研砖 or 英砖 from strings."""
    if isinstance(obj, str):
        # Replace brand mentions
        s = obj.replace("研砖考研", "考研英语系统").replace("研砖", "").replace("英砖", "")
        s = re.sub(r'公众号[「“].*?[」”]', '', s)
        s = re.sub(r'去\s*反馈广场.*', '', s)
        return s
    elif isinstance(obj, list):
        return [clean_branding(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: clean_branding(v) for k, v in obj.items()}
    return obj

def fetch_json(url, data=None, max_retries=3):
    post_bytes = json.dumps(data).encode('utf-8') if data is not None else None
    req_headers = HEADERS.copy()
    if data is not None:
        req_headers['Content-Type'] = 'application/json'

    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, data=post_bytes, headers=req_headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8')
                parsed = json.loads(raw)
                return clean_branding(parsed)
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Error fetching {url} after {max_retries} attempts: {e}")
                return None
            time.sleep(1 + attempt * 0.5)

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def scrape_passages():
    print("\n--- 1. Scraping Reading Passages (100 Texts, 2001-2025) ---")
    index_url = f"{BASE_URL}/api/passages?exam=en1"
    passages_index = fetch_json(index_url)
    if not passages_index:
        print("Failed to fetch passages index!")
        return False

    passages_dir = os.path.join(DATA_DIR, "reading", "passages")
    keywords_dir = os.path.join(DATA_DIR, "reading", "keywords")
    questions_dir = os.path.join(DATA_DIR, "reading", "questions")
    save_json(os.path.join(DATA_DIR, "reading", "index.json"), passages_index)

    print(f"Total passages to fetch: {len(passages_index)}")
    for i, p in enumerate(passages_index):
        key = p['key'] # e.g. "2025-t1"
        year = p['year']
        text_no = p['text_no']
        
        # 1. Detail (sentences with syntax tree, paragraphs, text)
        p_file = os.path.join(passages_dir, f"{key}.json")
        if not os.path.exists(p_file):
            p_data = fetch_json(f"{BASE_URL}/api/passages/en1/{key}")
            if p_data:
                save_json(p_file, p_data)
        
        # 2. Keywords (words & phrases)
        kw_file = os.path.join(keywords_dir, f"{key}.json")
        if not os.path.exists(kw_file):
            kw_data = fetch_json(f"{BASE_URL}/api/passages/en1/{key}/keywords")
            if kw_data:
                save_json(kw_file, kw_data)

        # 3. Reading questions
        q_file = os.path.join(questions_dir, f"{key}.json")
        if not os.path.exists(q_file):
            q_data = fetch_json(f"{BASE_URL}/api/reading-questions?exam=en1&key={key}")
            if q_data:
                save_json(q_file, q_data)

        if (i + 1) % 10 == 0 or (i + 1) == len(passages_index):
            print(f"  Processed {i + 1}/{len(passages_index)} passages ({key})...")
        time.sleep(0.05)

    print("Passages scraping completed!")
    return True

def scrape_grammar():
    print("\n--- 2. Scraping Grammar Sentences (2009 rows) ---")
    grammar_file = os.path.join(DATA_DIR, "grammar", "grammar_all.json")
    if os.path.exists(grammar_file):
        with open(grammar_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
            if existing.get('total') == 2009 and len(existing.get('rows', [])) == 2009:
                print("Grammar data already complete (2009 rows). Skipping.")
                return True

    all_rows = []
    limit = 200
    offset = 0
    total = 2009
    cat_counts = {}

    while offset < total:
        url = f"{BASE_URL}/api/grammar?exam=en1&limit={limit}&offset={offset}"
        data = fetch_json(url)
        if not data or 'rows' not in data:
            print(f"Error fetching grammar at offset {offset}")
            break
        rows = data['rows']
        total = data.get('total', 2009)
        cat_counts = data.get('catCounts', cat_counts)
        all_rows.extend(rows)
        print(f"  Fetched grammar rows {offset} to {offset + len(rows)} / {total}...")
        offset += len(rows)
        if len(rows) == 0:
            break
        time.sleep(0.1)

    result = {
        'total': len(all_rows),
        'catCounts': cat_counts,
        'rows': all_rows
    }
    save_json(grammar_file, result)
    print(f"Grammar scraping completed: {len(all_rows)} rows saved to {grammar_file}")
    return True

def scrape_paraphrase():
    print("\n--- 3. Scraping Paraphrase Drill (200 questions + answers + translations) ---")
    para_file = os.path.join(DATA_DIR, "paraphrase", "paraphrase_all.json")
    
    all_items = []
    limit = 10
    offset = 0
    total = 200

    while offset < total:
        url = f"{BASE_URL}/api/paraphrase?exam=en1&limit={limit}&offset={offset}"
        data = fetch_json(url)
        if not data or 'items' not in data:
            print(f"Error fetching paraphrase at offset {offset}")
            break
        items = data['items']
        total = data.get('total', 200)
        
        # Now fetch answer and translation for each item
        for item in items:
            item_id = item['id']
            # Call check endpoint to get answer and translation
            check_url = f"{BASE_URL}/api/paraphrase/{urllib.parse.quote(item_id)}/check"
            # Send dummy choice 0 to get the answer
            chk = fetch_json(check_url, data={"choice": 0})
            if chk:
                item['answer'] = chk.get('answer', '')
                item['zh'] = chk.get('zh', '')
            all_items.append(item)
            time.sleep(0.05)

        print(f"  Fetched paraphrase items {offset} to {offset + len(items)} / {total} (with answers & zh)...")
        offset += len(items)
        if len(items) == 0:
            break
        time.sleep(0.1)

    result = {
        'exam': 'en1',
        'total': len(all_items),
        'items': all_items
    }
    save_json(para_file, result)
    print(f"Paraphrase scraping completed: {len(all_items)} questions saved to {para_file}")
    return True

def scrape_phrases():
    print("\n--- 4. Scraping Phrases (2540 Exam High-Frequency Phrases) ---")
    phrases_file = os.path.join(DATA_DIR, "phrases", "phrases_all.json")
    
    # First get parts metadata
    init_data = fetch_json(f"{BASE_URL}/api/phrases?limit=100")
    if not init_data:
        print("Failed to fetch initial phrases metadata!")
        return False

    parts_meta = init_data.get('parts', [])
    total_target = init_data.get('total', 2540)
    print(f"Found {len(parts_meta)} parts. Target total: {total_target} phrases.")

    all_phrases = {}

    # Query by parts with letter prefixes to bypass the 100 limit per query
    for part_info in parts_meta:
        k = part_info['k']
        count = part_info['n']
        print(f"  Fetching part '{k}' (expected ~{count})...")
        
        # Try direct fetch first
        data = fetch_json(f"{BASE_URL}/api/phrases?part={k}&limit=100")
        items = data.get('items', []) if data else []
        for it in items:
            all_phrases[it['en']] = it
            
        if count > 100:
            # Query with 26 letters
            for char in string.ascii_lowercase:
                p_data = fetch_json(f"{BASE_URL}/api/phrases?part={k}&q={char}&limit=100")
                if p_data and 'items' in p_data:
                    for it in p_data['items']:
                        all_phrases[it['en']] = it
                time.sleep(0.03)

        # Also fetch real exam sentences if marked
        time.sleep(0.05)

    print(f"  Phrases collected so far: {len(all_phrases)} / {total_target}")
    
    # If still below total, query across all with 2-letter combos
    if len(all_phrases) < total_target:
        print("  Querying missing phrases with alphabet prefixes...")
        for c1 in string.ascii_lowercase:
            data = fetch_json(f"{BASE_URL}/api/phrases?q={c1}&limit=100")
            if data and 'items' in data:
                for it in data['items']:
                    all_phrases[it['en']] = it
            time.sleep(0.03)

    final_list = sorted(list(all_phrases.values()), key=lambda x: (x.get('part', ''), x.get('en', '')))
    result = {
        'total': len(final_list),
        'parts': parts_meta,
        'items': final_list
    }
    save_json(phrases_file, result)
    print(f"Phrases scraping completed: {len(final_list)} phrases saved to {phrases_file}")
    return True

def scrape_translation():
    print("\n--- 5. Scraping Part C Translation (2001-2026) ---")
    trans_file = os.path.join(DATA_DIR, "translation", "translation_all.json")
    data = fetch_json(f"{BASE_URL}/api/trans?exam=en1")
    if data:
        save_json(trans_file, data)
        print(f"Translation scraping completed: {len(data)} years saved to {trans_file}")
        return True
    return False

def scrape_vocab_stats():
    print("\n--- 6. Scraping Syllabus Vocab Stats (3149 syllabus words) ---")
    vocab_file = os.path.join(DATA_DIR, "vocab_stats", "vocab_stats_all.json")
    url = f"{BASE_URL}/api/vocab/stats?exam=en1&scope=reading&syllabusOnly=true&limit=4000"
    data = fetch_json(url)
    if data:
        save_json(vocab_file, data)
        print(f"Vocab stats scraping completed: {len(data)} words saved to {vocab_file}")
        return True
    return False

def main():
    print("=================================================================")
    print("STARTING FULL EXAM 1 CONTENT SCRAPING (OFFLINE DATA PACK)")
    print("Zero branding, 100% complete syntax trees, grammar & drills")
    print("=================================================================")

    start_time = time.time()
    scrape_passages()
    scrape_grammar()
    scrape_paraphrase()
    scrape_phrases()
    scrape_translation()
    scrape_vocab_stats()
    
    elapsed = time.time() - start_time
    print(f"\nAll scraping tasks completed in {elapsed:.1f} seconds!")

if __name__ == '__main__':
    main()
