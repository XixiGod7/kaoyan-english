#!/usr/bin/env python3
"""
考研英语真题 PDF 结构化提取器 v1
================================
使用 pdfplumber 提取文本，按题型分组输出 JSON

核心策略：
  1. 跳过第1页（考生须知）
  2. 按 "Section" 标记分割大区域
  3. 在每个区域内：分离文章 + 提取题目+选项
  4. 自动检测试卷年代（根据最大题号和关键词）
"""
import pdfplumber
import json
import re
import os
import sys
from pathlib import Path
from typing import Optional

BASE_DIR = Path("/Users/iqtn/Documents/Study/kaoyan-english/public/pdfs")
OUTPUT_DIR = Path("/Users/iqtn/Documents/Study/kaoyan-english/public/data")

# ==================== 噪声模式 ====================
NOISE_PATTERNS = [
    r'绝密.*?启用前',
    r'考生注意事项',
    r'考生须把试题册',
    r'不按规定粘贴条形码',
    r'选择题的答案必须涂写',
    r'非选择题的答案必须书写',
    r'超出答题区域书写的答案无效',
    r'填（书）写部分必须使用黑色字迹签字笔',
    r'涂写部分必须使用2B铅笔',
    r'考试结束.*?交回',
    r'考生编号\s*$',
    r'考生姓名\s*$',
    r'条形码粘贴位置',
    r'填写报考单位',
    r'涂写考生编号信息点',
    r'\(以下信息考生必须认真填写\)',
]
NOISE_RE = [re.compile(p) for p in NOISE_PATTERNS]

# ==================== 年代配置 ====================
# 每个年代有不同的题型分布
ERA_CONFIGS = {
    'era1': {  # ≤2001
        'label': '第一阶段(≤2001)',
        'sections': [
            {'key': 'vocab', 'name': '词汇与结构', 'range': (1,30), 'type': 'choice'},
            {'key': 'cloze', 'name': '完形填空', 'range': (31,40), 'type': 'cloze'},
            {'key': 'reading', 'name': '阅读理解', 'range': (41,60), 'type': 'reading'},
            {'key': 'translation', 'name': '英译汉', 'range': (61,65), 'type': 'translation'},
            {'key': 'writing', 'name': '写作', 'range': (66,66), 'type': 'writing'},
        ]
    },
    'era2': {  # 2002-2004 (有听力)
        'label': '第二阶段(2002-2004)',
        'sections': [
            {'key': 'listening', 'name': '听力理解', 'range': (1,20), 'type': 'choice'},
            {'key': 'cloze', 'name': '完形填空', 'range': (21,40), 'type': 'cloze'},
            {'key': 'reading', 'name': '阅读理解', 'range': (41,60), 'type': 'reading'},
            {'key': 'translation', 'name': '英译汉', 'range': (61,65), 'type': 'translation'},
            {'key': 'writing', 'name': '写作', 'range': (66,66), 'type': 'writing'},
        ]
    },
    'era3': {  # 2005-2009 / 2010+ 英一
        'label': '第三阶段+(2005至今 英一)',
        'sections': [
            {'key': 'cloze', 'name': 'Section I 完形填空', 'range': (1,20), 'type': 'cloze'},
            {'key': 'reading-a', 'name': 'Section II 阅读A节', 'range': (21,40), 'type': 'reading'},
            {'key': 'new-type', 'name': 'Part B 阅读新题型', 'range': (41,45), 'type': 'new_type'},
            {'key': 'translation', 'name': 'C节 翻译', 'range': (46,50), 'type': 'translation'},
            {'key': 'writing-a', 'name': 'A节 应用文写作', 'range': (51,51), 'type': 'writing_small'},
            {'key': 'writing-b', 'name': 'B节 短文写作', 'range': (52,52), 'type': 'writing_big'},
        ]
    },
    'era4_en2': {  # 2010+ 英二
        'label': '第四阶段(2010至今 英二)',
        'sections': [
            {'key': 'cloze', 'name': 'Section I 完形填空', 'range': (1,20), 'type': 'cloze'},
            {'key': 'reading-a', 'name': 'Section II 阅读A节', 'range': (21,40), 'type': 'reading'},
            {'key': 'new-type', 'name': 'Part B 阅读新题型', 'range': (41,45), 'type': 'new_type'},
            {'key': 'translation', 'name': 'C节 翻译', 'range': (46,46), 'type': 'translation'},
            {'key': 'writing-a', 'name': 'A节 应用文写作', 'range': (47,47), 'type': 'writing_small'},
            {'key': 'writing-b', 'name': 'B节 短文写作', 'range': (48,48), 'type': 'writing_big'},
        ]
    }
}


def is_noise_line(line: str) -> bool:
    """判断一行是否为噪声"""
    for p in NOISE_RE:
        if p.search(line):
            return True
    return False


def clean_text(text: str) -> str:
    """清理文本中的噪声行"""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        if not is_noise_line(line.strip()):
            cleaned.append(line)
    return '\n'.join(cleaned)


def extract_pages(pdf_path: str, skip_first: bool = True) -> list:
    """提取PDF所有页面的文本，返回 [(page_num, text), ...]"""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        start = 2 if skip_first else 1
        
        for i in range(start - 1, total):
            try:
                page = pdf.pages[i]
                text = page.extract_text(layout=True, x_tolerance=3, y_tolerance=3) or ""
                # 清理CID编码垃圾
                text = re.sub(r'\(cid:\d+\)', '', text)
                
                # ===== 关键修复1：括号内的数字可能被拆开 "( 4 7)" → "(47)" =====
                text = re.sub(r'\(\s*(\d)\s+(\d)\s*\)', lambda m: f'({m.group(1)}{m.group(2)})', text)
                text = re.sub(r'(?<=\()\s*(\d)\s+(\d)(?=\))', r'\1\2', text)
                
                # ===== 关键修复2：] 被提取为 J（字体编码问题）=====
                # [AJ → [A], [BJ → [B], [CJ → [C], [DJ → [D]
                # 注意：只修复选项格式中的这种情况，不要误伤正常文本中的 J
                text = re.sub(r'\[([A-D])J\b', r'[\1]', text)
                text = re.sub(r'\[([A-D]) j\b', r'[\1]', text)
                # 也处理反向：选项后面的 ] 变成了 J
                # 例如 "word]J" 或 "word J" 在选项末尾
                text = re.sub(r'(\w)\s*J\s+(?=\[[A-D]|$)', r'\1] ', text)
                
                text = clean_text(text)
                if text.strip():
                    pages.append((i + 1, text.strip()))
            except Exception as e:
                print(f"  Warning: Page {i+1} extract failed: {e}")
    
    return pages


