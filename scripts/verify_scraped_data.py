import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")

def test_data_integrity():
    print("=== Automated Data Integrity Verification ===")
    errors = []

    # 1. Reading Index
    index_file = os.path.join(DATA_DIR, "reading", "index.json")
    if not os.path.exists(index_file):
        errors.append("reading/index.json is missing")
    else:
        with open(index_file, encoding='utf-8') as f:
            idx = json.load(f)
            print(f"[✓] Reading index: {len(idx)} passages (expected: 100)")
            if len(idx) != 100:
                errors.append(f"Expected 100 passages in index, got {len(idx)}")

    # 2. Reading Passages, Keywords, Questions
    p_dir = os.path.join(DATA_DIR, "reading", "passages")
    kw_dir = os.path.join(DATA_DIR, "reading", "keywords")
    q_dir = os.path.join(DATA_DIR, "reading", "questions")
    
    p_files = os.listdir(p_dir) if os.path.exists(p_dir) else []
    kw_files = os.listdir(kw_dir) if os.path.exists(kw_dir) else []
    q_files = os.listdir(q_dir) if os.path.exists(q_dir) else []

    print(f"[✓] Reading passage files: {len(p_files)} / 100")
    print(f"[✓] Reading keyword files: {len(kw_files)} / 100")
    print(f"[✓] Reading question files: {len(q_files)} / 100")

    if len(p_files) != 100:
        errors.append(f"Expected 100 passage files, got {len(p_files)}")

    # Verify a random sample passage syntax tree
    sample_file = os.path.join(p_dir, "2025-t1.json")
    with open(sample_file, encoding='utf-8') as f:
        s_data = json.load(f)
        s0 = s_data['sentences'][0]
        has_trunk = 'trunk' in s0 and '主语' in s0['trunk']
        has_comp = 'components' in s0 and len(s0['components']) > 0
        print(f"[✓] Passage 2025-t1 syntax tree verification: has_trunk={has_trunk}, components_count={len(s0['components'])}")
        if not (has_trunk and has_comp):
            errors.append("2025-t1 sentence 0 syntax tree is malformed")

    # 3. Grammar
    grammar_file = os.path.join(DATA_DIR, "grammar", "grammar_all.json")
    with open(grammar_file, encoding='utf-8') as f:
        g_data = json.load(f)
        rows_count = len(g_data.get('rows', []))
        print(f"[✓] Grammar sentences: {rows_count} (expected: 2009)")
        if rows_count != 2009:
            errors.append(f"Expected 2009 grammar rows, got {rows_count}")

    # 4. Paraphrase
    para_file = os.path.join(DATA_DIR, "paraphrase", "paraphrase_all.json")
    with open(para_file, encoding='utf-8') as f:
        para_data = json.load(f)
        para_items = para_data.get('items', [])
        print(f"[✓] Paraphrase questions: {len(para_items)} (expected: 200)")
        if len(para_items) != 200:
            errors.append(f"Expected 200 paraphrase items, got {len(para_items)}")
        # verify answers exist
        with_answers = [p for p in para_items if p.get('answer')]
        print(f"[✓] Paraphrase questions with answers & translations: {len(with_answers)} / 200")
        if len(with_answers) < 200:
            errors.append(f"Some paraphrase items are missing answers: {200 - len(with_answers)}")

    # 5. Phrases
    phrases_file = os.path.join(DATA_DIR, "phrases", "phrases_all.json")
    with open(phrases_file, encoding='utf-8') as f:
        phr_data = json.load(f)
        phr_items = phr_data.get('items', [])
        print(f"[✓] Phrases: {len(phr_items)} (expected: >= 2500)")
        if len(phr_items) < 2500:
            errors.append(f"Phrases count lower than expected: {len(phr_items)}")

    # 6. Vocab stats
    vocab_file = os.path.join(DATA_DIR, "vocab_stats", "vocab_stats_all.json")
    with open(vocab_file, encoding='utf-8') as f:
        v_data = json.load(f)
        print(f"[✓] Vocab stats: {len(v_data)} syllabus words (expected: 3149)")
        if len(v_data) != 3149:
            errors.append(f"Expected 3149 syllabus words, got {len(v_data)}")

    # 7. Brand Check
    brand_keywords = ['研砖', '英砖']
    brand_found = []
    for root, dirs, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith('.json'):
                p = os.path.join(root, file)
                content = open(p, encoding='utf-8', errors='ignore').read()
                for bk in brand_keywords:
                    if bk in content:
                        brand_found.append((p, bk))

    print(f"[✓] Brand keywords ('研砖', '英砖') check: {len(brand_found)} occurrences")
    if brand_found:
        errors.append(f"Found brand mentions in: {brand_found}")

    if errors:
        print("\n❌ Verification failed with errors:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n🎉 ALL DATA INTEGRITY CHECKS PASSED PERFECTLY!")

if __name__ == '__main__':
    test_data_integrity()
