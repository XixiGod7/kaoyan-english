#!/usr/bin/env python3
"""
考研英语真题 PDF 结构化提取器 v2
================================
使用 pdfplumber 提取文本，按题型分组输出 JSON

核心策略：
  1. 跳过第1页（考生须知）
  2. 采用稳健的顺序 Section 边界定位器，划分大区域
  3. 在每个区域内进行对应的专用题型解析
  4. 自动检测试卷年代和类型（英一/英二）
"""
import pdfplumber
import json
import re
import os
import sys
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent / "public" / "pdfs"
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "data"

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
    'era2': {  # 2002-2004
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
    """清理文本中的噪声行，并剔除由于编码造成的乱码和中文字符"""
    # 剔除所有的中文字符和特殊的乱码符号 (\uFFFD 是常见的 PDF 乱码替代符, )
    text = re.sub(r'[\u4e00-\u9fa5\uFFFD]+', '', text)
    
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
                # 去除跨页的乱码页眉/页脚，如 "2010英语（一）... 10页"
                text = re.sub(r'(?m)^\s*20[12]\d[^\n]*\d+[^\n]*\d+[^\n]*$', '', text)
                # 清理CID编码垃圾
                text = re.sub(r'\(cid:\d+\)', '', text)
                
                # 关键修复1：括号内的数字可能被拆开 "( 4 7)" → "(47)"
                text = re.sub(r'\(\s*(\d)\s+(\d)\s*\)', lambda m: f'({m.group(1)}{m.group(2)})', text)
                text = re.sub(r'(?<=\()\s*(\d)\s+(\d)(?=\))', r'\1\2', text)
                
                # 关键修复2：] 被提取为 J（字体编码问题）
                text = fix_bracket_j_issue(text)
                
                text = clean_text(text)
                if text.strip():
                    pages.append((i + 1, text.strip()))
            except Exception as e:
                print(f"  Warning: Page {i+1} extract failed: {e}")
    
    return pages


def detect_era(full_text: str, max_question_num: int) -> tuple:
    """
    根据文本特征和最大题号检测试卷年代和类别（英一/英二）
    """
    has_listening = bool(re.search(r'(?:听力|Listening|Section I\s*(?:Listening))', full_text, re.I))
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
    """
    results = []
    seen_numbers = set()
    
    patterns = [
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*[.)\]]\s*([A-Z\[（\u4e00-\u9fff])', re.MULTILINE),
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s+\.\s+([A-Z\[（\u4e00-\u9fff])', re.MULTILINE),
        re.compile(r'(?:^|\n)\s{0,30}(\d{1,2})\s*\.\s*\[?[A-D]\]', re.MULTILINE),
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
    
    paren_patterns = [
        re.compile(r'\(\s*(\d{1,2})\s*\)[\s_]*(?:[A-Za-z\u4e00-\u9fff])', re.MULTILINE),
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
    
    results.sort(key=lambda x: x['start'])
    return results


# ==================== 稳健解析逻辑 ====================

def split_into_sections(pages: list, era_key: str, config: dict, pdf_path: str = '') -> dict:
    """
    将页面文本按 Section 分割并结构化提取题目
    """
    full_text = '\n\n'.join([p[1] for p in pages])
    
    # 1. 顺序定位 Section Headers，划分文本块
    bounds = locate_section_boundaries(full_text, era_key, config)
    
    # 2. 构造各个 section 的文本块
    blocks = {}
    block_spans = {}

    # cloze block
    end_idx = bounds.get('reading_a', len(full_text))
    blocks['cloze'] = full_text[0:end_idx]
    block_spans['cloze'] = (0, end_idx)

    # reading-a block
    start_idx = bounds.get('reading_a', 0)
    end_idx = bounds.get('new_type', len(full_text))
    blocks['reading-a'] = full_text[start_idx:end_idx]
    block_spans['reading-a'] = (start_idx, end_idx)

    # new-type block
    start_idx = bounds.get('new_type', 0)
    end_idx = bounds.get('translation', len(full_text))
    blocks['new-type'] = full_text[start_idx:end_idx]
    block_spans['new-type'] = (start_idx, end_idx)

    # translation block
    start_idx = bounds.get('translation', 0)
    end_idx = bounds.get('writing_a', len(full_text))
    blocks['translation'] = full_text[start_idx:end_idx]
    block_spans['translation'] = (start_idx, end_idx)

    # writing-a block
    start_idx = bounds.get('writing_a', 0)
    end_idx = bounds.get('writing_b', len(full_text))
    blocks['writing-a'] = full_text[start_idx:end_idx]
    block_spans['writing-a'] = (start_idx, end_idx)

    # writing-b block
    start_idx = bounds.get('writing_b', 0)
    blocks['writing-b'] = full_text[start_idx:]
    block_spans['writing-b'] = (start_idx, len(full_text))

    page_map = []
    curr = 0
    for p in pages:
        plen = len(p[1])
        page_map.append((p[0] - 1, curr, curr + plen))
        curr += plen + 2
    blocks['writing-b'] = full_text[start_idx:]

    sections = {}
    
    # 3. 按 Section 分别处理
    for sec_def in config['sections']:
        key = sec_def['key']
        sec_range = sec_def['range']
        sec_type = sec_def['type']
        
        # 计算该 section 跨越的页码
        sec_range_idx = block_spans.get(key, (0, 0))
        sec_pages = []
        for p_num, p_start, p_end in page_map:
            # 判断两区间是否有重叠
            if max(p_start, sec_range_idx[0]) < min(p_end, sec_range_idx[1]):
                sec_pages.append(p_num)
        
        block_text = blocks.get(key, '')
        
        if not block_text.strip():
            # 没文本 -> 创建占位
            sections[key] = {
                'name': sec_def['name'],
                'type': sec_type,
                'question_range': list(sec_range),
                'text': '',
                'article': '',
                'questions': [make_placeholder(n, sec_type) for n in range(sec_range[0], sec_range[1] + 1)],
                'warnings': ['文本未匹配到'],
            }
            sections[key]['page_numbers'] = list(set(sec_pages))
            continue
            
        questions = []
        article = ''
        
        if sec_type == 'cloze':
            article, questions = parse_cloze_block(block_text, sec_range)
            if pdf_path and os.path.exists(pdf_path):
                coord_questions = extract_cloze_by_coordinates(pdf_path, sec_range, sec_def)
                if coord_questions:
                    # Update questions with robust coordinate extraction
                    # Only override if the coordinate extraction actually found choices
                    if any(q.get('choices') for q in coord_questions):
                        questions = coord_questions
        elif sec_type in ['choice', 'reading']:
            sections[key] = parse_reading_block(block_text, sec_range, sec_def)
            sections[key]['page_numbers'] = list(set(sec_pages))
            continue
        elif sec_type == 'new_type':
            questions = parse_new_type_block(block_text, sec_range)
            article = extract_new_type_article(block_text)
        elif sec_type == 'translation':
            questions = parse_translation_block(block_text, sec_range)
            article = extract_translation_article(block_text, questions)
            
        elif sec_type == 'writing_small':
            questions = [parse_writing_block(block_text, sec_range[0], 'writing_small')]
            
        elif sec_type == 'writing_big':
            questions = [parse_writing_block(block_text, sec_range[0], 'writing_big')]
            
        else:
            questions = extract_questions_in_range(block_text, sec_range, sec_type)
            
        # 补全缺失题目
        found_nums = {q['number'] for q in questions}
        for n in range(sec_range[0], sec_range[1] + 1):
            if n not in found_nums:
                questions.append(make_placeholder(n, sec_type))
        questions.sort(key=lambda x: x['number'])
        
        sections[key] = {
            'name': sec_def['name'],
            'type': sec_type,
            'question_range': list(sec_range),
            'text': block_text[:300],
            'article': article,
            'questions': questions,
            'warnings': [],
        }
        sections[key]['page_numbers'] = list(set(sec_pages))
        
    return sections


def locate_section_boundaries(full_text: str, era_key: str, config: dict) -> dict:
    """
    定位真题各个 Section 的起始索引。
    采用“Header 匹配为主，Question 题号/空白匹配为辅”的双重兜底策略。
    """
    bounds = {}
    total_len = len(full_text)
    
    # 依据年代配置获取预期的题号起始点
    q_reading_start = 21
    q_new_type_start = 41
    q_trans_start = 46
    q_write_a_start = 51 if era_key == 'era3' else 47
    q_write_b_start = 52 if era_key == 'era3' else 48
    
    bounds['cloze'] = 0
    
    # Reading A 起点
    sec_2_idx = -1
    m = re.search(r'Section\s*(?:II|Reading\s*Comprehension|阅读理解)', full_text, re.IGNORECASE)
    if m:
        sec_2_idx = m.start()
    else:
        m = re.search(r'\bText\s*1\b', full_text, re.IGNORECASE)
        if m:
            sec_2_idx = m.start()
        else:
            m = re.search(r'(?:^|\n|\s)\b' + str(q_reading_start) + r'\b\s*[\.\)]', full_text)
            if m:
                sec_2_idx = max(0, m.start() - 1000)
    bounds['reading_a'] = sec_2_idx if sec_2_idx != -1 else int(total_len * 0.1)
    
    # Reading B (New Type) 起点
    part_b_idx = -1
    search_start = bounds['reading_a']
    m = re.search(r'Part\s*[\.\s]*B\b|阅读\s*B\s*节|新\s*题\s*型', full_text[search_start:], re.IGNORECASE)
    if m:
        part_b_idx = search_start + m.start()
    else:
        m = re.search(r'\(\s*' + str(q_new_type_start) + r'\s*\)|\[\s*' + str(q_new_type_start) + r'\s*\]|\b' + str(q_new_type_start) + r'\b\s*[\.\)]', full_text[search_start:])
        if m:
            part_b_idx = max(search_start, search_start + m.start() - 500)
    bounds['new_type'] = part_b_idx if part_b_idx != -1 else int(total_len * 0.5)
    
    # Translation 起点
    part_c_idx = -1
    search_start = bounds['new_type']
    m = re.search(r'Part\s*[\.\s]*C\b|C\s*节|翻译\s*部分|Translation', full_text[search_start:], re.IGNORECASE)
    if m:
        part_c_idx = search_start + m.start()
    else:
        m = re.search(r'\(\s*' + str(q_trans_start) + r'\s*\)|\[\s*' + str(q_trans_start) + r'\s*\]|\b' + str(q_trans_start) + r'\b\s*[\.\)]', full_text[search_start:])
        if m:
            part_c_idx = max(search_start, search_start + m.start() - 500)
    bounds['translation'] = part_c_idx if part_c_idx != -1 else int(total_len * 0.7)
    
    # Writing A 起点
    sec_3_idx = -1
    search_start = bounds['translation']
    m = re.search(r'Section\s*(?:III|M|Writing|写作)|Part\s*[\.\s]*A\b', full_text[search_start:], re.IGNORECASE)
    if m:
        sec_3_idx = search_start + m.start()
    else:
        m = re.search(r'\b' + str(q_write_a_start) + r'\b\s*Directions', full_text[search_start:], re.IGNORECASE)
        if not m:
            m = re.search(r'\b' + str(q_write_a_start) + r'\b\s*[\.\)]', full_text[search_start:])
        if m:
            sec_3_idx = max(search_start, search_start + m.start() - 500)
    bounds['writing_a'] = sec_3_idx if sec_3_idx != -1 else int(total_len * 0.85)
    
    # Writing B 起点
    writing_b_idx = -1
    search_start = bounds['writing_a']
    m = re.search(r'Part\s*[\.\s]*B\b', full_text[search_start:], re.IGNORECASE)
    if m:
        writing_b_idx = search_start + m.start()
    else:
        m = re.search(r'\b' + str(q_write_b_start) + r'\b\s*Directions', full_text[search_start:], re.IGNORECASE)
        if not m:
            m = re.search(r'\b' + str(q_write_b_start) + r'\b\s*[\.\)]', full_text[search_start:])
        if m:
            writing_b_idx = max(search_start, search_start + m.start() - 200)
    bounds['writing_b'] = writing_b_idx if writing_b_idx != -1 else int(total_len * 0.92)
    
    return bounds


def fix_bracket_j_issue(text: str) -> str:
    """修复 PDF 提取中选项的各种破损和编码识别错误，归一化选项格式"""
    if not text:
        return ""
    # 0. 修复题号中包含空格的问题，如 "3 7." -> "37.", "3 8." -> "38."
    text = re.sub(r'\b(\d)\s+(\d)\b\s*([\.\)])', r'\1\2\3', text)
    
    # 1. 消除括号/中括号选项内部的空格，例如: "[ A]" / "[ B ]" / "[C ]" / "( A)"
    text = re.sub(r'\[\s*([A-G])\s*\]', r'[\1]', text)
    text = re.sub(r'\(\s*([A-G])\s*\)', r'[\1]', text)
    
    # 2. 修复中括号内字母 + J/j/I/1/l/| 等字体提取错误的异常
    text = re.sub(r'\[\s*([A-G])\s*[\]JjI1l|]\s*', r'[\1] ', text)
    text = re.sub(r'\[\s*([A-G])\s+J\b', r'[\1] ', text)
    text = re.sub(r'\[([A-G])J([a-z])', r'[\1] \2', text)
    text = re.sub(r'E([C-D])\]', r'[\1]', text)
    text = re.sub(r'L([A])\]', r'[\1]', text)
    text = re.sub(r'(\w)\s*J\s+(?=\[[A-D]|$)', r'\1] ', text)
    
    # 3. 修复没有前括号但有后括号的，例如 "A] " / "B) "（使用 lookbehind 避免重复 bracket）
    text = re.sub(r'(?<!\[)\b([A-G])\s*[\])]\s+', r'[\1] ', text)
    
    # 4. 修复双栏排版换行合并后可能的连写，例如 "[A]pauses[B]returns" -> "[A] pauses [B] returns"
    text = re.sub(r'\[([A-G])\]\s*([a-zA-Z])', r'[\1] \2', text)
    
    # 5. 确保选项前后有实际的空格
    text = re.sub(r'\[([A-G])\](?!\s)', r'[\1] ', text)
    
    # 6. 统一冒号/乱码冒号选项，如 "A]" / ":A]" / "A" -> "[A]"
    # 添加 \b 以防止匹配 "Directions: For questions" 中的 F
    text = re.sub(r'[:]\s*([A-G])\b\s*[\])]?', r' [\1] ', text)
    
    # 7. 统一单独字母跟点/右括号的选项，例如 " A. " -> " [A] "
    text = re.sub(r'(?<=^)([A-G])\s*[\.\)]\s+', r'[\1] ', text)
    text = re.sub(r'(?<=\s)([A-G])\s*[\.\)]\s+', r'[\1] ', text)
    
    return text


def extract_cloze_by_coordinates(pdf_path: str, q_range: tuple, sec_def: dict) -> list:
    """使用字符坐标提取完形填空选项 — 解决 PDF 双栏排版导致的选项丢失问题

    考研英语完形填空的 PDF 排版通常是 4 列单行横排：
        [A] word   [B] word    word     [D] word    N.
    其中 [C] 标记经常丢失，但 C 列文字在固定 X 位置。
    
    算法：
      1. 按 Y 坐标聚类找出所有选项行（含 ≥2 个 [A-D] 标签 of the row）
      2. 对每行的非标记文字按 X 坐标分配到 A/B/C/D 四列
      3. 按顺序与题号匹配
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            cloze_pages = []
            for i, page in enumerate(pdf.pages):
                text = (page.extract_text() or '')[:2000]
                text = text.replace('\uFFFD', '')
                if re.search(r'\b1\s*[\.\)]\s*(?:\[|：|\()?\s*A(?![a-z_])', text):
                    cloze_pages.append(i)
            
            if not cloze_pages:
                return []

            all_words = []
            for idx in cloze_pages:
                page = pdf.pages[idx]
                words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
                if words:
                    split_words = []
                    for w in words:
                        text = w.get('text', '').strip()
                        text = text.replace('\uFFFD', '')
                        
                        sub_words = [w.copy()]
                        sub_words[0]['text'] = text
                        
                        # 检查是否以题号+句点/括号开头
                        m = re.match(r'^(\d{1,2})\s*[\.\)]\s*(.*)$', text)
                        if m and m.group(2).strip():
                            num_part = m.group(1) + '.'
                            rest_part = m.group(2).strip()
                            
                            w1 = w.copy()
                            w1['text'] = num_part
                            
                            w2 = w.copy()
                            w2['text'] = rest_part
                            w2['x0'] = w['x0'] + (w['x1'] - w['x0']) * (len(num_part) / max(1, len(text)))
                            sub_words = [w1, w2]
                            
                        # 尝试拆分选项标记与文字
                        last_w = sub_words[-1]
                        last_text = last_w['text']
                        last_text_fixed = fix_bracket_j_issue(last_text)
                        
                        m_opt = re.match(r'^\[([A-D])\]\s*(.+)$', last_text_fixed)
                        if not m_opt:
                            m_opt = re.match(r'^\[?([A-D])[\]JjI1l|Ee](.+)$', last_text)
                            
                        if m_opt:
                            label_part = f"[{m_opt.group(1)}]"
                            content_part = m_opt.group(2).strip()
                            
                            w1 = last_w.copy()
                            w1['text'] = label_part
                            
                            w2 = last_w.copy()
                            w2['text'] = content_part
                            w2['x0'] = last_w['x0'] + (last_w['x1'] - last_w['x0']) * (3 / max(1, len(last_text)))
                            
                            sub_words = sub_words[:-1] + [w1, w2]
                            
                        split_words.extend(sub_words)
                    all_words.extend(split_words)
    except Exception as e:
        print(f"    Warning: coordinate extraction failed ({e}), falling back")
        return []

    if not all_words:
        return []

    # ===== 第一步：按 Y 聚类（容错 2.5 磅） =====
    sorted_words = sorted(all_words, key=lambda w: w['top'])
    clusters = []
    for w in sorted_words:
        if not clusters:
            clusters.append([w])
        else:
            # 判断当前词的 Y 坐标是否在最后一个聚类的平均 Y 值的 2.5 磅范围内
            cluster_avg = sum(x['top'] for x in clusters[-1]) / len(clusters[-1])
            if abs(w['top'] - cluster_avg) <= 2.5:
                clusters[-1].append(w)
            else:
                clusters.append([w])

    option_rows = []
    labels_by_y = {} # 用于计算列边界的所有标签
    for cluster in clusters:
        labels = []
        for w in cluster:
            t = w.get('text', '').strip()
            t_cleaned = fix_bracket_j_issue(t).strip()
            if not t_cleaned.startswith('[') and len(t_cleaned) >= 1:
                t_cleaned = re.sub(r'^[：:]?\b([A-D])\b[\]\).]?', r'[\1]', t_cleaned)
            
            # 强化标签归一化：支持 [A 甚至 A] 或 [B 等缺括号形式
            if re.match(r'^\[([A-D])$', t_cleaned):
                t_cleaned = f"[{t_cleaned[1]}]"
            elif re.match(r'^([A-D])\]$', t_cleaned):
                t_cleaned = f"[{t_cleaned[0]}]"
                
            m = re.match(r'^\[([A-D])\]$', t_cleaned)
            if m:
                labels.append((m.group(1).upper(), w['x0']))
                ry = round(w['top'], 0)
                labels_by_y.setdefault(ry, []).append((m.group(1).upper(), w['x0']))
        
        if len(labels) >= 2:
            option_rows.append({
                'y': sum(w['top'] for w in cluster) / len(cluster),
                'labels': labels,
                'words': cluster
            })

    if not option_rows:
        return []

    # ===== 第二步：计算列边界 =====
    col_x = {l: [] for l in 'ABCD'}
    for lbs in labels_by_y.values():
        for label, x in lbs:
            col_x[label].append(x)

    centers = {}
    for label in 'ABCD':
        if col_x[label]:
            positions = sorted(col_x[label])
            centers[label] = positions[len(positions) // 2]

    known_centers = sorted([(l, cx) for l, cx in centers.items() if cx], key=lambda x: x[1])
    if len(known_centers) < 4:
        default_offsets = {'A': 50, 'B': 170, 'C': 290, 'D': 410}
        for l in 'ABCD':
            if l not in centers:
                centers[l] = default_offsets[l]
    
    sorted_centers = sorted(centers.items(), key=lambda x: x[1])
    col_bounds = {}
    for i, (label, center) in enumerate(sorted_centers):
        lo = (sorted_centers[i-1][1] + center) / 2 if i > 0 else center - 80
        hi = (center + sorted_centers[i+1][1]) / 2 if i < len(sorted_centers)-1 else center + 120
        col_bounds[label] = (lo, hi)

    def col_for_x(x):
        for label, (lo, hi) in col_bounds.items():
            if lo <= x <= hi:
                return label
        return None

    def clean_option_text(text):
        text = fix_bracket_j_issue(text)
        text = re.sub(r'^\s*\[?[A-D]\]?[\.\)]?\s*', '', text)
        text = re.sub(r'^\d{1,2}\s*[.\)]?\s*', '', text)
        text = text.replace('[', '').replace(']', '')
        text = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', text)
        text = re.sub(r'\s*英语（[一二]）试.*?$', '', text)
        text = re.sub(r'\s*\d{4}-\d+\s*$', '', text)
        text = re.sub(r'^[;:\s]+', '', text)
        return text.strip()

    # ===== 第三步：对每个选项聚类行提取四列文字 =====
    extracted_rows = []
    for row in option_rows:
        cols = {'A': [], 'B': [], 'C': [], 'D': []}
        # 排除可能是标签的单词，避免文字中混入 [A] 标记
        non_label_words = []
        for w in row['words']:
            t = w.get('text', '').strip()
            t_cleaned = fix_bracket_j_issue(t).strip()
            if not t_cleaned.startswith('[') and len(t_cleaned) >= 1:
                t_cleaned = re.sub(r'^[：:]?\b([A-D])\b[\]\).]?', r'[\1]', t_cleaned)
            if re.match(r'^\[([A-D])$', t_cleaned):
                t_cleaned = f"[{t_cleaned[1]}]"
            elif re.match(r'^([A-D])\]$', t_cleaned):
                t_cleaned = f"[{t_cleaned[0]}]"
            
            if re.match(r'^\[([A-D])\]$', t_cleaned) or t_cleaned in ('[', ']', '：', ':', ''):
                continue
            non_label_words.append(w)

        for w in non_label_words:
            # 采用起点的 X 坐标进行列分配，避免长单词跨越中点被误判
            x_ref = w['x0'] + 5
            label = col_for_x(x_ref)
            if label:
                cols[label].append(w)

        choices = []
        for label in 'ABCD':
            # 在同一列的词按照 X0 坐标从小到大排序，恢复正常阅读语序
            sorted_col_words = sorted(cols[label], key=lambda w: w['x0'])
            raw = ' '.join(w['text'] for w in sorted_col_words)
            clean = clean_option_text(raw)
            choices.append({'label': label, 'text': clean[:200]})
        
        has_content = any(c['text'] for c in choices)
        extracted_rows.append({
            'y': row['y'],
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

    # Map option rows to the closest question number using closest match logic
    row_to_q = {}
    for row_idx, row_data in enumerate(extracted_rows):
        best_q = None
        min_diff = 25  # 增加容错高度差
        for q in q_numbers:
            diff = abs(row_data['y'] - q['top'])
            if diff < min_diff:
                min_diff = diff
                best_q = q
        if best_q:
            q_num = best_q['num']
            if q_num not in row_to_q or min_diff < row_to_q[q_num]['diff']:
                row_to_q[q_num] = {'row_data': row_data, 'diff': min_diff}

    result = []
    for num in range(q_range[0], q_range[1] + 1):
        if num in row_to_q:
            rd = row_to_q[num]['row_data']
            result.append({
                'number': num,
                'stem': '',
                'choices': rd['choices'],
                'type': 'choice',
            })
        else:
            result.append(make_placeholder(num, 'choice'))

    result.sort(key=lambda x: x['number'])
    return result


def parse_cloze_block(text: str, sec_range: tuple) -> tuple:
    text = fix_bracket_j_issue(text)
    # 使用超强容错正则匹配第一题起点
    m_first = re.search(r'\b1\s*[\.\)]\s*(?:\[|：|\()?\s*A(?![a-z_])', text)
    
    if m_first:
        article = text[:m_first.start()].strip()
        q_text = text[m_first.start():]
    else:
        article = text
        q_text = text
        
    questions = []
    q_positions = []
    
    for num in range(sec_range[0], sec_range[1] + 1):
        # 兼容 [A]、A.、A)、：A 等各种选项前缀
        m = re.search(r'(?:^|\n)\s*\b' + str(num) + r'\b\s*[\.\)]\s*(?:\[|：|\()?\s*A(?![a-z_])', q_text)
        if m:
            q_positions.append((num, q_text.find(str(num) + '.', m.start()) if q_text.find(str(num) + '.', m.start()) != -1 else m.start()))
            
    q_positions.sort(key=lambda x: x[1])
    
    for i, (num, start) in enumerate(q_positions):
        end = q_positions[i+1][1] if i+1 < len(q_positions) else len(q_text)
        q_block = q_text[start:end].strip()
        
        choices = []
        for label in ['A', 'B', 'C', 'D']:
            pat = re.search(r'\[\s*' + label + r'\s*\]\s*(.*?)(?=\[\s*[A-D]\s*\]|$)', q_block, re.DOTALL)
            if not pat:
                pat = re.search(r'\b' + label + r'[\.\)]\s*(.*?)(?=\b[A-D][\.\)]|$)', q_block, re.DOTALL)
            if pat:
                opt_val = re.sub(r'\s+', ' ', pat.group(1)).strip()
                opt_val = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_val)
                opt_val = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_val)
                opt_val = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_val)
                opt_val = re.sub(r'(?i)\s*Section\s+[IV]+\s+Reading\s+Comprehension.*$', '', opt_val)
                opt_val = re.sub(r'(?i)\s*Part\s+[A-C]\s+Directions:.*$', '', opt_val)
                choices.append({'label': label, 'text': opt_val})
                
        choices = _normalize_choices(choices)
        questions.append({
            'number': num,
            'stem': '',
            'choices': choices,
            'type': 'choice'
        })
        
    # 自动补全缺失题目的占位符，保证总是输出 20 个题
    found_nums = {q['number'] for q in questions}
    for n in range(sec_range[0], sec_range[1] + 1):
        if n not in found_nums:
            questions.append(make_placeholder(n, 'choice'))
    questions.sort(key=lambda x: x['number'])
    
    return article, questions


def parse_reading_block(text: str, q_range: tuple, sec_def: dict) -> dict:
    text = fix_bracket_j_issue(text)
    text_starts = {}
    for i in range(1, 5):
        m = re.search(r'\bText\s*' + str(i) + r'\b', text, re.I)
        if m:
            text_starts[i] = m.start()
            
    for i in range(2, 5):
        if i not in text_starts:
            q_num = 21 + 5 * (i - 1)
            m_q = re.search(r'(?:^|\n)\s*\b' + str(q_num) + r'\b\s*[\.\)]', text)
            if m_q:
                text_starts[i] = max(0, m_q.start() - 1500)
                
    text_starts[1] = text_starts.get(1, 0)
    sorted_texts = sorted(text_starts.items(), key=lambda x: x[1])
    
    texts = []
    all_parsed_questions = []
    
    for idx, (t_num, start_pos) in enumerate(sorted_texts):
        end_pos = sorted_texts[idx+1][1] if idx+1 < len(sorted_texts) else len(text)
        block = text[start_pos:end_pos].strip()
        
        start_q = 21 + 5 * (t_num - 1)
        end_q = start_q + 4
        
        q_positions = []
        for q_num in range(start_q, end_q + 1):
            m = re.search(r'(?:^|\n)\s*\b' + str(q_num) + r'\b\s*[\.\)]', block)
            if m:
                q_positions.append((q_num, block.find(str(q_num) + '.', m.start()) if block.find(str(q_num) + '.', m.start()) != -1 else m.start()))
                
        q_positions.sort(key=lambda x: x[1])
        
        if q_positions:
            article_start = 0
            m_hdr = re.match(r'^\s*Text\s*' + str(t_num) + r'\b', block, re.I)
            if m_hdr:
                article_start = m_hdr.end()
            article = block[article_start:q_positions[0][1]].strip()
        else:
            article = block
            
        block_questions = []
        for i, (q_num, q_start) in enumerate(q_positions):
            q_end = q_positions[i+1][1] if i+1 < len(q_positions) else len(block)
            q_block = block[q_start:q_end].strip()
            
            m_a = re.search(r'\[A\]', q_block)
            if not m_a:
                m_a = re.search(r'\bA\b[\.\)]', q_block)
            if m_a:
                stem = q_block[:m_a.start()].strip()
                stem = re.sub(r'^\b' + str(q_num) + r'\b\s*[\.\)]\s*', '', stem).strip()
            else:
                stem = q_block
                
            choices = []
            for label in ['A', 'B', 'C', 'D']:
                pat = re.search(r'\[\s*' + label + r'\s*\]\s*(.*?)(?=\[\s*[A-D]\s*\]|$)', q_block, re.DOTALL)
                if not pat:
                    pat = re.search(r'\b' + label + r'[\.\)]\s*(.*?)(?=\b[A-D][\.\)]|$)', q_block, re.DOTALL)
                if pat:
                    opt_val = re.sub(r'\s+', ' ', pat.group(1)).strip()
                    opt_val = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_val)
                    opt_val = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_val)
                    opt_val = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_val)
                    opt_val = re.sub(r'(?i)\s*Section\s+[IV]+\s+Reading\s+Comprehension.*$', '', opt_val)
                    opt_val = re.sub(r'(?i)\s*Part\s+[A-C]\s+Directions:.*$', '', opt_val)
                    choices.append({'label': label, 'text': opt_val})
            choices = _normalize_choices(choices)
            
            block_questions.append({
                'number': q_num,
                'stem': stem,
                'choices': choices,
                'type': 'choice'
            })
            
        found_nums = {q['number'] for q in block_questions}
        for q_num in range(start_q, end_q + 1):
            if q_num not in found_nums:
                block_questions.append(make_placeholder(q_num, 'choice'))
        block_questions.sort(key=lambda x: x['number'])
        
        texts.append({
            'text_num': t_num,
            'article': article,
            'questions': block_questions
        })
        all_parsed_questions.extend(block_questions)
        
    return {
        'name': sec_def['name'],
        'type': sec_def['type'],
        'question_range': list(q_range),
        'text': text[:300],
        'texts': texts,
        'questions': all_parsed_questions,
        'warnings': []
    }


