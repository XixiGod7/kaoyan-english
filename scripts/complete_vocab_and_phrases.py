import urllib.request
import json
import os
import sys
import time
import string

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://yanbrick.com"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

def complete_vocab_stats():
    print("Completing vocab stats (all 3149 words)...")
    all_words = []
    limit = 1000
    offset = 0
    while True:
        url = f"{BASE_URL}/api/vocab/stats?exam=en1&scope=reading&syllabusOnly=true&limit={limit}&offset={offset}"
        data = fetch_json(url)
        if not data:
            break
        all_words.extend(data)
        print(f"  Vocab offset {offset}: got {len(data)}, total so far: {len(all_words)}")
        offset += len(data)
        if len(data) < limit:
            break
        time.sleep(0.1)

    vocab_file = os.path.join(DATA_DIR, "vocab_stats", "vocab_stats_all.json")
    with open(vocab_file, 'w', encoding='utf-8') as f:
        json.dump(all_words, f, ensure_ascii=False, indent=2)
    print(f"Vocab stats completed: {len(all_words)} words saved to {vocab_file}")

def complete_phrases():
    print("\nCompleting phrases (up to 2540)...")
    phrases_file = os.path.join(DATA_DIR, "phrases", "phrases_all.json")
    with open(phrases_file, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    existing_items = {item['en']: item for item in existing.get('items', [])}
    print(f"Current phrases: {len(existing_items)} / 2540")
    
    # 2-letter search for missing phrases in 'other'
    letters = string.ascii_lowercase
    pairs = [c1 + c2 for c1 in letters for c2 in letters]
    
    for pair in pairs:
        if len(existing_items) >= 2540:
            break
        url = f"{BASE_URL}/api/phrases?part=other&q={pair}&limit=100"
        try:
            data = fetch_json(url)
            items = data.get('items', []) if data else []
            new_added = 0
            for it in items:
                if it['en'] not in existing_items:
                    existing_items[it['en']] = it
                    new_added += 1
            if new_added > 0:
                print(f"  pair '{pair}': added {new_added}, total: {len(existing_items)}/2540")
            time.sleep(0.02)
        except Exception:
            pass

    # Save final
    final_list = sorted(list(existing_items.values()), key=lambda x: (x.get('part', ''), x.get('en', '')))
    existing['items'] = final_list
    existing['total'] = len(final_list)
    with open(phrases_file, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"Phrases complete: {len(final_list)} saved to {phrases_file}")

if __name__ == '__main__':
    complete_vocab_stats()
    complete_phrases()
