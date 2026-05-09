#!/usr/bin/env python3
"""看第12-14页（新题型、翻译、作文）的内容"""
import pdfplumber
import re

PATH = "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/2010-2025/exam/2015.pdf"

with pdfplumber.open(PATH) as pdf:
    for page_num in [12, 13, 14, 15]:
        if page_num > len(pdf.pages):
            break
        page = pdf.pages[page_num - 1]
        text = page.extract_text(layout=True) or ""
        text = re.sub(r'\(cid:\d+\)', '', text)
        
        print(f"\n{'='*70}")
        print(f"PAGE {page_num} ({len(text)} chars)")
        print(f"{'='*70}")
        
        if text.strip():
            # 输出全部
            print(text[:2000])
            if len(text) > 2000:
                print(f"\n... [{len(text)-2000} more]")
        else:
            print("(empty - may be scanned image)")
            
    # 也看看有没有表格
    for page_num in [12, 13, 14]:
        if page_num <= len(pdf.pages):
            page = pdf.pages[page_num - 1]
            tables = page.extract_tables()
            if tables:
                print(f"\nPage {page_num}: Found {len(tables)} table(s)")
                for ti, table in enumerate(tables):
                    print(f"  Table {ti+1}: {len(table)} rows")
                    if table:
                        for row in table[:3]:
                            print(f"    {row}")
