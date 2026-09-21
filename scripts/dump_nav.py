import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://yanbrick.com/assets/EnglishApp-cqbpZlJ4.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    content = resp.read().decode('utf-8', errors='ignore')

# Search for the nav items array
# Look for pattern around "label:" and "to:"
matches = re.findall(r'\{[^{}]*(?:label|title|to):[^{}]*\}', content)
print(f"Total objects with label/title/to: {len(matches)}")
for m in matches:
    if '/english' in m or 'label' in m:
        print(m)
