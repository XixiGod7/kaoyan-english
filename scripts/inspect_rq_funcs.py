import urllib.request
import re

c = urllib.request.urlopen(urllib.request.Request('https://yanbrick.com/assets/EnglishApp-cqbpZlJ4.js', headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')

for name in ['bn', 'gn', 'jn', 'wn']:
    m = re.search(rf'function {name}\b|\bconst {name}\s*=', c)
    if m:
        start = m.start()
        print(f"=== {name} ===")
        print(c[start:start+350])
    else:
        print(f"{name} not found")
