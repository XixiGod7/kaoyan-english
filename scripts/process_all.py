import glob
import os
import sys
import json
from pdf_to_json import process_pdf

sys.stdout.reconfigure(encoding='utf-8')
pdf_files = glob.glob('public/pdfs/2010-2025/exam/*.pdf')
for pdf_file in pdf_files:
    year = int(os.path.basename(pdf_file).replace('.pdf', ''))
    out_file = f'public/data/{year}.json'
    print(f'Processing {year}...')
    try:
        result = process_pdf(pdf_file, year)
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'Error on {year}: {e}')
