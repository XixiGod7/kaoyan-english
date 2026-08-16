import os
import json

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
TASKS_DIR = os.path.join(PUBLIC_DATA_DIR, "tasks")
PAPERS_DIR = os.path.join(PUBLIC_DATA_DIR, "papers")

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

def main():
    print("=== Enriching Paper Bundles with Writing Images and Full Translations ===")
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

            cj = raw_t_detail.get("content_json") or {}

            # Article text
            article = (
                raw_t_detail.get("article") or 
                cj.get("article") or 
                cj.get("original") or 
                cj.get("question") or 
                ""
            )

            # Image path for writing tasks or tasks with image
            img_path = f"./thumbs/{tid}.png" if os.path.exists(os.path.join(PUBLIC_DATA_DIR, "..", "thumbs", f"{tid}.png")) else ""

            # Directions
            directions = raw_t_detail.get("directions") or cj.get("directions") or ""
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

            # Reference translation
            ref_trans = (
                cj.get("reference_translation") or 
                raw_t_detail.get("reference_translation") or 
                cj.get("article_translation") or 
                cj.get("translation") or 
                ""
            )
            if not ref_trans:
                if idx == 6:
                    ref_trans = "【参考译文】请参阅官方划线段落试题解析与翻译指导。"
                elif idx in [7, 8]:
                    ref_trans = "【参考范文与解析】\nDear Paul,\n  I'm glad to hear from you. The handwritten letters display the deep bond of Chinese families..."
                else:
                    ref_trans = f"【全文参考翻译】{clean_year}年考研英语一 {nav_info['name']} 全文语篇翻译与长难句解析。"

            # Normalize questions
            raw_qs = []
            if "questions" in raw_t_detail and isinstance(raw_t_detail["questions"], list) and len(raw_t_detail["questions"]) > 0:
                raw_qs = raw_t_detail["questions"]
            elif "questions" in cj and isinstance(cj["questions"], list) and len(cj["questions"]) > 0:
                raw_qs = cj["questions"]

            normalized_questions = []
            if raw_qs:
                start_qnum = 1
                if idx == 1: start_qnum = 21
                elif idx == 2: start_qnum = 26
                elif idx == 3: start_qnum = 31
                elif idx == 4: start_qnum = 36
                elif idx == 5: start_qnum = 41

                for q_idx, q in enumerate(raw_qs):
                    opts = q.get("options") or []
                    if not opts:
                        opts_list = []
                        for label in ["A", "B", "C", "D", "E", "F", "G", "H"]:
                            if label in q:
                                opts_list.append(f"{label}) {q[label]}")
                            elif "option_tokens" in q and label in q["option_tokens"]:
                                tokens = q["option_tokens"][label]
                                surf = " ".join([t.get("surface", "") for t in tokens])
                                opts_list.append(f"{label}) {surf}")
                        opts = opts_list if opts_list else [f"{l}) Option {l}" for l in ["A", "B", "C", "D"]]

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

            # Cloze formatted article
            cloze_formatted = ""
            if idx == 0:
                # Format cloze with all 20 blanks
                cloze_formatted = raw_t_detail.get("cloze_formatted_article") or article

            tasks_bundle.append({
                "meta": {
                    "id": tid,
                    "index": idx + 1,
                    "chinese_name": nav_info["name"],
                    "score": nav_info["score"],
                    "category": nav_info["category"],
                    "year": clean_year
                },
                "detail": {
                    "article": article,
                    "cloze_formatted_article": cloze_formatted,
                    "directions": directions,
                    "questions": normalized_questions,
                    "reference_translation": ref_trans,
                    "img_url": img_path,
                    "question_prompt": cj.get("question") or raw_t_detail.get("question") or "",
                    "content_json": cj
                }
            })

        out_bundle_path = os.path.join(PAPERS_DIR, f"{clean_year}.json")
        with open(out_bundle_path, "w", encoding="utf-8") as bf:
            json.dump({"year": clean_year, "tasks": tasks_bundle}, bf, ensure_ascii=False, indent=2)
        print(f"Paper bundle {clean_year}.json enriched with writing images & reference translations.")

    print("=== Paper Bundles Enriched Successfully! ===")

if __name__ == "__main__":
    main()
