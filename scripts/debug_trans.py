#!/usr/bin/env python3
"""调试翻译和新题型的提取"""
import pdfplumber
import re

PATH = "/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs/2010-2025/exam/2015.pdf"

with pdfplumber.open(PATH) as pdf:
    page14 = pdf.pages[13]
    text = page14.extract_text(layout=True) or ""
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    print("=== PAGE 14 FULL TEXT (Translation) ===")
    print(text[:3000])
    
    # 测试翻译正则
    print("\n=== Testing translation regex ===")
    pat1 = re.compile(r'\(\s*(\d{1,2})\s*\)\s*([A-Z][^(]+?)(?=\(\s*\d+\s*\)|$)', re.DOTALL)
    for m in pat1.finditer(text):
        num = int(m.group(1))
        sent = m.group(2).strip()[:120]
        print(f"  Match: ({num}) {sent}")
    
    # 所有括号数字
    paren_re2 = re.compile(r'\((\d+)\)')
    all_parens = paren_re2.findall(text)
    print(f"\nAll parens on p14: {all_parens}")

    # 新题型页
    print("\n\n" + "="*70)
    page12 = pdf.pages[11]  
    text12 = page12.extract_text(layout=True) or ""
    text12 = re.sub(r'\(cid:\d+\)', '', text12)
    print("=== PAGE 12 (New Type) ===")
    print(text12[:2500])
    
    paren_re3 = re.compile(r'\((\d+)\)')
    pnums = paren_re3.findall(text12)
    print(f"\nParens on p12: {pnums}")
