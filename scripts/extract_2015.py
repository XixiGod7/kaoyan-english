#!/usr/bin/env python3
"""详细提取2015考研英语PDF，理解完整结构"""
import pdfplumber
import json
import re

PATH = "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/2010-2025/exam/2015.pdf"

with pdfplumber.open(PATH) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        w = page.width
        h = page.height
        print(f"\n{'='*80}")
        print(f"PAGE {i+1} ({w:.0f}x{h:.0f}, {len(text)} chars)")
        print(f"{'='*80}")
        
        # 输出完整文本
        if text.strip():
            # 找出关键标记
            has_section = bool(re.search(r'Section\s+[IVX]+', text))
            has_directions = 'Directions' in text
            has_question = bool(re.search(r'^\s*\d{1,2}\s*[.\)]\s*\[?A', text, re.MULTILINE))
            
            print(f"  [Section: {has_section}, Directions: {has_directions}, Questions: {has_question}]")
            print(text[:2000])
            if len(text) > 2000:
                print(f"\n  ... [{len(text)-2000} more chars]")