def extract_new_type_options(text: str) -> list:
    choices = []
    opt_positions = []
    
    for label in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
        m = re.search(r'\[\s*' + label + r'\s*\]', text)
        if not m:
            m = re.search(r'(?:^|\n)\s*' + label + r'\.\s+', text)
        if m:
            opt_positions.append((label, m.start()))
            
    if not opt_positions:
        return []
        
    opt_positions.sort(key=lambda x: x[1])
    
    for i, (label, start) in enumerate(opt_positions):
        end = opt_positions[i+1][1] if i+1 < len(opt_positions) else len(text)
        opt_text = text[start:end].strip()
        
        # Heuristic for truncating the last option if it swallowed the article
        if i == len(opt_positions) - 1 and len(opt_positions) > 1:
            avg_len = (opt_positions[-1][1] - opt_positions[0][1]) / (len(opt_positions) - 1)
            # If the remaining text is way longer than average, we only keep the first few lines
            if len(opt_text) > avg_len * 2.5:
                # Truncate to reasonable length, trying not to cut mid-sentence
                cutoff = int(avg_len * 2)
                # find the nearest newline before cutoff
                last_nl = opt_text.rfind('\n', 0, cutoff)
                if last_nl != -1:
                    opt_text = opt_text[:last_nl]
                else:
                    opt_text = opt_text[:cutoff]

        opt_text = re.sub(r'^\[\s*[A-H]\s*\]\s*', '', opt_text)
        opt_text = re.sub(r'^[A-H]\.\s*', '', opt_text)
        opt_text = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_text)
        opt_text = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_text)
        opt_text = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_text)
        opt_text = re.sub(r'\s+', ' ', opt_text).strip()
        choices.append({'label': label, 'text': opt_text})
        
    return choices


