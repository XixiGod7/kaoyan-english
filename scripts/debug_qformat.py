#!/usr/bin/env python3
"""调试：看2015 PDF中题目行的真实格式"""
import pdfplumber
import re

PATH = "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/2010-2025/exam/2015.pdf"

with pdfplumber.open(PATH) as pdf:
    # 看第3页（完形填空题目所在页）和第9页（阅读题目）、第12+页（新题型/翻译）
    for page_num in [3, 4, 9, 10, 11, 12, 13, 14]:
        if page_num > len(pdf.pages):
            break
        page = pdf.pages[page_num - 1]
        text = page.extract_text(layout=True) or ""
        text = re.sub(r'\(cid:\d+\)', '', text)
        
        print(f"\n{'='*70}")
        print(f"PAGE {page_num}")
        print(f"{'='*70}")
        
        # 找所有包含数字+.或数字+)的行
        lines = text.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            # 匹配可能的题目行
            if re.match(r'^\s*\d{1,2}\s*[.\)）]', stripped):
                # 显示上下文
                start = max(0, i-1)
                end = min(len(lines), i+2)
                for j in range(start, end):
                    prefix = ">>>" if j == i else "   "
                    print(f"{prefix} [{j}] {lines[j]}")
                print("---")
