#!/usr/bin/env python3
"""只处理2015和2001两个样本，验证提取质量"""
import sys
sys.path.insert(0, '/Users/iqtn/Documents/Study/kaoyan-english/scripts')

# 只导入核心函数，手动调用
from pdf_to_json import *
import json

# 测试2015
print("=" * 80)
print("TEST: 2015.pdf (第四阶段)")
result = process_pdf(
    "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/2010-2025/exam/2015.pdf",
    2015
)

# 详细输出完形填空 section
cloze = result.get('sections', {}).get('cloze', {})
if cloze:
    print(f"\n\n=== 完形填空文章 (前800字) ===")
    print(cloze.get('article', '(empty)')[:800])
    
    print(f"\n=== 完形填空题目 (前3题) ===")
    for q in cloze.get('questions', [])[:3]:
        print(f"  Q{q['number']}: {q['stem'][:100]}...")
        for c in q.get('choices', []):
            print(f"    {c['label']}) {c['text'][:60]}")

# 阅读理解
reading = result.get('sections', {}).get('reading-a', {})
if reading:
    print(f"\n\n=== 阅读A节 文章 (前800字) ===")
    print(reading.get('article', '(empty)')[:800])
    
    print(f"\n=== 阅读A节 题目 (前3道) ===")
    for q in reading.get('questions', [])[:3]:
        print(f"  Q{q['number']}: {q['stem'][:100]}...")
        for c in q.get('choices', []):
            print(f"    {c['label']}) {c['text'][:60]}")

# 翻译
trans = result.get('sections', {}).get('translation', {})
if trans:
    print(f"\n\n=== 翻译 (前2句) ===")
    for q in trans.get('questions', [])[:2]:
        print(f"  Q{q['number']}: {q['stem']}")

# 保存结果
OUTPUT_DIR = Path("/Users/iqtn/Documents/Study/kaoyan-english/public/data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_DIR / "2015.json", 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("\nSaved 2015.json")

# 也测一下2001（第一阶段）
print("\n\n" + "=" * 80)
print("TEST: 2001.pdf (第一阶段)")
result2 = process_pdf(
    "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/1980-2009/exam/2001.pdf",
    2001
)

with open(OUTPUT_DIR / "2001.json", 'w', encoding='utf-8') as f:
    json.dump(result2, f, ensure_ascii=False, indent=2)
print("Saved 2001.json")

# 2007 (第三阶段)
print("\n\n" + "=" * 80)
print("TEST: 2007.pdf (第三阶段)")
result3 = process_pdf(
    "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/1980-2009/exam/2007.pdf",
    2007
)

with open(OUTPUT_DIR / "2007.json", 'w', encoding='utf-8') as f:
    json.dump(result3, f, ensure_ascii=False, indent=2)
print("Saved 2007.json")