def parse_new_type_block(block_text: str, q_range: tuple) -> list:
    block_text = fix_bracket_j_issue(block_text)
    
    # Detect Paragraph Sorting
    is_paragraph_sorting = bool(re.search(r'(?i)reorganize\s+these\s+paragraphs|sort\s+the\s+paragraphs|wrong\s+order', block_text))
    if is_paragraph_sorting:
        # Strip the broken flowchart at the bottom to clean up the article
        m_last_opt = re.search(r'(?:^|\n)\s*[G|H]\.\s+.*?(?=\n\s*(?:[A-H]\s*I-|\[\s*[A-H]\s*\]\s*->|\[?\s*\d+\s*\]?\s*->|\d{2}\s*\.)|$)', block_text, re.DOTALL)
        if m_last_opt:
            block_text = block_text[:m_last_opt.end()].strip()
            
    options = extract_new_type_options(block_text)
    questions = []
    
    # Matching headings usually have "41. " followed by the paragraph text
    blank_pattern = re.compile(r'\(\s*(\d{1,2})\s*\)|\[\s*(\d{1,2})\s*\]|(?:^|\n)\s*(\d{1,2})\.\s+(?=[A-Za-z])')
    blanks = []
    for m in blank_pattern.finditer(block_text):
        num_str = m.group(1) or m.group(2) or m.group(3)
        if not num_str:
            continue
        num = int(num_str)
        if q_range[0] <= num <= q_range[1]:
            is_heading = bool(m.group(3))
            blanks.append((num, m.start(), m.end(), is_heading))
            
    seen = set()
    unique_blanks = []
    for b in sorted(blanks, key=lambda x: x[1]):
        if b[0] not in seen:
            seen.add(b[0])
            unique_blanks.append(b)
            
    if len(unique_blanks) >= 3:
        for num, start, end, is_heading in unique_blanks:
            ctx_start = max(0, start - 40)
            ctx_end = min(len(block_text), end + 60)
            context = block_text[ctx_start:ctx_end].strip()
            context = re.sub(r'\s+', ' ', context)
            
            # Remove instruction artifacts that might leak into the first question's context
            context = re.sub(r'(?i)^.*?10\s*points\)?\s*', '', context)
            context = re.sub(r'(?i)^.*?ANSWER\s*SHEET\.?\s*', '', context)
            
            # Try to detect Information Matching (Name matching)
            after_text = block_text[end:end+40].lstrip()
            name_match = re.match(r'^([A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+)?)(?=\s|$|\n|,|:)', after_text)
            
            common_words = {"The", "In", "However", "It", "This", "That", "There", "A", "An", "On", "To", "For", "With", "As", "By", "If", "When", "While", "Some", "Many", "But", "And", "Or", "So", "Scientists", "Researchers", "People", "They", "He", "She", "We", "You", "I"}
            
            if is_heading:
                para_text = block_text[end:end+400].strip()
                para_text = re.sub(r'\s+', ' ', para_text)
                stem = f"[{num}] " + para_text[:150]
                if len(para_text) > 150:
                    stem += "..."
            elif name_match and name_match.group(1) not in common_words:
                stem = f"第 {num} 题：{name_match.group(1)} 的观点"
            else:
                stem = f"... {context} ..."
            
            questions.append({
                'number': num,
                'stem': stem,
                'choices': options,
                'type': 'new_type'
            })
    else:
        for num in range(q_range[0], q_range[1] + 1):
            questions.append({
                'number': num,
                'stem': f"排序题第 {num} 题，请选择正确的段落。",
                'choices': options,
                'type': 'new_type'
            })
            
    questions.sort(key=lambda x: x['number'])
    return questions

