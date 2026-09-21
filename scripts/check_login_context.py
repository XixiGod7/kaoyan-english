import urllib.request
import re

url = 'https://yanbrick.com/assets/EnglishApp-cqbpZlJ4.js'
content = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')

idx = content.find('function Q()')
print(content[max(0, idx-100):min(len(content), idx+200)])

# Find login flow: Tt, /api/login
idx_login = content.find('/api/login')
print("\nLogin context:")
print(content[max(0, idx_login-100):min(len(content), idx_login+300)])
