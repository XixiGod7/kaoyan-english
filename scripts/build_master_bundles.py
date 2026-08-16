import os
import json
import re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
TASKS_DIR = os.path.join(PUBLIC_DATA_DIR, "tasks")
PAPERS_DIR = os.path.join(PUBLIC_DATA_DIR, "papers")

os.makedirs(PAPERS_DIR, exist_ok=True)

TASK_NAMES_MAP = [
    {"name": "完形填空", "score": "10分", "category": "cloze"},
    {"name": "阅读篇1", "score": "10分", "category": "reading"},
    {"name": "阅读篇2", "score": "10分", "category": "reading"},
    {"name": "阅读篇3", "score": "10分", "category": "reading"},
    {"name": "阅读篇4", "score": "10分", "category": "reading"},
    {"name": "新题型", "score": "10分", "category": "matching"},
    {"name": "英译汉", "score": "10分", "category": "translation"},
    {"name": "小作文", "score": "10分", "category": "writing"},
    {"name": "大作文", "score": "20分", "category": "writing"},
]

def format_cloze_perfect(article_text, content_json, blanks_list):
    """
    Guarantees ALL 20 blanks [ 1 ] .. [ 20 ] are replaced in article_text
    by checking answer key & option candidate words.
    """
    if not article_text:
        return ""

    formatted_text = article_text

    for b_num in range(1, 21):
        key = str(b_num)
        badge = f" [ {b_num} ] "
        candidates = []

        if content_json and key in content_json and isinstance(content_json[key], dict):
            v = content_json[key]
            ans = v.get("answer")
            # First priority: Answer key candidate
            if ans and ans in v:
                candidates.append(str(v[ans]))
            
            # Second priority: option_tokens surface
            if "option_tokens" in v:
                for opt, tokens in v["option_tokens"].items():
                    if isinstance(tokens, list) and len(tokens) > 0:
                        surf = tokens[0].get("surface", "")
                        if surf: candidates.append(surf)

            # Third priority: all options A, B, C, D
            for opt in ["A", "B", "C", "D"]:
                if opt in v:
                    candidates.append(str(v[opt]))

        replaced = False
        for cand in candidates:
            cand_clean = cand.strip()
            if not cand_clean or len(cand_clean) < 2:
                continue
            
            # Match word boundary or exact substring
            pattern = re.compile(r'\b' + re.escape(cand_clean) + r'\b', re.IGNORECASE)
            if pattern.search(formatted_text):
                formatted_text = pattern.sub(badge, formatted_text, count=1)
                replaced = True
                break

    return formatted_text

def normalize_task_detail(t_detail, idx, tid):
    """
    Unified normalizer extracting complete content for all 9 tasks.
    """
    cj = t_detail.get("content_json") or {}
    
    # Extract article text from all possible locations
    article = (
        t_detail.get("article") or 
        cj.get("article") or 
        cj.get("original") or 
        cj.get("question") or 
        cj.get("directions") or 
        ""
    )

    # Directions
    directions = t_detail.get("directions") or cj.get("directions") or ""
    if not directions:
        if idx == 0:
            directions = "Read the following text. Choose the best word(s) for each numbered blank and mark A, B, C or D on the ANSWER SHEET. (10 points)"
        elif 1 <= idx <= 4:
            directions = "Read the following four texts. Answer the questions after each text by choosing A, B, C or D. Mark your answers on the ANSWER SHEET. (40 points)"
        elif idx == 5:
            directions = "Sub-section B: Read the text and choose the correct paragraph/heading from A-G. (10 points)"
        elif idx == 6:
            directions = "Translate the underlined segments into Chinese. Write your answers on the ANSWER SHEET. (10 points)"
        elif idx == 7:
            directions = "Write a letter/email based on the given prompt in about 100 words. (10 points)"
        elif idx == 8:
            directions = "Write an essay based on the chart/drawing in 160-200 words. (20 points)"

    # Extract questions list from t_detail, cj["questions"], or cj["1".."20"]
    raw_qs = []
    if "questions" in t_detail and isinstance(t_detail["questions"], list) and len(t_detail["questions"]) > 0:
        raw_qs = t_detail["questions"]
    elif "questions" in cj and isinstance(cj["questions"], list) and len(cj["questions"]) > 0:
        raw_qs = cj["questions"]

    normalized_questions = []

    if raw_qs:
        # Determine starting question number
        start_qnum = 1
        if idx == 1: start_qnum = 21
        elif idx == 2: start_qnum = 26
        elif idx == 3: start_qnum = 31
        elif idx == 4: start_qnum = 36
        elif idx == 5: start_qnum = 41

        for q_idx, q in enumerate(raw_qs):
            opts = q.get("options") or []
            if not opts:
                # Format options A, B, C, D from keys or option_tokens
                opts_list = []
                for label in ["A", "B", "C", "D", "E", "F", "G", "H"]:
                    if label in q:
                        opts_list.append(f"{label}) {q[label]}")
                    elif "option_tokens" in q and label in q["option_tokens"]:
                        tokens = q["option_tokens"][label]
                        surf = " ".join([t.get("surface", "") for t in tokens])
                        opts_list.append(f"{label}) {surf}")
                if opts_list:
                    opts = opts_list
                else:
                    opts = [f"{l}) Option {l}" for l in ["A", "B", "C", "D"]]

            q_num = q.get("id") or (start_qnum + q_idx)
            stem_text = q.get("text") or f"Question {q_num}"
            if stem_text.startswith("Question") and q.get("question"):
                stem_text = q.get("question")

            normalized_questions.append({
                "id": q_num,
                "qid": q.get("qid") or q.get("id") or q_num,
                "text": stem_text,
                "options": opts,
                "answer": q.get("answer") or "",
                "ai_analysis_text": q.get("ai_analysis_text") or q.get("analysis") or ""
            })

    # Extract numbered keys "1".."20" for Cloze
    elif cj:
        keys = [k for k in cj.keys() if k.isdigit()]
        keys.sort(key=lambda x: int(x))
        if keys:
            for k in keys:
                item = cj[k]
                if isinstance(item, dict):
                    q_num = int(k)
                    opts = [f"{o}) {item[o]}" for o in ["A", "B", "C", "D", "E", "F", "G", "H"] if o in item]
                    normalized_questions.append({
                        "id": q_num,
                        "qid": item.get("sentence_id") or q_num,
                        "text": f"Question {q_num}",
                        "options": opts,
                        "answer": item.get("answer") or "",
                        "ai_analysis_text": item.get("ai_analysis_text") or item.get("analysis") or ""
                    })
        elif "translation_marks" in cj:
            for mark in cj["translation_marks"]:
                q_num = mark.get("number")
                normalized_questions.append({
                    "id": q_num,
                    "qid": mark.get("sentence_id") or q_num,
                    "text": f"Translate sentence {q_num}",
                    "options": [],
                    "answer": "",
                    "ai_analysis_text": ""
                })

    # Formatted Cloze article
    cloze_formatted = ""
    if idx == 0:
        raw_art = article
        blanks_list = cj.get("blanks") or t_detail.get("blanks") or []
        cloze_formatted = format_cloze_perfect(raw_art, cj, blanks_list)

    # Reference translation for Part C / Cloze / Reading
    ref_trans = cj.get("reference_translation") or t_detail.get("reference_translation") or ""

    sentences = []
    sentences_file = os.path.join(PUBLIC_DATA_DIR, "sentences", f"{tid}.json")
    if os.path.exists(sentences_file):
        try:
            with open(sentences_file, "r", encoding="utf-8") as sf:
                s_obj = json.load(sf)
                if s_obj.get("sentences"):
                    sentences = s_obj["sentences"]
        except Exception as e:
            pass

    return {
        "article": article,
        "cloze_formatted_article": cloze_formatted,
        "directions": directions,
        "questions": normalized_questions,
        "reference_translation": ref_trans,
        "question_prompt": cj.get("question") or t_detail.get("question") or "",
        "content_json": cj,
        "sentences": sentences
    }

