/**
 * 考研英语真题解析器 v5 — 年代感知 + 动态题号映射
 * 
 * 核心改进：根据最大题号自动检测试卷年代，使用对应的题号规则
 * 
 * 四个年代：
 *   第一阶段 (≤2001):  66题 - 词汇1-30, 完形31-40, 阅读41-60, 翻译61-65, 写作66
 *   第二阶段 (02-04): 66题 - 听力1-20, 完形21-40, 阅读41-60, 翻译61-65, 写作66  
 *   第三阶段 (05-09): 52题 - 完形1-20, 阅读21-40, 新型41-45, 翻46-50, 小作51, 大作52
 *   第四阶段 (≥10):   52/48题 - 同第三阶段(英一) / 翻译只有46(英二)
 */

// ==================== 类型定义 ====================

export interface Choice { label: string; text: string; }
export interface Question {
  id: number;
  globalNumber: number;
  type: string;
  stem: string;
  choices: Choice[];
  passageId?: number;
  answer?: string;
}

export interface SectionInfo {
  key: string;
  label: string;
  shortLabel: string;
  startNum: number;
  endNum: number;
  count: number;
  color: string;
  questions: Question[];
  articleContent?: string;
}

export interface ParsedExam {
  era: ExamEra;
  eraLabel: string;
  isEnglish2: boolean;
  sections: SectionInfo[];
  allQuestions: Question[];
  rawPages: { pageNum: number; text: string }[];
  stats: ParseStats;
}

export interface ParseStats {
  totalPages: number;
  totalChars: number;
  foundNumbers: Set<number>;
  maxNumber: number;
  warnings: string[];
}

export enum ExamEra {
  ERA_1_PRE_2002 = 'era1',
  ERA_2_LISTENING = 'era2',
  ERA_3_STANDARD = 'era3',
  ERA_4_MODERN = 'era4',
}

// ==================== 年代配置 ====================

interface SecDef {
  key: string; label: string; shortLabel: string;
  startNum: number; endNum: number; color: string;
  hasArticle: boolean; isChoice: boolean; choiceCount: number;
}

interface EraConfig {
  era: ExamEra; label: string; yearRange: string; totalQuestions: number; sections: SecDef[];
}

