import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("--- 1. Sentence structure in 2025-t1 ---")
p1 = get_json("https://yanbrick.com/api/passages/en1/2025-t1")
s0 = p1['sentences'][0]
print("Sentence keys:", list(s0.keys()))
print("Sentence sample:", json.dumps(s0, ensure_ascii=False, indent=2))

print("\n--- 2. Paraphrase API pagination & questions ---")
para1 = get_json("https://yanbrick.com/api/paraphrase?exam=en1&limit=20&offset=0")
print("Para keys:", list(para1.keys()), "items length:", len(para1.get('items', [])))
if para1.get('items'):
    print("Para item[0]:", json.dumps(para1['items'][0], ensure_ascii=False, indent=2))

print("\n--- 3. Phrases API check ---")
phr1 = get_json("https://yanbrick.com/api/phrases?limit=100&offset=0")
print("Phrases needLogin:", phr1.get('needLogin'), "items len:", len(phr1.get('items', [])))
phr2 = get_json("https://yanbrick.com/api/phrases?limit=3000&offset=0")
print("Phrases with limit 3000 len:", len(phr2.get('items', [])))

print("\n--- 4. Reading Questions answers ---")
rq = get_json("https://yanbrick.com/api/reading-questions?exam=en1&key=2025-t1")
print("Reading questions sample[0]:", json.dumps(rq[0], ensure_ascii=False, indent=2))