def extract_new_type_article(block_text: str) -> str:
    # We apply the same stripping logic here for consistency
    is_paragraph_sorting = bool(re.search(r'(?i)reorganize\s+these\s+paragraphs|sort\s+the\s+paragraphs|wrong\s+order', block_text))
    if is_paragraph_sorting:
        m_last_opt = re.search(r'(?:^|\n)\s*[G|H]\.\s+.*?(?=\n\s*(?:[A-H]\s*I-|\[\s*[A-H]\s*\]\s*->|\[?\s*\d+\s*\]?\s*->|\d{2}\s*\.)|$)', block_text, re.DOTALL)
        if m_last_opt:
            block_text = block_text[:m_last_opt.end()].strip()
    return block_text.strip()


def parse_translation_block(text: str, q_range: tuple) -> list:
    text = fix_bracket_j_issue(text)
    pat = re.compile(r'\(\s*(\d{1,2})\s*\)|\[\s*(\d{1,2})\s*\]')
    anchors = []
    for m in pat.finditer(text):
        num = int(m.group(1) or m.group(2))
        if q_range[0] <= num <= q_range[1]:
            anchors.append((num, m.start(), m.end()))
            
    seen = set()
    unique_anchors = []
    for a in sorted(anchors, key=lambda x: x[1]):
        if a[0] not in seen:
            seen.add(a[0])
            unique_anchors.append(a)
            
    questions = []
    for i, (num, start, end) in enumerate(unique_anchors):
        content_start = end
        if i + 1 < len(unique_anchors):
            content_end = unique_anchors[i+1][1]
        else:
            content_end = len(text)
            
        raw_sent = text[content_start:content_end]
        sent = _clean_translation_sentence(raw_sent, num)
        
        questions.append({
            'number': num,
            'stem': sent,
            'choices': [],
            'type': 'translation'
        })
        
    return questions


