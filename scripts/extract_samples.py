#!/usr/bin/env python3
"""提取不同年代考研英语PDF的文本样本，用于分析解析策略"""
import pdfplumber
import os
import sys

BASE = "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs"

# 每个时代选一个代表
samples = [
    ("2001 (第一阶段)", f"{BASE}/1980-2009/exam/2001.pdf"),
    ("2003 (第二阶段)", f"{BASE}/1980-2009/exam/2003.pdf"),
    ("2007 (第三阶段)", f"{BASE}/1980-2009/exam/2007.pdf"),
    ("2015 (第四阶段英一)", f"{BASE}/2010-2025/exam/2015.pdf"),
    ("2022 (第四阶段英一-新)", f"{BASE}/2010-2025/exam/2022.pdf"),
]

def extract_sample(label, path):
    print(f"\n{'='*80}")
    print(f"  {label}: {os.path.basename(path)}")
    print(f"{'='*80}")
    
    if not os.path.exists(path):
        print("  FILE NOT FOUND")
        return
    
    with pdfplumber.open(path) as pdf:
        print(f"  Total pages: {len(pdf.pages)}")
        
        # 提取前3页和每页的前1500字符
        for i, page in enumerate(pdf.pages[:5]):
            text = page.extract_text() or ""
            # 也提取表格（如果有）
            tables = page.extract_tables()
            
            preview = text[:1200].replace('\n', '\\n')
            print(f"\n  --- Page {i+1} ({len(text)} chars, {len(tables)} tables) ---")
            print(f"  {preview[:1000]}")
            if len(text) > 1000:
                print(f"  ... [truncated]")

for label, path in samples:
    try:
        extract_sample(label, path)
    except Exception as e:
        print(f"\nERROR processing {label}: {e}")

# 额外：用 layout 模式提取一个2015的看看差异
print("\n\n" + "="*80)
print("  2015.pdf Page 1-3 with layout mode")
print("="*80)

try:
    with pdfplumber.open(f"{BASE}/2010-2025/exam/2015.pdf") as pdf:
        for i in range(min(3, len(pdf.pages))):
            page = pdf.pages[i]
            # 用layout模式保持布局
            text = page.extract_text(layout=True, x_tolerance=3, y_tolerance=3) or ""
            print(f"\n--- Page {i+1} layout mode ---")
            print(text[:1500])
except Exception as e:
    print(f"Error: {e}")
