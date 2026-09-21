import urllib.request
import re

def inspect_chunk(name):
    url = f"https://yanbrick.com/{name}"
    content = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    print(f"=== {name} (length {len(content)}) ===")
    apis = set(re.findall(r'["\'](/api/[^"\']+)["\']', content))
    print("APIs:", apis)
    # search for fetch or api calls
    for m in re.finditer(r'/api/[a-zA-Z0-9_\-\/]+', content):
        start = max(0, m.start() - 50)
        end = min(len(content), m.end() + 100)
        print("  Snippet:", content[start:end])

inspect_chunk("assets/Phrases-Dvt3KrJ3.js")
inspect_chunk("assets/phraseStore-BoifkKTy.js")
inspect_chunk("assets/Paraphrase-Bzxx5UQX.js")
inspect_chunk("assets/SentenceTree-DXYmSW_v.js")
