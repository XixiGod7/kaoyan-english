import pdfplumber
import glob
import json
import re
import os

def parse_answers(text):
    answers = {}
    
    # 1. Expand range format like "1-5: A-B-C-B-C" or "1 -5 : DABAC"
    range_pattern = re.compile(r'(\d{1,2})\s*[-\u2013\u2014]\s*(\d{1,2})\s*[:：]\s*([A-G\-\u2013\u2014\s]+)')
    for match in range_pattern.finditer(text):
        start = int(match.group(1))
        end = int(match.group(2))
        vals = re.sub(r'[^A-G]', '', match.group(3))
        if len(vals) == (end - start + 1):
            for i in range(len(vals)):
                answers[start + i] = vals[i]
                
    # 2. Extract singular format like "1.A 2.B", "21. A"
    # Negative lookbehind to ensure it's not part of a larger number (e.g., 2021)
    single_pattern = re.compile(r'(?<!\d)(\d{1,2})\s*[\.\-\u2013\u2014：:]\s*([A-G])\b')
    for match in single_pattern.finditer(text):
        q_num = int(match.group(1))
        if q_num not in answers:
            answers[q_num] = match.group(2)
            
    return answers

def main():
    os.makedirs('public/data', exist_ok=True)
    
    for pdf_path in sorted(glob.glob('public/pdfs/2010-2025/answers/*-answer.pdf')):
        filename = os.path.basename(pdf_path)
        year = filename.split('-')[0]
        
        with pdfplumber.open(pdf_path) as pdf:
            # Objective questions are mostly on the first 3 pages
            text = ''
            for page in pdf.pages[:3]:
                page_text = page.extract_text(layout=True)
                if page_text:
                    text += page_text + '\n'
                    
            if not text.strip():
                print(f"{year}: No text extracted (likely a scanned image). Skipped.")
                continue
                
            answers = parse_answers(text)
            
            # Verify we got 1 to 45
            missing = [i for i in range(1, 46) if i not in answers]
            if missing:
                print(f"{year}: Missing answers for questions: {missing}")
            else:
                print(f"{year}: Extracted all 45 answers successfully.")
                
            # Convert to final json structure
            final_data = {
                "year": int(year),
                "answers": answers
            }
            
            out_path = f'public/data/{year}_answers.json'
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    main()