def extract_translation_article(text: str, questions: list) -> str:
    return text.strip()


def _clean_translation_sentence(raw: str, num: int) -> str:
    sent = raw.strip()
    sent = re.sub(r'\s+', ' ', sent).strip()
    sent = re.sub(r'[（(][^）)]{0,80}[）)]?\s*$', '', sent).strip()
    terminal_patterns = [
        r'(?<=[.!?])\s*(?:Directions|Section|Part|translate|Read the|Your translation)[^.]*$',
        r'\s+(?:Directions|Section|Part\s+[A-D]|Answer\s*Sheet)[^.]*$',
        r'\s+\d{2}\.\s.*$',
    ]
    for p in terminal_patterns:
        sent = re.sub(p, '', sent, flags=re.IGNORECASE).strip()
    
    sent = sent.lstrip(' ,.;\n\r')
    sent = re.sub(r'^\s*\[[A-D]\]\s*', '', sent).strip()
    return sent


def parse_writing_block(text: str, num: int, type_key: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r'^\s*Part\s*[A-C]\s*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'^\s*Section\s*III\s*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'^\s*Writing\s*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'^\s*\b' + str(num) + r'\b\s*[\.\)]\s*', '', cleaned)
    cleaned = re.sub(r'^\s*Directions\s*:\s*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return {
        'number': num,
        'stem': cleaned,
        'choices': [],
        'type': type_key
    }