const ERAS: Record<ExamEra, EraConfig> = {
  [ExamEra.ERA_1_PRE_2002]: {
    era: ExamEra.ERA_1_PRE_2002, label: '第一阶段：2002年之前', yearRange: '≤2001', totalQuestions: 66,
    sections: [
      { key: 'vocab',       label: '词汇与结构',       shortLabel: '词汇(1-30)',    startNum: 1,  endNum: 30,  color: '#8b5cf6', hasArticle: false, isChoice: true,  choiceCount: 4 },
      { key: 'cloze',       label: '完形填空',         shortLabel: '完形(31-40)',  startNum: 31, endNum: 40,  color: '#ec4899', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'reading',     label: '阅读理解',         shortLabel: '阅读(41-60)',  startNum: 41, endNum: 60,  color: '#3b82f6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'translation', label: '英译汉',           shortLabel: '翻译(61-65)',  startNum: 61, endNum: 65,  color: '#f59e0b', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing',     label: '写作',             shortLabel: '写作(66)',     startNum: 66, endNum: 66,  color: '#ef4444', hasArticle: false, isChoice: false, choiceCount: 0 },
    ],
  },
  [ExamEra.ERA_2_LISTENING]: {
    era: ExamEra.ERA_2_LISTENING, label: '第二阶段：2002-2004（听力时代）', yearRange: '2002-2004', totalQuestions: 66,
    sections: [
      { key: 'listening',    label: '听力理解',         shortLabel: '听力(1-20)',   startNum: 1,  endNum: 20,  color: '#06b6d4', hasArticle: false, isChoice: true,  choiceCount: 4 },
      { key: 'cloze',        label: '完形填空',         shortLabel: '完形(21-40)',  startNum: 21, endNum: 40,  color: '#ec4899', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'reading',      label: '阅读理解',         shortLabel: '阅读(41-60)',  startNum: 41, endNum: 60,  color: '#3b82f6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'translation',  label: '英译汉',           shortLabel: '翻译(61-65)',  startNum: 61, endNum: 65,  color: '#f59e0b', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing',      label: '写作',             shortLabel: '写作(66)',     startNum: 66, endNum: 66,  color: '#ef4444', hasArticle: false, isChoice: false, choiceCount: 0 },
    ],
  },
  [ExamEra.ERA_3_STANDARD]: {
    era: ExamEra.ERA_3_STANDARD, label: '第三阶段：2005-2009（标准模式）', yearRange: '2005-2009', totalQuestions: 52,
    sections: [
      { key: 'cloze',        label: '完形填空',          shortLabel: '完形(1-20)',   startNum: 1,  endNum: 20,  color: '#8b5cf6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'reading-a',    label: '阅读A节(传统阅读)',shortLabel: '阅读(21-40)',  startNum: 21, endNum: 40,  color: '#3b82f6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'new-type',     label: '阅读B节(新题型)',  shortLabel: '新型(41-45)',  startNum: 41, endNum: 45,  color: '#06b6d4', hasArticle: false, isChoice: true,  choiceCount: 7 },
      { key: 'translation',  label: 'C节:翻译(长难句)', shortLabel: '翻译(46-50)',  startNum: 46, endNum: 50,  color: '#f59e0b', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing-a',    label: '应用文写作(小作文)',shortLabel: '小作文(51)',   startNum: 51, endNum: 51,  color: '#ec4899', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing-b',    label: '议论文写作(大作文)',shortLabel: '大作文(52)',   startNum: 52, endNum: 52,  color: '#ef4444', hasArticle: false, isChoice: false, choiceCount: 0 },
    ],
  },
  [ExamEra.ERA_4_MODERN]: {
    era: ExamEra.ERA_4_MODERN, label: '第四阶段：2010至今', yearRange: '≥2010', totalQuestions: 52,
    sections: [
      { key: 'cloze',        label: '完形填空',          shortLabel: '完形(1-20)',   startNum: 1,  endNum: 20,  color: '#8b5cf6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'reading-a',    label: '阅读A节(传统阅读)',shortLabel: '阅读(21-40)',  startNum: 21, endNum: 40,  color: '#3b82f6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
      { key: 'new-type',     label: '阅读B节(新题型)',  shortLabel: '新型(41-45)',  startNum: 41, endNum: 45,  color: '#06b6d4', hasArticle: false, isChoice: true,  choiceCount: 7 },
      { key: 'translation',  label: 'C节:翻译',         shortLabel: '翻译(46-50)',  startNum: 46, endNum: 50,  color: '#f59e0b', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing-a',    label: '应用文写作(小作文)',shortLabel: '小作文(51)',   startNum: 51, endNum: 51,  color: '#ec4899', hasArticle: false, isChoice: false, choiceCount: 0 },
      { key: 'writing-b',    label: '议论文写作(大作文)',shortLabel: '大作文(52)',   startNum: 52, endNum: 52,  color: '#ef4444', hasArticle: false, isChoice: false, choiceCount: 0 },
    ],
  },
};

/** 英语二特殊配置 */
const ENGLISH2_SECS: SecDef[] = [
  { key: 'cloze',        label: '完形填空',          shortLabel: '完形(1-20)',   startNum: 1,  endNum: 20,  color: '#8b5cf6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
  { key: 'reading-a',    label: '阅读A节(传统阅读)',shortLabel: '阅读(21-40)',  startNum: 21, endNum: 40,  color: '#3b82f6', hasArticle: true,  isChoice: true,  choiceCount: 4 },
  { key: 'new-type',     label: '阅读B节(新题型)',  shortLabel: '新型(41-45)',  startNum: 41, endNum: 45,  color: '#06b6d4', hasArticle: false, isChoice: true,  choiceCount: 7 },
  { key: 'translation',  label: 'C节:段落翻译',     shortLabel: '翻译(46)',    startNum: 46, endNum: 46,  color: '#f59e0b', hasArticle: false, isChoice: false, choiceCount: 0 },
  { key: 'writing-a',    label: '应用文写作(小作文)',shortLabel: '小作文(47)',   startNum: 47, endNum: 47,  color: '#ec4899', hasArticle: false, isChoice: false, choiceCount: 0 },
  { key: 'writing-b',    label: '图表作文(大作文)',  shortLabel: '大作文(48)',   startNum: 48, endNum: 48,  color: '#ef4444', hasArticle: false, isChoice: false, choiceCount: 0 },
];

// ==================== 噪声过滤 ====================
const NOISE_RE = [
  /考生姓名[^。\n]*\n?/g,/考生编号[^。\n]*\n?/g,/条形码[^。\n]*\n?/g,
  /答题卡[^。\n]*\n?/g,/2\s*B\s*铅笔[^。\n]*\n?/g,/黑色字迹签字笔[^。\n]*\n?/g,
  /涂草稿纸[^。\n]*\n?/g,/超出答题区域[^。\n]*\n?/g,
  /选择题的答案必须[^。\n]*\n?/g,/非选择题的答案[^。\n]*\n?/g,
  /不按规定粘条形码[^。\n]*\n?/g,/责任由?\s*\d\s*\.?\s*考生[^。\n]*\n?/g,
  /考生须把试题册上的[^。\n]*\n?/g,/粘贴取下[^。\n]*\n?/g,/粘贴在答题卡的[^。\n]*\n?/g,
  /填写报考单位[^。\n]*\n?/g,/涂写考生编号信息点[^。\n]*\n?/g,/考试结果[，,]将答题卡[^。\n]*\n?/g,
];

function stripNoise(t: string): string {
  let r = t;
  for (const p of NOISE_RE) r = r.replace(p, '');
  return r.replace(/\n{4,}/g, '\n\n').trim();
}

// ==================== 主入口 ====================

export function parseQuestions(rawTexts: { pageNum: number; text: string; structuredText?: string }[]): ParsedExam {
  const fullText = rawTexts.map(p => p.structuredText || p.text).join('\n\n---PAGE---\n\n');
  const stats: ParseStats = {
    totalPages: rawTexts.length, totalChars: fullText.length,
    foundNumbers: new Set(), maxNumber: 0, warnings: [],
  };

  // 1. 定位所有题号
  const positions = locateAllNumbers(fullText);
  positions.forEach(p => {
    stats.foundNumbers.add(p.number);
    if (p.number > stats.maxNumber) stats.maxNumber = p.number;
  });

  console.log(`[Parse v5] maxNum=${stats.maxNumber}, count=${positions.length}`);

  // 2. 检测年代
  const { era, isEnglish2 } = detectEra(stats.maxNumber, fullText);
  const config = isEnglish2 && era === ExamEra.ERA_4_MODERN
    ? { ...ERAS[era], label: '第四阶段：英语二', yearRange: '≥2010 (英二)', totalQuestions: 48, sections: ENGLISH2_SECS }
    : ERAS[era];

  stats.warnings.push(`检测: ${config.label}${isEnglish2 ? '(英二)' : ''}, 最大题号=${stats.maxNumber}`);

  // 3. 按 Section 分别解析
  const sections: SectionInfo[] = [];
  const allQuestions: Question[] = [];

  for (const def of config.sections) {
    const sec = parseOneSection(fullText, positions, def, stats);
    
    // 有题目或文章就保留
    if (sec.questions.length > 0 || sec.articleContent) {
      sections.push(sec);
      allQuestions.push(...sec.questions);
    } else {
      // 没提取到 → 创建占位
      stats.warnings.push(`${def.label}(${def.startNum}-${def.endNum}): 未提取到题目`);
      for (let n = def.startNum; n <= def.endNum; n++) {
        allQuestions.push({
          id: n, globalNumber: n, type: def.key, stem: `第 ${n} 题`,
          choices: def.isChoice ? Array.from({length: def.choiceCount}, (_, i) => ({label:String.fromCharCode(65+i), text:''})) : [],
        });
      }
      // 仍然保留 Section 以便显示
      sec.questions = allQuestions.slice(-(def.endNum - def.startNum + 1));
      sections.push(sec);
    }
  }

  allQuestions.forEach((q, i) => q.id = i + 1);

  return { era, eraLabel: config.label, isEnglish2, sections, allQuestions,
    rawPages: rawTexts.map(p => ({ pageNum: p.pageNum, text: p.text.substring(0, 2000) })), stats };
}

// ==================== 年代检测 ====================

function detectEra(maxNum: number, text: string): { era: ExamEra; isEnglish2: boolean } {
  const isEn2 = /英语[二2]|English\s*[Ii][Ii]/i.test(text)
    && !/^英语[一1]/i.test(text.substring(0, 300));
  if (maxNum >= 60) return { era: /听力|listening/i.test(text) ? ExamEra.ERA_2_LISTENING : ExamEra.ERA_1_PRE_2002, isEnglish2: isEn2 };
  return { era: isEn2 ? ExamEra.ERA_4_MODERN : ExamEra.ERA_3_STANDARD, isEnglish2: isEn2 };
}

// ==================== 题号定位 ====================

interface NumPos { number: number; index: number; context: string; }

function locateAllNumbers(text: string): NumPos[] {
  const pos: NumPos[] = [];
  const pat = /(?:^|\n)\s*(\d{1,2})\s*[.\)）](?:\s|\n)/g;
  let m;
  while ((m = pat.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (num >= 1 && num <= 70) {
      const after = text.slice(m.index + m[0].length).trim();
      if (after.length > 0 && /[a-zA-Z\u4e00-\u9fff]/.test(after[0])) {
        pos.push({ number: num, index: m.index + m[0].length, context: after.substring(0, 80) });
      }
    }
  }
  if (pos.length < 10) {
    const loose = /\b([1-9]|[1-6]\d|70)\b\s*[.\)）]\s*/g;
    let m2: RegExpExecArray | null;
    while ((m2 = loose.exec(text)) !== null) {
      const num = parseInt(m2[1]);
      const m2Idx = m2.index;
      if (num >= 1 && num <= 70 && !pos.some(p => Math.abs(p.index - m2Idx) < 10)) {
        pos.push({ number: num, index: m2Idx + (m2[0]?.length||0), context: text.slice(m2Idx, m2Idx+80) });
      }
    }
  }
  pos.sort((a,b) => a.index - b.index);
  return pos;
}

// ==================== 单 Section 解析 ====================

function parseOneSection(_text: string, positions: NumPos[], def: SecDef, _stats: ParseStats): SectionInfo {
  const secPos = positions.filter(p => p.number >= def.startNum && p.number <= def.endNum);
  
  const result: SectionInfo = {
    ...def, count: def.endNum - def.startNum + 1, questions: [],
  };

  if (secPos.length === 0) return result;

  // 如果有文章（完形/阅读），尝试提取文章内容
  if (def.hasArticle) {
    result.articleContent = extractArticleForSection(_text, secPos[0]);
  }

  // 提取每个题目
  for (let num = def.startNum; num <= def.endNum; num++) {
    const qp = secPos.find(p => p.number === num);
    if (!qp) continue;

    const area = _text.slice(qp.index, qp.index + (def.isChoice ? 800 : 1200));
    
    if (def.isChoice && def.choiceCount > 0) {
      const stem = extractStem(area);
      const choices = extractChoices(area, def.choiceCount === 7 ? ['A','B','C','D','E','F','G'] : ['A','B','C','D']);
      result.questions.push({
        id: num, globalNumber: num, type: def.key,
        stem: stem || `第 ${num} 题`,
        choices: choices.length >= 2 ? choices : makeEmptyChoices(def.choiceCount),
      });
    } else if (def.key.includes('translat')) {
      // 翻译题
      let sent = area.replace(/^(\d+)\s*[.)]\s*/, '').trim();
      sent = sent.split(/\n\s*\d{2}\s*[.)]/)[0];
      sent = sent.replace(/\s*[（(][^）)]*[）)]$/, '').trim();
      result.questions.push({
        id: num, globalNumber: num, type: def.key,
        stem: sent.substring(0, 600), choices: [],
      });
    } else {
      // 写作等
      result.questions.push({
        id: num, globalNumber: num, type: def.key,
        stem: area.substring(0, 500).trim(), choices: [],
      });
    }
  }

  return result;
}

/** 提取某 Section 对应的文章内容 */
function extractArticleForSection(text: string, firstQPos: NumPos): string {
  // 从第一题往前取一段文字
  const searchStart = Math.max(0, firstQPos.index - 3000);
  const preZone = stripNoise(text.slice(searchStart, firstQPos.index));

  // 找最长的英文段落
  const lines = preZone.split('\n');
  let best = '';
  let seg: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length > 10 && /^[a-zA-Z]/.test(line) && (line.match(/[a-zA-Z]/g)||[]).length > line.length*0.35) {
      seg.unshift(line);
    } else if (seg.length > 0) {
      if (seg.join('\n').length > best.length) best = seg.join('\n');
      seg = [];
    }
  }
  if (seg.join('\n').length > best.length) best = seg.join('\n');

  return best.trim() || '';
}

// ==================== 工具函数 ====================

function extractStem(text: string): string {
  const patterns = [/\s+A[.)\]]/i, /\s+B[.)\]]/i, /\n\s*A[)\]]/];
  for (const pat of patterns) {
    (pat as RegExp).lastIndex = 0;
    const m = (pat as RegExp).exec(text);
    if (m && m.index > 5) return text.slice(0, m.index).replace(/^\s*\d+[.)\s]*/,'').trim();
  }
  return text.replace(/^\s*\d+[.)\s]*/,'').trim().substring(0, 500);
}

