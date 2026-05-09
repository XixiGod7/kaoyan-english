#!/usr/bin/env python3
import sys, json
sys.path.insert(0, '.')
from scripts.pdf_to_json import process_pdf

result = process_pdf('public/pdfs/2010-2025/exam/2018.pdf', 2018)

# 检查完形填空
cloze = result['sections']['cloze']
print('=== CLOZE ===')
print(f'Q count: {len(cloze["questions"])}')
for q in cloze['questions'][:3]:
    print(f'  Q{q["number"]}: choices={len(q.get("choices",[]))}')
    for c in q.get('choices', []):
        print(f'    [{c["label"]}] {c["text"][:40]}')

# 检查阅读
ra = result['sections']['reading-a']
print(f'\n=== READING-A ===')
print(f'Q count: {len(ra["questions"])}, text_count={ra.get("text_count",0)}')
for q in ra['questions'][:4]:
    print(f'  Q{q["number"]}: choices={len(q.get("choices",[]))} stem="{q["stem"][:60]}"')
    if q.get('choices'):
        for c in q['choices'][:2]:
            print(f'    [{c["label"]}] {c["text"][:50]}')

# 检查翻译
tr = result['sections'].get('translation', {})
print(f'\n=== TRANSLATION ===')
print(f'Q count: {len(tr.get("questions",[]))}')
for q in tr.get('questions', []):
    print(f'  Q{q["number"]}: "{q["stem"][:100]}..."')

# 保存结果用于验证
with open('public/data/2018.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print('\nSaved 2018.json')
