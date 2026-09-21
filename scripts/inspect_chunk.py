import urllib.request
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://yanbrick.com/assets/EnglishApp-cqbpZlJ4.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    content = resp.read().decode('utf-8', errors='ignore')

# Find all occurrences of /api/
apis = re.findall(r'(/api/[^"\'`\s\)]+)', content)
print("Unique APIs in EnglishApp:", json.dumps(sorted(list(set(apis))), ensure_ascii=False, indent=2))

# Let's inspect paraphrase API logic in EnglishApp
for m in re.finditer(r'/api/paraphrase', content):
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 200)
    print("Context around /api/paraphrase:\n", content[start:end])