export function extractChoicesFromText(text: string): Choice[] {
  return extractChoices(text, ['A','B','C','D']);
}

function extractChoices(text: string, labels: string[]): Choice[] {
  const choices: Choice[] = [];
  for (const label of labels) {
    const patterns = [
      new RegExp(`${label}[.)]\\s*([^A-${labels[labels.length-1]}\\n]*(?:\\n(?![A-${labels[labels.length-1]}][.)\\]])[^A-${labels[labels.length-1]}\\n]*)*?)`, 'is'),
      new RegExp(`\\[${label}\\]\\s*([^\\[\\]A-${labels[labels.length-1]}\\n]*)`, 'is'),
    ];
    let found = false;
    for (const pat of patterns) {
      pat.lastIndex = 0;
      const m = pat.exec(text);
      if (m && m[1] && m[1].trim().length > 0) {
        const t = m[1].replace(/\s+/g,' ').replace(/[\x00-\x1f\x7f-\x9f]/g,'').trim().substring(0,300);
        if (t) { choices.push({label,text:t}); found=true; break;}
      }
    }
    if (!found) {
      const sp = new RegExp(`${label}[.)\\]}]?\\s*([^{\\[\\]A-${labels[labels.length-1]}\\n]{1,200})`,'i');
      sp.lastIndex = 0;
      const sm = sp.exec(text);
      if (sm && sm[1]) choices.push({label, text: cleanOpt(sm[1])});
    }
  }
  return choices;
}

function cleanOpt(raw: string): string {
  return raw.replace(/\s+/g,' ').replace(/[\x00-\x1f\x7f-\x9f]/g,'').trim().substring(0,300);
}

function makeEmptyChoices(n: number): Choice[] {
  return Array.from({length:n},(_,i)=>({label:String.fromCharCode(65+i), text:''}));
}