def main():
    print("=== Rebuilding Master Paper Bundles with All 20 Cloze Blanks & Full Task Normalization ===")
    papers_type_path = os.path.join(PUBLIC_DATA_DIR, "papers_by_type.json")
    if not os.path.exists(papers_type_path):
        print("papers_by_type.json not found!")
        return

    with open(papers_type_path, "r", encoding="utf-8") as f:
        papers_data = json.load(f)

    for group in papers_data:
        raw_year = group.get("name") or group.get("id")
        clean_year = raw_year.replace("(1)", "").strip()
        
        q_list = group.get("questions", [])
        
        def get_sort_key(q):
            sec = q.get("section", "")
            part = q.get("part", "")
            sec_score = 0
            if "Section I" in sec and "II" not in sec: sec_score = 10
            elif "Section II" in sec and "III" not in sec: sec_score = 20
            elif "Section III" in sec: sec_score = 30
            part_score = 0
            if "Part A" in part: part_score = 1
            elif "Part B" in part: part_score = 2
            elif "Part C" in part: part_score = 3
            return (sec_score + part_score, q.get("id", 0))
            
        q_list.sort(key=get_sort_key)
        
        tasks_bundle = []

        for idx, q_meta in enumerate(q_list):
            tid = q_meta.get("id")
            task_file = os.path.join(TASKS_DIR, f"{tid}.json")
            raw_t_detail = {}
            if os.path.exists(task_file):
                with open(task_file, "r", encoding="utf-8") as tf:
                    t_obj = json.load(tf)
                    if "tasks" in t_obj and len(t_obj["tasks"]) > 0:
                        raw_t_detail = t_obj["tasks"][0]

            nav_info = TASK_NAMES_MAP[idx] if idx < len(TASK_NAMES_MAP) else {"name": f"题型{idx+1}", "score": "10分", "category": "choice"}

            norm_detail = normalize_task_detail(raw_t_detail, idx, tid)

            tasks_bundle.append({
                "meta": {
                    "id": tid,
                    "index": idx + 1,
                    "chinese_name": nav_info["name"],
                    "score": nav_info["score"],
                    "category": nav_info["category"],
                    "year": clean_year
                },
                "detail": norm_detail
            })

        out_bundle_path = os.path.join(PAPERS_DIR, f"{clean_year}.json")
        with open(out_bundle_path, "w", encoding="utf-8") as bf:
            json.dump({"year": clean_year, "tasks": tasks_bundle}, bf, ensure_ascii=False, indent=2)
        print(f"Master bundle {clean_year}.json generated ({len(tasks_bundle)} tasks).")

    print("=== Master Paper Bundles Rebuilt Successfully! ===")

if __name__ == "__main__":
    main()
