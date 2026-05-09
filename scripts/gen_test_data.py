#!/usr/bin/env python3
"""生成关键年份的JSON数据（用于快速验证）"""
import sys, os
sys.path.insert(0, '/Users/iqtn/Documents/Study/kaoyan-english/scripts')
from pdf_to_json import *
import json

OUTPUT_DIR = Path("/Users/iqtn/Documents/Study/kaoyan-english/public/data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 关键测试年份（覆盖所有4个时代）
test_years = [
    ("2001", f"{BASE_DIR}/1980-2009/exam/2001.pdf", 2001),  # era1
    ("2003", f"{BASE_DIR}/1980-2009/exam/2003.pdf", 2003),  # era2
    ("2007", f"{BASE_DIR}/1980-2009/exam/2007.pdf", 2007),  # era3
    ("2015", f"{BASE_DIR}/2010-2025/exam/2015.pdf", 2015),  # era4
    ("2022", f"{BASE_DIR}/2010-2025/exam/2022.pdf", 2022),  # era4 new
]

index = {}
ok_count = 0

for label, path, year in test_years:
    result = process_pdf(path, year)
    
    out_path = OUTPUT_DIR / f"{year}.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    total_q = result.get('extracted_question_count', 0)
    max_n = result.get('max_question_number', 0)
    status = 'OK' if total_q >= max_n * 0.8 else 'PARTIAL'
    if status == 'OK':
        ok_count += 1
    
    index[str(year)] = {
        'year': year,
        'status': status,
        'questions': total_q,
        'max_number': max_n,
        'era': result.get('era_label','?'),
        'file': f"{year}.json",
    }
    print(f"  => {label}: {total_q}q (max={max_n}) [{status}]")

# 写入索引
with open(OUTPUT_DIR / "index.json", 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"\nDone: {ok_count}/{len(test_years)} years OK")
print(f"Data in: {OUTPUT_DIR}")