def extract_questions_in_range(text: str, q_range: tuple, sec_type: str) -> list:
    questions = []
    pattern = re.compile(r'(?:^|\n|\s)\b(\d{1,2})\b\s*[\.\)]', re.MULTILINE)
    splits = list(pattern.finditer(text))
    for i, match in enumerate(splits):
        num = int(match.group(1))
        if q_range[0] <= num <= q_range[1]:
            start = match.start()
            end = splits[i+1].start() if i+1 < len(splits) else len(text)
            q_block = text[start:end]
            questions.append(parse_single_question(q_block, num, sec_type))
    return questions


def parse_single_question(block: str, number: int, sec_type: str) -> dict:
    """解析单道题目"""
    block = fix_bracket_j_issue(block).strip()
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
    if not opt_text:
        return True
    if re.search(r'\d{1,2}\s*[.)\]]\s*\[?[A-D]', opt_text):
        return True
    if re.match(r'^\s*\[?[A-D][\.\)]', opt_text):
        return True
    if len(opt_text.strip()) > 80:
        return True
    return False


def _normalize_choices(choices: list) -> list:
    choice_map = {ch['label'].upper(): ch['text'] for ch in choices}
    result = []
    for label in ['A', 'B', 'C', 'D']:
        text = choice_map.get(label, '')
        result.append({'label': label, 'text': text})
    return result


