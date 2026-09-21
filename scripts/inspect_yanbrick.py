import urllib.request
import re
import json

def main():
    url = 'https://yanbrick.com/assets/EnglishApp-cqbpZlJ4.js'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
    print('Fetched EnglishApp bundle, length:', len(content))

    # Look for routes or router definition
    # Often React Router has path: "..." or Route path="..."
    route_matches = re.findall(r'path:\s*["\']([^"\']+)["\']', content)
    print('Route paths (path: "..."):', json.dumps(list(set(route_matches)), ensure_ascii=False, indent=2))

    # Look for all /english/... strings
    eng_urls = set(re.findall(r'["\'](/english[^"\']*)["\']', content))
    print('/english urls:', json.dumps(sorted(list(eng_urls)), ensure_ascii=False, indent=2))

    # Look for all /api/... strings
    api_urls = set(re.findall(r'["\'](/api[^"\']*)["\']', content))
    print('/api endpoints:', json.dumps(sorted(list(api_urls)), ensure_ascii=False, indent=2))

    # Also search for chunk imports (assets/*.js)
    chunks = set(re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', content))
    print('Dynamic imported chunks:', json.dumps(sorted(list(chunks)), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
