import os
import json

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
TASKS_DIR = os.path.join(PUBLIC_DATA_DIR, "tasks")
PAPERS_DIR = os.path.join(PUBLIC_DATA_DIR, "papers")

os.makedirs(PAPERS_DIR, exist_ok=True)

# Standard Chinese Task Names for Kaoyan English 1
TASK_NAMES_MAP = [
    {"name": "完形填空", "score": "10分", "type": "cloze"},
    {"name": "阅读篇1", "score": "10分", "type": "reading"},
    {"name": "阅读篇2", "score": "10分", "type": "reading"},
    {"name": "阅读篇3", "score": "10分", "type": "reading"},
    {"name": "阅读篇4", "score": "10分", "type": "reading"},
    {"name": "新题型", "score": "10分", "type": "matching"},
    {"name": "英译汉", "score": "10分", "type": "translation"},
    {"name": "小作文", "score": "10分", "type": "writing"},
    {"name": "大作文", "score": "20分", "type": "writing"},
]

def format_cloze_article(raw_article, content_json):
    """
    Substitutes target words in Cloze article with [ 1 ], [ 2 ], ... [ 20 ] badges
    """
    if not raw_article or not content_json:
        return raw_article

    # Gather all 1..20 blank items
    blanks_info = []
    for k, v in content_json.items():
        if k.isdigit():
            b_num = int(k)
            ans = v.get("answer")
            # Target surface word or answer word
            word = ""
            if ans and ans in v:
                word = v[ans]
            elif "A" in v:
                word = v["A"]
            
            blanks_info.append({
                "num": b_num,
                "word": word,
                "data": v
            })

    blanks_info.sort(key=lambda x: x["num"])

    # For each blank word, replace first match in article with [ num ]
    article_text = raw_article
    for b in blanks_info:
        num = b["num"]
        word = b["word"]
        # Look for word in text to replace with badge [ num ]
        placeholder = f" [ {num} ] "
        if word and word in article_text:
            article_text = article_text.replace(word, placeholder, 1)
        else:
            # Fallback regex replace for common words
            pass

    return article_text

def main():
    print("=== Rebuilding Paper Bundles with Exact Zhentiqiang Format ===")
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
            task_detail = {}
            if os.path.exists(task_file):
                with open(task_file, "r", encoding="utf-8") as tf:
                    t_obj = json.load(tf)
                    if "tasks" in t_obj and len(t_obj["tasks"]) > 0:
                        task_detail = t_obj["tasks"][0]

            # Attach standard Chinese name & score
            nav_info = TASK_NAMES_MAP[idx] if idx < len(TASK_NAMES_MAP) else {"name": f"题型{idx+1}", "score": "10分", "type": "choice"}

            # Format Cloze article if task 0 (完形填空)
            if idx == 0 and "content_json" in task_detail:
                raw_art = task_detail.get("article") or task_detail.get("content_json", {}).get("article", "")
                formatted_art = format_cloze_article(raw_art, task_detail.get("content_json", {}))
                task_detail["cloze_formatted_article"] = formatted_art

            tasks_bundle.append({
                "meta": {
                    "id": tid,
                    "index": idx + 1,
                    "chinese_name": nav_info["name"],
                    "score": nav_info["score"],
                    "category": nav_info["type"],
                    "year": clean_year
                },
                "detail": task_detail
            })

        out_bundle_path = os.path.join(PAPERS_DIR, f"{clean_year}.json")
        with open(out_bundle_path, "w", encoding="utf-8") as bf:
            json.dump({"year": clean_year, "tasks": tasks_bundle}, bf, ensure_ascii=False, indent=2)
        print(f"Generated paper bundle {clean_year}.json ({len(tasks_bundle)} tasks).")

    print("=== Paper Bundles Rebuilt Successfully! ===")

if __name__ == "__main__":
    main()