def parse_choice_question(text: str, number: int) -> dict:
    text = fix_bracket_j_issue(text)
    inline_pattern = re.compile(r'\[([A-D])\]\s*(.+?)\s*(?=\[[A-D]\]|\Z)', re.IGNORECASE | re.DOTALL)
    inline_matches = list(inline_pattern.finditer(text))

    if len(inline_matches) >= 3:
        choices = []
        first_a = inline_matches[0]
        before_first = text[:first_a.start()].strip()
        stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', before_first).strip()

        for m in inline_matches:
            label = m.group(1).upper()
            opt_text = m.group(2).strip()
            opt_text = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_text)
            opt_text = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_text)
            opt_text = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_text)
            opt_text = re.sub(r'\s+', ' ', opt_text).strip()
            if opt_text and not _is_garbage_option_text(opt_text):
                choices.append({'label': label, 'text': opt_text[:200]})

        choices = _normalize_choices(choices)
        return {
            'number': number,
            'stem': stem[:500],
            'choices': choices,
            'type': 'choice',
        }

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
        opt_text = re.sub(r'^\s*\[?([A-D])\]?[\.)\]】]?\s*', '', opt_text).strip()
        opt_text = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_text)
        opt_text = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_text)
        opt_text = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_text)
        opt_text = re.sub(r'\s+', ' ', opt_text).strip()

        if opt_text and not _is_garbage_option_text(opt_text):
            choices.append({'label': label, 'text': opt_text[:300]})

    choices = _normalize_choices(choices)
    stem = re.sub(r'\s+', ' ', stem).strip()
    stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', stem).strip()

    return {
        'number': number,
        'stem': stem[:800],
        'choices': choices,
        'type': 'choice',
    }


