import glob
import os
import re
import json
import pdfplumber
import sys
sys.stdout.reconfigure(encoding='utf-8')

def parse_all_answers():
    pdfs = glob.glob('public/pdfs/2010-2025/answers/*-answer.pdf')
    for pdf_path in pdfs:
        year = os.path.basename(pdf_path).split('-')[0]
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = '\n'.join([p.extract_text() or '' for p in pdf.pages])
            
            ans_map = {}
            # Match formats
            matches = re.finditer(r'(\d+)\s*[-~\uFFFD C]+\s*(\d+)\s*[:\uFF1A\uFFFD]\s*([A-Ga-g\s-]+)', text)
            for m in matches:
                start = int(m.group(1))
                end = int(m.group(2))
                raw_ans = m.group(3).upper().replace(' ', '').replace('-', '')
                raw_ans = re.sub(r'[^A-G]', '', raw_ans)
                
                if len(raw_ans) == end - start + 1:
                    for i in range(len(raw_ans)):
                        ans_map[str(start + i)] = raw_ans[i]
            
            matches2 = re.finditer(r'(\d{1,2})\s*[\.\uFF0E\uFFFD]\s*([A-G])\b', text)
            for m in matches2:
                qnum = m.group(1)
                ans = m.group(2)
                if qnum not in ans_map:
                    ans_map[qnum] = ans
            
            if len(ans_map) > 0:
                out = {"year": int(year), "answers": ans_map}
                with open(f'public/data/{year}_answers.json', 'w', encoding='utf-8') as f:
                    json.dump(out, f, ensure_ascii=False, indent=2)
                print(f'Wrote {year}_answers.json with {len(ans_map)} answers')
            else:
                print(f'Skipped {year}: no answers parsed')

        except Exception as e:
            print(f'Error parsing {year}: {e}')

if __name__ == '__main__':
    parse_all_answers()