def detect_era(full_text: str, max_question_num: int) -> tuple:
    """
    根据文本特征和最大题号检测试卷年代
    返回 (era_key, config_dict)
    """
    has_listening = bool(re.search(r'(?:听力|Listening|Section I\s*(?:Listening))', full_text, re.I))
    has_vocab = bool(re.search(r'(?:Vocabulary|语法|词汇与结构)', full_text))
    is_english2 = bool(re.search(r'英语[二2]|English\s*[Ii][Ii]', full_text))
    
    if max_question_num >= 60 and has_listening:
        return 'era2', ERA_CONFIGS['era2']
    elif max_question_num >= 60:
        return 'era1', ERA_CONFIGS['era1']
    elif is_english2:
        return 'era4_en2', ERA_CONFIGS['era4_en2']
    else:
        return 'era3', ERA_CONFIGS['era3']


def find_all_question_numbers(text: str) -> list:
    """
    找出文本中所有的题目编号及其位置
    
    考研英语真题中的题目格式：
    - 阅读/写作：'        31. It can be learned from Paragraph 1 that'
    - 完形填空：'        1. [A] when      [B] why       [C] how       [D] what'
    - 写作：'51. Directions:'
    - 变体：'37 . It can be...' （点号前有空格）
    - 新题型：'( 41) _______________'
    - 翻译：'( 46) This movement, driven by...'
    
    返回 [(number, start_pos, end_pos), ...]
    """
    results = []
    seen_numbers = set()  # 去重
    
    # 模式1：标准选择题格式 "数字." 或 "数字)" 或 "数字]"
    patterns = [
        # 标准：可选空格 + 数字 + .或)或] + 可选空格 + 字母/中文内容
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*[.)\]]\s*([A-Z\[（\u4e00-\u9fff])', re.MULTILINE),
        # 空格+点号变体："37 . It"
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s+\.\s+([A-Z\[（\u4e00-\u9fff])', re.MULTILINE),
        # 完形填空：数字. [A] 选项紧跟
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*\.\s*\[?[A-D]\]', re.MULTILINE),
        # 孤立题号：数字. 后换行
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*\.\s*(?:\n|$)', re.MULTILINE),
    ]
    
    for pat in patterns:
        for m in pat.finditer(text):
            num = int(m.group(1))
            if 1 <= num <= 70 and num not in seen_numbers:
                seen_numbers.add(num)
                results.append({
                    'number': num,
                    'start': m.start(1),
                    'end': m.end(),
                })
    
    # 模式2：新题型/翻译的括号格式 "( 41)" "(46)"
    paren_patterns = [
        # ( 41) 或 (41) — 空格后跟下划线或英文单词（新题型）
        re.compile(r'\(\s*(\d{1,2})\s*\)[\s_]*(?:[A-Za-z\u4e00-\u9fff])', re.MULTILINE),
        # ( 46) 后面紧跟英文句子（翻译）
        re.compile(r'\(\s*(\d{1,2})\s*\)\s*([A-Z])', re.MULTILINE),
    ]
    
    for pat in paren_patterns:
        for m in pat.finditer(text):
            num = int(m.group(1))
            if 1 <= num <= 70 and num not in seen_numbers:
                seen_numbers.add(num)
                results.append({
                    'number': num,
                    'start': m.start(),
                    'end': m.end(),
                })
    
    # 按出现顺序排序
    results.sort(key=lambda x: x['start'])
    
    return results


def split_into_sections(pages: list, era_key: str, config: dict, pdf_path: str = '') -> dict:
    """
    将页面文本按 Section 分割
    返回 {section_key: {'name': ..., 'text': ..., 'page_start': ...}}
    """
    full_text = '\n\n'.join([p[1] for p in pages])
    
    sections = {}
    
    for sec_def in config['sections']:
        key = sec_def['key']
        sec_range = sec_def['range']
        
        # 找这个范围内的题号位置
        all_qnums = find_all_question_numbers(full_text)
        sec_questions = [q for q in all_qnums if sec_range[0] <= q['number'] <= sec_range[1]]
        
        if not sec_questions:
            sections[key] = {
                'name': sec_def['name'],
                'type': sec_def['type'],
                'question_range': list(sec_range),
                'text': '',
                'article': '',
                'questions': [],
                'warnings': ['未找到题目'],
            }
            continue
        
        # 确定该 Section 的文本范围
        first_q_start = sec_questions[0]['start']
        last_q_end = sec_questions[-1]['end']
        
        # 兼容题号乱序的情况（如某年的#46出现在#47-50后面）
        all_sec_starts = sorted([q['start'] for q in sec_questions])
        all_sec_ends = sorted([q['end'] for q in sec_questions])
        zone_start = all_sec_starts[0]  # 最早出现的题号位置
        zone_end = all_sec_ends[-1] + 5000  # 最晚题目结束后再扩展
        
        # 文章在第一个题目之前（扩大范围以确保包含所有文章）
        article_zone = full_text[max(0, zone_start - 8000):zone_start]
        
        # 题目区域：从第一个题号到该 section 结束
        next_section_start = len(full_text)
        for other_sec in config['sections']:
            other_range = other_sec['range']
            if other_range[0] > sec_range[1]:
                other_qs = [q for q in all_qnums if other_range[0] <= q['number'] <= other_range[1]]
                if other_qs and other_qs[0]['start'] < next_section_start:
                    next_section_start = other_qs[0]['start']
        
        # 防止下一个 section 反而在当前 section 之前（PDF 排版异常）
        if next_section_start <= zone_start:
            question_zone = full_text[zone_start:zone_end]
        else:
            question_zone = full_text[zone_start:min(next_section_start, zone_end)]
        
        # 阅读部分特殊处理：按 Text 1/2/3/4 拆分
        if sec_type_is_reading(sec_def['type']):
            # 阅读A节的文章和题目是交错排列的（Text1→题21-25→Text2→题26-30...）
            # 所以需要传递从文章开头到所有题目结束的完整区域
            full_zone_start = max(0, zone_start - 8000)
            full_zone_end = min(len(full_text), zone_end + 5000)
            last_q_pos = all_sec_ends[-1] if all_sec_ends else zone_start
            full_zone_end = max(full_zone_end, last_q_pos + 3000)
            full_reading_zone = full_text[full_zone_start:full_zone_end]
            result = extract_reading_with_texts(full_reading_zone, sec_range, sec_def)
        else:
            article = extract_article(article_zone, sec_def['type'])
            
            # 完形填空优先使用坐标提取（解决双栏排版问题）
            if sec_def['type'] == 'cloze' and pdf_path:
                coord_questions = extract_cloze_by_coordinates(pdf_path, sec_range, sec_def)
                # 只有当坐标提取成功获取到足够题目时才使用
                coord_count = len([q for q in coord_questions if q.get('choices') and len(q.get('choices', [])) >= 3])
                expected = min(sec_range[1] - sec_range[0] + 1, 20)
                if coord_count >= expected * 0.5:  # 至少一半题目有 3+ 个选项
                    questions = coord_questions
                else:
                    questions = extract_questions_in_range(question_zone, sec_range, sec_def['type'])
            else:
                questions = extract_questions_in_range(question_zone, sec_range, sec_def['type'])
            result = {
                'name': sec_def['name'],
                'type': sec_def['type'],
                'question_range': list(sec_range),
                'text': question_zone[:200],
                'article': article,
                'questions': questions,
                'warnings': [],
            }
        
        sections[key] = result
    
    return sections


def sec_type_is_reading(sec_type: str) -> bool:
    """判断是否是阅读理解类题型"""
    return sec_type in ('reading', 'reading-a', 'reading-b')


def extract_reading_with_texts(full_zone: str, q_range: tuple, sec_def: dict) -> dict:
    """提取阅读理解，按 Text 1-4 拆分并正确分组题目

    考研阅读A节的实际排版结构（文章与题目交错）：
        Text 1
        [文章1内容]
        21. ... 22. ... 23. ... 24. ... 25. ...

        Text 2
        [文章2内容]
        26. ... 27. ... 28. ... 29. ... 30. ...
        ...以此类推
    """
    # ===== 第一步：定位所有 Text N 标记 =====
    text_headers = []  # [(text_num, start_pos, end_pos), ...]
    header_pat = re.compile(r'^\s*(?:Text\s*(\d+)|Text(\d{1}))\s*$', re.MULTILINE | re.IGNORECASE)
    for m in header_pat.finditer(full_zone):
        num = int(m.group(1) or m.group(2))
        if 1 <= num <= 6:  # 支持 1-4 篇，兼容可能的异常
            text_headers.append((num, m.start(), m.end()))

    # 去重排序（同一位置可能被多个模式匹配）
    seen_pos = set()
    unique_headers = []
    for item in sorted(text_headers, key=lambda x: x[1]):
        if item[1] not in seen_pos:
            seen_pos.add(item[1])
            unique_headers.append(item)

    # ===== 第二步：定位所有阅读题号 =====
    q_pattern = re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*[.\)）]\s*', re.MULTILINE)
    all_questions = []
    for m in q_pattern.finditer(full_zone):
        num = int(m.group(1))
        if q_range[0] <= num <= q_range[1]:
            all_questions.append({'number': num, 'start': m.start(1), 'end': m.end(), 'match': m.group()})

    # ===== 第三步：按 Text 分组 =====
    texts = []
    all_parsed_questions = []

    for idx, (text_num, hdr_start, hdr_end) in enumerate(unique_headers):
        # 当前 Text 区域的边界：
        #   开始：Text 标题结束后
        #   结束：下一个 Text 标题前（或文本末尾）
        zone_start = hdr_end
        if idx + 1 < len(unique_headers):
            zone_end = unique_headers[idx + 1][1]
        else:
            zone_end = len(full_zone)

        text_block = full_zone[zone_start:zone_end]

        # 在这个 Text 块中，分离「文章内容」和「属于该篇的题目」
        # 策略：找该 Text 块中出现的所有题号
        block_questions = [
            q for q in all_questions
            if zone_start <= q['start'] < zone_end
        ]

        # 文章区域：从 Text 标题后到第一个题号之前
        if block_questions:
            first_q_pos = block_questions[0]['start'] - zone_start
            raw_article = text_block[:first_q_pos]
        else:
            raw_article = text_block

        article = _clean_reading_article(raw_article, text_num)

        # 解析该 Text 块中的题目
        parsed_qs = []
        for qi, q in enumerate(block_questions):
            q_abs_start = q['start']
            if qi + 1 < len(block_questions):
                q_abs_end = block_questions[qi + 1]['start']
            else:
                q_abs_end = min(q_abs_start + 2000, zone_end)

            q_block = full_zone[q_abs_start:q_abs_end]
            parsed = parse_single_question(q_block, q['number'], 'choice')
            parsed_qs.append(parsed)
            all_parsed_questions.append(parsed)

        texts.append({
            'text_num': text_num,
            'article': article,
            'questions': parsed_qs,
        })

    # ===== 第四步：处理没有找到任何 Text 标记的 fallback =====
    if not texts:
        # 尝试按题号均匀切分（每5题一组）
        articles = split_article_by_text_headers(full_zone)
        combined_article = '\n\n'.join(articles).strip() if articles else extract_article(full_zone, 'reading')

        questions = []
        splits = list(q_pattern.finditer(full_zone))
        for i, match in enumerate(splits):
            num = int(match.group(1))
            if num < q_range[0] or num > q_range[1]:
                continue
            start = match.start()
            end = splits[i + 1].start() if i + 1 < len(splits) else start + 2000
            q_block = full_zone[start:end]
            questions.append(parse_single_question(q_block, num, 'choice'))

        return {
            'name': sec_def['name'],
            'type': sec_def['type'],
            'question_range': list(q_range),
            'text': full_zone[:200],
            'article': combined_article[:8000],
            'questions': questions,
            'warnings': ['未找到 Text 1-4 标记，使用 fallback 模式'],
            'text_count': len(articles),
            'texts': [],
        }

    # ===== 第五步：补齐缺失的题号（防止某些题号没匹配到） =====
    found_nums = {q['number'] for q in all_parsed_questions}
    for n in range(q_range[0], q_range[1] + 1):
        if n not in found_nums:
            placeholder = make_placeholder(n, 'choice')
            all_parsed_questions.append(placeholder)
            # 归入最后一个 text group（或按题号规则归入）
            target_text_idx = min((n - q_range[0]) // 5, len(texts) - 1)
            if target_text_idx >= 0 and target_text_idx < len(texts):
                texts[target_text_idx]['questions'].append(placeholder)

    all_parsed_questions.sort(key=lambda x: x['number'])

    # 合并所有文章作为 article（向后兼容）
    combined_article = '\n\n'.join([t['article'] for t in texts if t['article']]).strip()

    return {
        'name': sec_def['name'],
        'type': sec_def['type'],
        'question_range': list(q_range),
        'text': full_zone[:200],
        'article': combined_article[:8000],
        'questions': all_parsed_questions,
        'warnings': [],
        'text_count': len(texts),
        'texts': texts,
    }


def _clean_reading_article(raw_text: str, text_num: int) -> str:
    """清理单篇文章的内容，去除 Directions 和说明文字"""
    lines = raw_text.split('\n')
    clean_lines = []

    # 跳过开头的 Directions/说明文字
    skipping = True
    has_content = False

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        if not stripped:
            if has_content:
                clean_lines.append(line)
            continue

        # Directions 类关键词
        if skipping and any(kw in lower for kw in [
            'directions', 'answer sheet', 'four choices', 'read the following',
            'each of', 'below', 'choose the best', 'mark your answer',
        ]):
            continue

        if skipping and looks_like_article_content(stripped):
            skipping = False
            has_content = True

        if skipping:
            continue

        # 不要把题号行混入文章
        if re.match(r'^\s*\d{1,2}\s*[.\)]', stripped):
            break

        clean_lines.append(line)

    result = '\n'.join(clean_lines).strip()
    return result[:8000] if result else ''


def looks_like_article_content(line: str) -> bool:
    """判断一行是否像英文文章正文"""
    if len(line) < 20:
        return False
    alpha_count = sum(1 for c in line if c.isalpha() and ord(c) < 128)
    if len(line) > 10 and alpha_count / len(line) < 0.4:
        return False
    # 以英文单词开头
    if line[0].isalpha() and ord(line[0]) < 128:
        return True
    if alpha_count > 15:
        return True
    return False


def split_article_by_text_headers(text: str) -> list:
    """按 'Text 1', 'Text 2' 等标题将文章拆分"""
    # 更宽泛的模式匹配
    patterns = [
        re.compile(r'^(?:Text\s*(\d+)|Text(\d{1}))\s*$', re.MULTILINE | re.IGNORECASE),
        re.compile(r'Text\s*\d+', re.IGNORECASE),
        re.compile(r'^Text\d+$', re.MULTILINE | re.IGNORECASE),
    ]
    
    # 找所有 Text 标记位置
    all_positions = []
    for pat in patterns:
        for m in pat.finditer(text):
            all_positions.append((m.start(), m.end()))
    
    if len(all_positions) < 2:
        art = extract_article(text, 'reading')
        return [art] if art else []
    
    # 去重并排序
    seen = set()
    unique_pos = []
    for start, end in sorted(all_positions):
        if start not in seen:
            seen.add(start)
            unique_pos.append((start, end))
    
    parts = []
    for i, (start, end) in enumerate(unique_pos):
        # 文本从标题后开始，到下一个标题前结束
        part_start = end
        part_end = unique_pos[i + 1][0] if i + 1 < len(unique_pos) else len(text)
        part_text = text[part_start:part_end].strip()
        
        # 清理 Directions 残留
        lines = part_text.split('\n')
        clean_lines = []
        skip = False
        for line in lines:
            s = line.strip().lower()
            if s.startswith('direction') or any(kw in s for kw in ['answer sheet', 'four choices']):
                skip = True
                continue
            if skip and line.strip():
                if looks_like_article_content(line.strip()):
                    skip = False
                else:
                    continue
            if line.strip():
                clean_lines.append(line)
        
        cleaned = '\n'.join(clean_lines).strip()
        if cleaned and len(cleaned) > 20:
            parts.append(cleaned)
    
    return parts


def looks_like_article_text_line(line: str) -> bool:
    if len(line) < 30:
        return False
    alpha_ratio = sum(1 for c in line if c.isalpha() and ord(c) < 128) / len(line)
    return alpha_ratio > 0.5


def extract_article(text: str, sec_type: str) -> str:
    """
    从题目前的文本中提取文章内容
    """
    lines = text.split('\n')
    
    # 过滤掉 Directions 和说明文字
    article_lines = []
    in_directions = False
    
    skip_keywords = ['directions:', 'directions', 'choose the best', 'mark your answer',
                     'answer sheet', 'each blank', 'for each of', 'there are four choices',
                     'read the following', 'translate the underlined', 'you are asked to']
    
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        
        if not stripped:
            continue
        
        # 跳过 Directions 行
        if lower.startswith('direction') or any(kw in lower for kw in skip_keywords):
            in_directions = True
            continue
        
        # Directions 通常有多行，遇到看起来像正文时结束
        if in_directions:
            if looks_like_article_line(stripped):
                in_directions = False
            elif stripped:
                continue
        
        if looks_like_article_line(stripped):
            article_lines.append(stripped)
    
    result = '\n'.join(article_lines).strip()
    
    # 如果没提取到，返回原始清理后的文本
    if not result:
        result = strip_directions_only(text).strip()
    
    return result[:8000]


def looks_like_article_line(line: str) -> bool:
    """判断一行是否像英文文章内容"""
    if not line or len(line) < 5:
        return False
    
    # 不是选项行
    if re.match(r'^\s*\[?[A-G]\]?[\.)\]]', line):
        return False
    
    # 不以题号开头
    if re.match(r'^\s*\d{1,2}\s*[.\)]', line):
        return False
    
    # 英文字符占比高
    alpha_count = sum(1 for c in line if c.isalpha() and ord(c) < 128)
    if len(line) > 10 and alpha_count / len(line) < 0.3:
        return False
    
    # 以英文单词开头
    if line[0].isalpha() and ord(line[0]) < 128:
        return True
    
    # 包含足够多的英文内容
    if alpha_count > 10:
        return True
    
    return False


def strip_directions_only(text: str) -> str:
    """只移除明显的 Directions 说明，保留其余"""
    lines = text.split('\n')
    result = []
    for line in lines:
        s = line.strip()
        lower = s.lower()
        if not s:
            result.append(line)
        elif any(kw in lower for kw in ['directions:', 'directions']):
            continue
        elif any(kw in lower for kw in ['answer sheet', 'mark your answer', 'four choices']):
            continue
        else:
            result.append(line)
    return '\n'.join(result)



def extract_cloze_by_coordinates(pdf_path: str, q_range: tuple, sec_def: dict) -> list:
    """使用字符坐标提取完形填空选项 — 解决 PDF 双栏排版导致的选项丢失问题

    考研英语完形填空的 PDF 排版通常是 4 列单行横排：
        [A] word   [B] word    word     [D] word    N.
    其中 [C] 标记经常丢失，但 C 列文字在固定 X 位置。
    
    算法：
      1. 按 Y 坐标聚类找出所有选项行（含 ≥2 个 [A-D] 标签的行）
      2. 对每行的非标记文字按 X 坐标分配到 A/B/C/D 四列
      3. 按顺序与题号匹配
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # 先定位完形填空所在的页面（通过查找题号）
            cloze_pages = []
            for i, page in enumerate(pdf.pages):
                text = (page.extract_text() or '')[:2000]
                # 检查是否有完形填空的题目（1-20的小号题）
                if re.search(r'\b[1-9]\.\s*\[A\]|\b1\d?\.\s*\[A\]', text):
                    cloze_pages.append(i)
            
            if not cloze_pages:
                print(f"    Warning: no cloze pages found")
                return []

            # 只从相关页面提取 words
            all_words = []
            for idx in cloze_pages:
                page = pdf.pages[idx]
                words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=True)
                if words:
                    all_words.extend(words)
            page_count = len(pdf.pages)
    except Exception as e:
        print(f"    Warning: coordinate extraction failed ({e}), falling back")
        return []

    if not all_words:
        return []

    # ===== 第一步：按 Y 聚类找选项行 =====
    labels_by_y = {}  # rounded_top -> [(label, x0)]
    for w in all_words:
        t = w.get('text', '').strip()
        m = re.match(r'^\[([A-D])\]$', t)
        if m:
            ry = round(w['top'], 0)
            labels_by_y.setdefault(ry, []).append((m.group(1).upper(), w['x0']))

    # 只保留有 ≥2 个标签的行（真正的选项行）
    option_rows_y = {y: lbs for y, lbs in labels_by_y.items() if len(lbs) >= 2}

    if not option_rows_y:
        return []

    # ===== 第二步：动态计算列边界 =====
    col_x = {l: [] for l in 'ABCD'}
    for lbs in labels_by_y.values():
        for label, x in lbs:
            col_x[label].append(x)

    centers = {}
    for label in 'ABCD':
        if col_x[label]:
            positions = sorted(col_x[label])
            centers[label] = positions[len(positions) // 2]

    sorted_centers = sorted(centers.items(), key=lambda x: x[1])
    col_bounds = {}
    for i, (label, center) in enumerate(sorted_centers):
        lo = (sorted_centers[i-1][1] + center) / 2 if i > 0 else center - 50
        hi = (center + sorted_centers[i+1][1]) / 2 if i < len(sorted_centers)-1 else center + 80
        col_bounds[label] = (lo, hi)

    def col_for_x(x):
        for label, (lo, hi) in col_bounds.items():
            if lo <= x <= hi:
                return label
        return None

    def clean_option_text(text):
        """清理选项文本中的垃圾"""
        text = re.sub(r'^\s*\[?[A-D]\]?[\.\)]?\s*', '', text)  # 去标签残留
        text = re.sub(r'^\d{1,2}\s*[.\)]?\s*', '', text)       # 去题号
        text = re.sub(r'[\[\]cC\].]+', '', text)                 # 去破损标记
        text = re.sub(r'^[;:\s]+', '', text)                     # 去前导标点
        return text.strip()

    # ===== 第三步：对每个选项行提取四列文字 =====
    sorted_rows = sorted(option_rows_y.items())
    extracted_rows = []

    for row_y, labels in sorted_rows:
        # 只取此行(±0.5pt容差)的非标记文字
        row_words = [w for w in all_words if abs(w['top'] - row_y) <= 0.5]
        
        cols = {'A': [], 'B': [], 'C': [], 'D': []}
        for w in sorted(row_words, key=lambda c: c['x0']):
            t = w.get('text', '').strip()
            if not t or re.match(r'^\[([A-D])\]$', t):
                continue
            label = col_for_x(w['x0'])
            if label:
                cols[label].append(t)

        choices = []
        for label in 'ABCD':
            raw = ' '.join(cols[label])
            clean = clean_option_text(raw)
            choices.append({'label': label, 'text': clean[:200]})
        
        has_content = any(c['text'] for c in choices)
        extracted_rows.append({
            'y': row_y,
            'choices': _normalize_choices(choices) if has_content else [],
            'has_content': has_content,
        })

    # ===== 第四步：与题号匹配 =====
    q_numbers = []
    for w in all_words:
        t = w.get('text', '').strip()
        m = re.match(r'^(\d{1,2})\.$', t)
        if m:
            q_numbers.append({'num': int(m.group(1)), 'top': round(w['top'], 0)})
    q_numbers.sort(key=lambda x: x['top'])

    result = []
    used_q_nums = set()

    for idx, row_data in enumerate(extracted_rows):
        # 按顺序配对为主
        best_q = None
        if idx < len(q_numbers):
            candidate = q_numbers[idx]
            if candidate['num'] not in used_q_nums and q_range[0] <= candidate['num'] <= q_range[1]:
                if abs(candidate['top'] - row_data['y']) < 30:
                    best_q = candidate

        # 备用：搜索最近的有效题号
        if best_q is None:
            for q in q_numbers:
                if q['num'] in used_q_nums or not (q_range[0] <= q['num'] <= q_range[1]):
                    continue
                dist = abs(q['top'] - row_data['y'])
                if dist < 25:
                    best_q = q
                    break

        if best_q is None:
            continue

        used_q_nums.add(best_q['num'])
        result.append({
            'number': best_q['num'],
            'stem': '',
            'choices': row_data['choices'],
            'type': 'choice',
        })

    # 补齐缺失
    found_nums = {q['number'] for q in result}
    for n in range(q_range[0], q_range[1] + 1):
        if n not in found_nums:
            result.append(make_placeholder(n, 'choice'))

    result.sort(key=lambda x: x['number'])
    return result


def extract_questions_in_range(text: str, q_range: tuple, sec_type: str) -> list:
    """
    从文本块中提取指定范围内的题目
    """
    # 全局预处理：修复 ] → J 问题
    text = fix_bracket_j_issue(text)
    
    questions = []
    
    if sec_type in ('new_type',):
        questions = extract_new_type_questions(text, q_range)
    elif sec_type == 'translation':
        questions = extract_translation_questions(text, q_range)
    else:
        # 标准：按题号切分
        pattern = re.compile(
            r'^(\s*)(\d{1,2})\s*[.\)）]\s*',
            re.MULTILINE
        )
        splits = list(pattern.finditer(text))
        
        for i, match in enumerate(splits):
            num = int(match.group(2))
            
            if num < q_range[0] or num > q_range[1]:
                continue
            
            start = match.start()
            end = splits[i + 1].start() if i + 1 < len(splits) else start + 2000
            
            q_block = text[start:end]
            question = parse_single_question(q_block, num, sec_type)
            questions.append(question)
    
    # 如果没有提取到任何题目，创建占位
    if not questions:
        for n in range(q_range[0], q_range[1] + 1):
            questions.append(make_placeholder(n, sec_type))
    
    return questions


def extract_new_type_questions(text: str, q_range: tuple) -> list:
    """提取新题型题目（7选5/排序等）
    
    格式通常是文章中有 (41) __________ 这样的空格，
    后面有 [A]...[G] 选项列表
    """
    questions = []
    
    # 找所有括号题号 (41) (42) 等
    pat = re.compile(r'\(\s*(\d{1,2})\s*\)')
    
    for m in pat.finditer(text):
        num = int(m.group(1))
        if num < q_range[0] or num > q_range[1]:
            continue
        
        # 取该题号前后的一段上下文作为"题干"
        ctx_start = max(0, m.start() - 200)
        ctx_end = min(len(text), m.end() + 300)
        context = text[ctx_start:ctx_end].strip()
        
        # 清理多余空白
        context = re.sub(r'\s+', ' ', context).strip()
        
        questions.append({
            'number': num,
            'stem': context[:500],
            'choices': [],
            'type': 'new_type',
        })
    
    # 提取 A-G 选项（通常在文章后面或下一页）
    options = extract_new_type_options(text)
    if options and len(options) > 0:
        # 将选项附加到每个题目上（新题型是共享选项池）
        for q in questions:
            q['choices'] = options
    
    return questions


def extract_new_type_options(text: str) -> list:
    """提取新题型 A-G 选项"""
    choices = []
    for label in ['A','B','C','D','E','F','G']:
        found = False
        
        # 方式1：[A] 格式
        m1 = re.search(r'\[' + label + r'\]\s*(.{10,})', text, re.DOTALL)
        if m1 and not found:
            opt_text = m1.group(1).replace('\n', ' ').strip()
            opt_text = re.sub(r'\s+', ' ', opt_text)[:300]
            # 确保不是截取到下一个选项
            for next_label in ['B','C','D','E','F','G']:
                if next_label > label:
                    cut = opt_text.find(f'[{next_label}]')
                    if cut > 20:
                        opt_text = opt_text[:cut].strip()
                        break
            if opt_text and len(opt_text) > 3:
                choices.append({'label': label, 'text': opt_text})
                found = True
        
        # 方式2：A. 格式
        if not found:
            m2 = re.search(r'\b' + label + r'\.\s*(.{10,})', text)
            if m2:
                opt_text = m2.group(1).replace('\n', ' ').strip()
                opt_text = re.sub(r'\s+', ' ', opt_text)[:300]
                if opt_text and len(opt_text) > 3:
                    choices.append({'label': label, 'text': opt_text})
    
    return choices


def extract_translation_questions(text: str, q_range: tuple) -> list:
    """提取翻译句子
    
    考研英语翻译格式：
    - (46) This movement, driven by..., shaped...
    - ( 46) sentence...  (括号内数字可能带空格)
    - 也可能跨多行与正文交织
    
    策略：先定位所有题号锚点，再截取相邻锚点之间的文本作为各句
    """
    text = fix_bracket_j_issue(text)
    
    # ===== 第一步：定位所有 (数字) 格式的题号锚点 =====
    anchor_pattern = re.compile(r'\(\s*(\d{1,2})\s*\)', re.MULTILINE)
    
    anchors = []  # [(num, start_pos, end_pos), ...]
    for m in anchor_pattern.finditer(text):
        num = int(m.group(1))
        if q_range[0] <= num <= q_range[1]:
            anchors.append((num, m.start(), m.end()))
    
    # 如果一个锚点都没找到，尝试 fallback：用数字. 格式
    if not anchors:
        return _extract_translation_fallback(text, q_range)
    
    # ===== 第二步：按锚点位置切分句子 =====
    questions = []
    for i, (num, start, end) in enumerate(anchors):
        # 当前句子的内容从锚点结束后开始
        content_start = end
        
        # 当前句子的结束位置 = 下一个锚点的开始（如果有）
        if i + 1 < len(anchors):
            content_end = anchors[i + 1][1]
        else:
            # 最后一句：取后面一大段文本（但要合理截断）
            content_end = min(len(text), start + 1500)
        
        raw_sent = text[content_start:content_end]
        
        # 清理和修剪
        sent = _clean_translation_sentence(raw_sent, num)
        
        if len(sent) > 5:
            questions.append({
                'number': num,
                'stem': sent[:600],
                'choices': [],
                'type': 'translation',
            })
    
    # ===== 第三步：补齐缺失的题号 =====
    found_nums = {q['number'] for q in questions}
    for n in range(q_range[0], q_range[1] + 1):
        if n not in found_nums:
            # 尝试在更大范围内搜索
            extra = _search_missing_translation(text, n)
            questions.append(extra)
    
    # 按题号排序
    questions.sort(key=lambda x: x['number'])
    
    return questions


def _clean_translation_sentence(raw: str, num: int) -> str:
    """清理单条翻译句子"""
    sent = raw.strip()
    
    # 合并换行和多余空白
    sent = re.sub(r'\s+', ' ', sent).strip()
    
    # 去掉末尾的中文提示/括号注释
    # 模式：（xxx）或 (xxx) 在末尾
    sent = re.sub(r'[（(][^）)]{0,80}[）)]?\s*$', '', sent).strip()
    
    # 去掉末尾的 Directions 残留 / 干扰文本
    # 通常句子以 . ! ? 结尾，后面的内容不属于翻译句
    terminal_patterns = [
        r'(?<=[.!?])\s*(?:Directions|Section|Part|translate|Read the|Your translation)[^.]*$',
        r'\s+(?:Directions|Section|Part\s+[A-D]|Answer\s*Sheet)[^.]*$',
        r'\s+\d{2}\.\s.*$',  # 后面紧跟其他题号的内容
    ]
    for p in terminal_patterns:
        sent = re.sub(p, '', sent, flags=re.IGNORECASE).strip()
    
    # 去掉开头的空白字符和可能的垃圾
    sent = sent.lstrip(' ,.;\n\r')
    
    # 去掉选项残留（误匹配时可能出现）
    sent = re.sub(r'^\s*\[[A-D]\]\s*', '', sent).strip()
    
    return sent


def _search_missing_translation(text: str, num: int) -> dict:
    """搜索缺失的翻译题号，使用更宽泛的模式"""
    
    # 尝试1：带空格的括号 ( 46) 或 (46)
    patterns = [
        rf'\(\s*{num}\s*\)\s*(.{{20,}})',
        rf'(?:^|\n)\s*{num}\s*[.)\]]\s*(.{{20,}})',
    ]
    
    for p in patterns:
        m = re.search(p, text, re.MULTILINE | re.DOTALL)
        if m:
            sent = m.group(1) if m.lastindex >= 1 else m.group(0)
            sent = _clean_translation_sentence(sent, num)
            if len(sent) > 5:
                return {
                    'number': num,
                    'stem': sent[:600],
                    'choices': [],
                    'type': 'translation',
                }
    
    # 都没找到 → 占位
    return {
        'number': num,
        'stem': f'第{num}题（未提取到内容）',
        'choices': [],
        'type': 'translation',
        'warning': True,
    }


def _extract_translation_fallback(text: str, q_range: tuple) -> list:
    """fallback：当括号格式完全失败时，用数字. 格式提取"""
    questions = []
    
    pat = re.compile(
        r'(?:^|\n)\s*(\d{1,2})\s*[.\)]\s*(.{20,})',
        re.MULTILINE
    )
    
    seen = set()
    for m in pat.finditer(text):
        num = int(m.group(1))
        if num < q_range[0] or num > q_range[1] or num in seen:
            continue
        seen.add(num)
        
        sent = _clean_translation_sentence(m.group(2), num)
        if len(sent) > 5:
            questions.append({
                'number': num,
                'stem': sent[:600],
                'choices': [],
                'type': 'translation',
            })
    
    # 补齐
    found_nums = {q['number'] for q in questions}
    for n in range(q_range[0], q_range[1] + 1):
        if n not in found_nums:
            questions.append({
                'number': n,
                'stem': f'第{n}题（未提取到内容）',
                'choices': [],
                'type': 'translation',
                'warning': True,
            })
    
    questions.sort(key=lambda x: x['number'])
    return questions


def parse_single_question(block: str, number: int, sec_type: str) -> dict:
    """解析单道题目"""
    block = fix_bracket_j_issue(block).strip()
    
    # 移除开头的题号
    stem_text = re.sub(r'^\s*\d{1,2}\s*[.\)）]\s*', '', block).strip()
    
    if sec_type in ('choice', 'cloze', 'reading'):
        return parse_choice_question(stem_text, number)
    elif sec_type == 'new_type':
        return parse_new_type_question(stem_text, number)
    elif sec_type == 'translation':
        return parse_translation_question(stem_text, number)
    elif sec_type in ('writing_small', 'writing_big'):
        return parse_writing_prompt(stem_text, number, sec_type)
    else:
        return {
            'number': number,
            'stem': stem_text[:500],
            'choices': [],
            'type': sec_type,
        }


def _is_garbage_option_text(opt_text: str) -> bool:
    """判断选项文本是否是垃圾数据（包含下一题的内容等）
    
    垃圾特征：
    - 包含题目编号如 "9. [A]" 或 "10."
    - 以 [A-D] 开头（说明吃到了下一个选项标记）
    - 过长（超过 60 字符，正常完形填空选项不会这么长）
    """
    if not opt_text:
        return True
    # 包含下一题的题号模式
    if re.search(r'\d{1,2}\s*[.)\]]\s*\[?[A-D]', opt_text):
        return True
    # 以选项标记开头（说明截取到了下一个选项）
    if re.match(r'^\s*\[?[A-D][\.\)]', opt_text):
        return True
    # 完形填空选项通常不超过 30 字符，阅读选项通常不超 100
    # 超过 80 的很可能是合并了多个选项
    if len(opt_text.strip()) > 80:
        return True
    return False


def _normalize_choices(choices: list) -> list:
    """确保 choices 包含完整的 A/B/C/D 四个选项，缺失的用空字符串补齐"""
    choice_map = {ch['label'].upper(): ch['text'] for ch in choices}
    result = []
    for label in ['A', 'B', 'C', 'D']:
        text = choice_map.get(label, '')
        result.append({'label': label, 'text': text})
    return result


def parse_choice_question(text: str, number: int) -> dict:
    """解析选择题（含选项 A B C D）
    
    处理多种格式：
    - 完形填空：'1. [A] on      [B] like     [C] for     [D] from' （选项同行）
    - 阅读：'21. Question?\n[A] opt1\n[B] opt2\n[C] opt3\n[D] opt4'
    - 损坏格式：'[AJ on   [BJ like' （]被识别为J）
    - PDF双栏掉行：'[A] x [B] y [D] z \\n [c]' （C选项跑到下一行）
    """
    # 先做预处理
    text = fix_bracket_j_issue(text)

    # ===== 特殊处理完形填空格式（所有选项在一行或跨两行）=====
    # 匹配: [A] word [B] word [C] word [D] word
    # 使用 DOTALL 让 . 能匹配换行（处理 [C] 掉到下一行的情况）
    inline_pattern = re.compile(r'\[([A-D])\]\s*(.+?)\s*(?=\[[A-D]\]|\Z)', re.IGNORECASE | re.DOTALL)
    inline_matches = list(inline_pattern.finditer(text))

    if len(inline_matches) >= 3:
        # 这是完形填空格式（可能有跨行问题）
        choices = []
        stem = ''

        # 题干在第一个 [A] 之前
        first_a = inline_matches[0]
        before_first = text[:first_a.start()].strip()
        # 去掉开头的题号
        stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', before_first).strip()

        for m in inline_matches:
            label = m.group(1).upper()
            opt_text = m.group(2).strip()
            # 清理选项文本中的多余空白和换行
            opt_text = re.sub(r'\s+', ' ', opt_text).strip()
            # 过滤垃圾数据（吃到下一题内容的情况）
            if opt_text and not _is_garbage_option_text(opt_text):
                choices.append({'label': label, 'text': opt_text[:200]})

        # 标准化：确保始终有 A/B/C/D 四项
        choices = _normalize_choices(choices)

        return {
            'number': number,
            'stem': stem[:500],
            'choices': choices,
            'type': 'choice',
        }

    # ===== 标准多行格式 =====
    # 注意：这里不要预先合并空白，保留换行以便正确切分选项
    choice_pattern = re.compile(
        r'\[([A-D])\]\s*|([A-D])[\.\)]\s*',
        re.MULTILINE | re.IGNORECASE
    )

    choices = []
    choice_matches = list(choice_pattern.finditer(text))

    if choice_matches:
        stem_end = choice_matches[0].start()
        stem = text[:stem_end].strip()
    else:
        stem = text

    for idx, cm in enumerate(choice_matches):
        label = (cm.group(1) or cm.group(2)).upper()
        opt_start = cm.end()
        opt_end = choice_matches[idx + 1].start() if idx + 1 < len(choice_matches) else len(text)
        opt_text = text[opt_start:opt_end].strip()
        opt_text = re.sub(r'^\s*\[?[A-D]\]?[\.)\]】]?\s*', '', opt_text).strip()
        opt_text = re.sub(r'\s+', ' ', opt_text).strip()

        if opt_text and not _is_garbage_option_text(opt_text):
            choices.append({'label': label, 'text': opt_text[:300]})

    # 标准化：确保 A/B/C/D 完整
    choices = _normalize_choices(choices)

    stem = re.sub(r'\s+', ' ', stem).strip()
    stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', stem).strip()

    return {
        'number': number,
        'stem': stem[:800],
        'choices': choices,
        'type': 'choice',
    }


def fix_bracket_j_issue(text: str) -> str:
    """修复 PDF 提取中 ] 被误识别为 J 的问题
    
    例如：
      [AJ on   [BJ like   →   [A] on   [B] like
      [CJ for  [DJ from  →   [C] for  [D] from
      [A J word           →   [A] word
    """
    # 模式1：[字母J + 空格/换行 + 大写字母（最常见的）
    text = re.sub(r'\[([A-D])\s*J\s*([A-Z])', r'[\1] \2', text)
    # 模式2：[字母J 直接跟小写（无空格）
    text = re.sub(r'\[([A-D])J([a-z])', r'[\1]\2', text)
    # 模式3：[字母 + 空格 + J（有空格变体）
    text = re.sub(r'\[([A-D])\s+J\b', r'[\1]', text)
    # 模式4：更激进的清理 —— [A-J 或 [B-J 等，只要后面不是正常的 ]
    # 只在选项上下文中应用：[XJ 后面跟着空格或行尾或另一个 [
    text = re.sub(r'\[([A-D])J(?:\s|$|\s*\[)', r'[\1]', text)
    
    return text


def parse_new_type_question(text: str, number: int) -> dict:
    """解析新题型（可能是7选5、排序等）"""
    stem = text.split('[A]')[0] if '[A]' in text else text.split('A.')[0] if 'A.' in text else text
    stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', stem).strip()
    stem = re.sub(r'\s+', ' ', stem).strip()
    
    # 新题型可能有很多选项
    choices = []
    for label in ['A','B','C','D','E','F','G']:
        pat = re.compile(r'\[?' + label + r'\]?[\.)\]】]\s*([^A-G\n]*(?:\n(?!\[?[A-G]\]?[\.)\]])[^A-G\n]*)*)', re.IGNORECASE)
        m = pat.search(text)
        if m and m.group(1).strip():
            choices.append({'label': label, 'text': m.group(1).strip().replace('\n', ' ')[:200]})
    
    return {
        'number': number,
        'stem': stem[:500],
        'choices': choices,
        'type': 'new_type',
    }


def parse_translation_question(text: str, number: int) -> dict:
    """解析翻译题"""
    # 移除题号前缀
    sent = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', text).strip()
    
    # 翻译题通常是一句英文，可能带括号注释
    # 去掉尾部的中文提示
    sent = re.sub(r'[（(][^）)]*[）)]?\s*$', '', sent).strip()
    sent = re.sub(r'\s+', ' ', sent).strip()
    
    return {
        'number': number,
        'stem': sent[:600],
        'choices': [],
        'type': 'translation',
    }


def parse_writing_prompt(text: str, number: int, sec_type: str) -> dict:
    """解析写作要求"""
    prompt = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', text).strip()
    prompt = re.sub(r'\s+', ' ', prompt).strip()
    
    # 写作部分通常有 Directions + 要求
    wtype = 'small' if 'small' in sec_type else 'big'
    
    return {
        'number': number,
        'stem': prompt[:1000],
        'choices': [],
        'type': f'writing_{wtype}',
    }


def make_placeholder(number: int, sec_type: str) -> dict:
    """创建占位题目"""
    return {
        'number': number,
        'stem': f'第{number}题（未提取到内容）',
        'choices': [],
        'type': sec_type,
        'warning': True,
    }


def process_pdf(pdf_path: str, year: int) -> dict:
    """处理单个 PDF 文件，返回结构化数据"""
    print(f"\n{'─'*60}")
    print(f"Processing: {os.path.basename(pdf_path)} ({year})")
    print(f"{'─'*60}")
    
    if not os.path.exists(pdf_path):
        return {'error': f'File not found: {pdf_path}', 'year': year}
    
    # 1. 提取页面文本
    pages = extract_pages(pdf_path, skip_first=True)
    print(f"  Extracted {len(pages)} content pages")
    
    if not pages:
        return {'error': 'No text extracted', 'year': year}
    
    # 2. 合并全文并分析
    full_text = '\n\n'.join([p[1] for p in pages])
    
    # 3. 找所有题号
    qnums = find_all_question_numbers(full_text)
    max_num = max(q['number'] for q in qnums) if qnums else 0
    print(f"  Found {len(qnums)} questions, max_number={max_num}")
    
    # 4. 检测年代
    era_key, config = detect_era(full_text, max_num)
    print(f"  Detected era: {config['label']}")
    
    # 5. 按 Section 分割
    sections = split_into_sections(pages, era_key, config, pdf_path=pdf_path)
    
    # 统计
    total_extracted = sum(len(sec['questions']) for sec in sections.values())
    print(f"  Extracted {total_extracted} questions across {len(sections)} sections")
    
    for key, sec in sections.items():
        qcount = len(sec['questions'])
        art_len = len(sec.get('article', ''))
        warns = sec.get('warnings', [])
        status = f"{qcount} questions"
        if art_len > 50:
            status += f", {art_len} chars article"
        if warns:
            status += f", warnings: {warns}"
        print(f"    [{key}] {sec.get('name','?')}: {status}")
    
    return {
        'year': year,
        'filename': os.path.basename(pdf_path),
        'era': era_key,
        'era_label': config['label'],
        'total_pages': len(pages) + 1,  # +1 for skipped cover
        'max_question_number': max_num,
        'found_question_count': len(qnums),
        'extracted_question_count': total_extracted,
        'sections': sections,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 处理所有 exam PDF
    all_results = {}
    
    year_files = [
        # 1980-2009
        ('1986-1995', 1986), ('1996', 1996), ('1997', 1997), ('1998', 1998),
        ('1999', 1999), ('2000', 2000), ('2001', 2001), ('2002', 2002),
        ('2003', 2003), ('2004', 2004), ('2005', 2005), ('2006', 2006),
        ('2007', 2007), ('2008', 2008), ('2009', 2009),
    ]
    # 添加2010-2025
    for y in range(2010, 2026):
        year_files.append((str(y), y))
    
    for fname, year in year_files:
        if year <= 2009:
            path = BASE_DIR / "1980-2009/exam" / f"{fname}.pdf"
        else:
            path = BASE_DIR / "2010-2025/exam" / f"{fname}.pdf"
        
        result = process_pdf(str(path), year)
        
        if 'error' not in result or result.get('sections'):
            # 保存单独的JSON
            out_path = OUTPUT_DIR / f"{year}.json"
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            all_results[str(year)] = {
                'year': year,
                'status': 'ok' if not result.get('error') else 'partial',
                'questions': result.get('extracted_question_count', 0),
                'sections': list(result.get('sections', {}).keys()),
                'file': f"{year}.json",
            }
        else:
            all_results[str(year)] = {
                'year': year,
                'status': 'error',
                'error': result.get('error', 'Unknown'),
            }
    
    # 保存索引文件
    index_path = OUTPUT_DIR / "index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*60}")
    print(f"DONE! Processed {len(all_results)} years.")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Index: {index_path}")
    
    # 统计汇总
    ok = sum(1 for v in all_results.values() if v.get('status') == 'ok')
    partial = sum(1 for v in all_results.values() if v.get('status') == 'partial')
    err = sum(1 for v in all_results.values() if v.get('status') == 'error')
    print(f"  OK: {ok}, Partial: {partial}, Error: {err}")


if __name__ == '__main__':
    main()