def parse_new_type_question(text: str, number: int) -> dict:
    stem = text.split('[A]')[0] if '[A]' in text else text.split('A.')[0] if 'A.' in text else text
    stem = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', stem).strip()
    stem = re.sub(r'\s+', ' ', stem).strip()
    
    choices = []
    for label in ['A','B','C','D','E','F','G']:
        pat = re.compile(r'\[?' + label + r'\]?[\.)\]】]\s*([^A-G\n]*(?:\n(?!\[?[A-G]\]?[\.)\]])[^A-G\n]*)*)', re.IGNORECASE)
        m = pat.search(text)
        if m and m.group(1).strip():
            opt_text = m.group(1).strip().replace('\n', ' ')
            opt_text = re.sub(r'\s*\d{4}年英语（[一二]）.*?$', '', opt_text)
            opt_text = re.sub(r'\s*英语（[一二]）试.*?$', '', opt_text)
            opt_text = re.sub(r'\s*\d{4}-\d+\s*$', '', opt_text)
            choices.append({'label': label, 'text': opt_text[:200]})
    
    return {
        'number': number,
        'stem': stem[:500],
        'choices': choices,
        'type': 'new_type',
    }


def parse_translation_question(text: str, number: int) -> dict:
    sent = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', text).strip()
    sent = re.sub(r'[（(][^）)]*[）)]?\s*$', '', sent).strip()
    sent = re.sub(r'\s+', ' ', sent).strip()
    return {
        'number': number,
        'stem': sent[:600],
        'choices': [],
        'type': 'translation',
    }


def parse_writing_prompt(text: str, number: int, sec_type: str) -> dict:
    prompt = re.sub(r'^\d{1,2}\s*[.\)]\s*', '', text).strip()
    prompt = re.sub(r'\s+', ' ', prompt).strip()
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

CLEAN_PATTERN_1 = re.compile(r'(?:\d{4}年)?\s*英\s*语\s*[(（]\s*[一二]\s*[)）]\s*试\s*题(?:\s*[第\.]*\s*\d+\s*[页\.]*)?(?:\s*[(（]?\s*共\s*\d+\s*页\s*[)）]?)?\s*')
CLEAN_PATTERN_2 = re.compile(r'\s*\d{4}-\d+\s*$')

def deep_clean_strings(obj):
    if isinstance(obj, str):
        obj = CLEAN_PATTERN_1.sub('', obj)
        obj = CLEAN_PATTERN_2.sub('', obj)
        return obj.strip()
    elif isinstance(obj, list):
        return [deep_clean_strings(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: deep_clean_strings(v) for k, v in obj.items()}
    else:
        return obj


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

    # ===== 新增：为翻译和写作提取最后两页原题图片 =====
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            os.makedirs('public/data/images', exist_ok=True)
            for key in ['translation', 'writing-a', 'writing-b']:
                if key in sections and 'page_numbers' in sections[key]:
                    page_nums = sections[key]['page_numbers']
                    img_urls = []
                    for p_idx in sorted(page_nums):
                        if 0 <= p_idx < len(pdf.pages):
                            img_name = f"{year}_page_{p_idx}.png"
                            img_path = f"public/data/images/{img_name}"
                            if not os.path.exists(img_path):
                                print(f"  Rendering image for page {p_idx} ({key})...")
                                img = pdf.pages[p_idx].to_image(resolution=200)
                                img.save(img_path)
                            img_urls.append(f"/data/images/{img_name}")
                    sections[key]['images'] = img_urls
    except Exception as e:
        print(f"  [ERROR] Failed to extract images for {year}: {e}")
    # ===============================================
    
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
    
    # 2010年以前的试题已按要求删除，仅处理 2010 - 2025 年真题
    all_results = {}
    year_files = []
    for y in range(2010, 2026):
        year_files.append((str(y), y))
    
    for fname, year in year_files:
        path = BASE_DIR / "2010-2025/exam" / f"{fname}.pdf"
        
        result = process_pdf(str(path), year)
        
        if 'error' not in result or result.get('sections'):
            # 应用深度清理
            result = deep_clean_strings(result)
            
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
    print(f"DONE! Processed {len(all_results)} years (2010-2025).")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Index: {index_path}")
    
    # 统计汇总
    ok = sum(1 for v in all_results.values() if v.get('status') == 'ok')
    partial = sum(1 for v in all_results.values() if v.get('status') == 'partial')
    err = sum(1 for v in all_results.values() if v.get('status') == 'error')
    print(f"  OK: {ok}, Partial: {partial}, Error: {err}")


if __name__ == '__main__':
    main()
