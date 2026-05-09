import type { PaperYear, EraSection } from '../types/paper';

const B = '/pdfs';

/** 1980-1997 年数据 */
export const earlyYears: PaperYear[] = [
  {
    year: '1980-1985',
    era: 'early',
    eraLabel: '早期真题（英语一二通用）',
    resources: [
      {
        type: 'exam',
        label: '1980—1985年历年考研英语真题集',
        filePath: `${B}/1980-2009/exam/1980-1985.pdf`,
      },
    ],
  },
  {
    year: '1986-1995',
    era: 'early',
    eraLabel: '早期真题（英语一二通用）',
    resources: [
      {
        type: 'exam',
        label: '1986—1995年历年考研英语真题集',
        filePath: `${B}/1980-2009/exam/1986-1995.pdf`,
      },
      {
        type: 'analysis',
        label: '1986-1990年考研英语真题答案及解析',
        filePath: `${B}/1980-2009/analysis/early-answers/1986-1990-answer-analysis.pdf`,
      },
      {
        type: 'analysis',
        label: '1991-1995年考研英语真题答案及解析',
        filePath: `${B}/1980-2009/analysis/early-answers/1991-1995-answer-analysis.pdf`,
      },
    ],
  },
  {
    year: '1996',
    era: 'early',
    eraLabel: '早期真题（英语一二通用）',
    resources: [
      {
        type: 'exam',
        label: '1996年考研英语真题',
        filePath: `${B}/1980-2009/exam/1996.pdf`,
      },
      {
        type: 'analysis',
        label: '1996年考研英语真题答案及解析',
        filePath: `${B}/1980-2009/analysis/early-answers/1996-answer-analysis.pdf`,
      },
    ],
  },
  {
    year: '1997',
    era: 'early',
    eraLabel: '早期真题（英语一二通用）',
    resources: [
      {
        type: 'exam',
        label: '1997年考研英语真题',
        filePath: `${B}/1980-2009/exam/1997.pdf`,
      },
      {
        type: 'analysis',
        label: '1997年考研英语真题答案及解析',
        filePath: `${B}/1980-2009/analysis/early-answers/1997-answer-analysis.pdf`,
      },
    ],
  },
];

/** 辅助：生成 1998-2009 年份数据 */
function createClassicYear(year: number): PaperYear {
  return {
    year: String(year),
    era: 'classic',
    eraLabel: '经典时期（英语一二通用）',
    resources: [
      {
        type: 'exam',
        label: `${year}年考研英语真题`,
        filePath: `${B}/1980-2009/exam/${year}.pdf`,
      },
      {
        type: 'answer',
        label: `${year}年考研英语真题答案`,
        filePath: `${B}/1980-2009/answers/${year}-answer.pdf`,
      },
      {
        type: 'analysis',
        label: `${year}年考研英语真题解析`,
        filePath: `${B}/1980-2009/analysis/${year}-analysis.pdf`,
      },
    ],
  };
}

/** 1998-2009 年数据 */
export const classicYears: PaperYear[] = Array.from({ length: 12 }, (_, i) => createClassicYear(1998 + i));

/** 辅助：生成 2010-2025 年份数据 */
function createModernYear(year: number): PaperYear {
  return {
    year: String(year),
    era: 'modern',
    eraLabel: '现代时期（英语一专用）',
    resources: [
      {
        type: 'exam',
        label: `${year}年考研英语一真题`,
        filePath: `${B}/2010-2025/exam/${year}.pdf`,
      },
      {
        type: 'answer',
        label: `${year}年考研英语一真题答案`,
        filePath: `${B}/2010-2025/answers/${year}-answer.pdf`,
      },
      {
        type: 'analysis',
        label: `${year}年考研英语一真题解析`,
        filePath: `${B}/2010-2025/analysis/${year}-analysis.pdf`,
      },
    ],
  };
}

/** 2010-2025 年数据 */
export const modernYears: PaperYear[] = Array.from({ length: 16 }, (_, i) => createModernYear(2010 + i));

/** 所有时间段分区 */
export const eraSections: EraSection[] = [
  {
    key: 'era-early',
    title: '第一阶段 · 1980-1997',
    subtitle: '早期真题（英语一二通用）',
    years: earlyYears,
  },
  {
    key: 'era-classic',
    title: '第二阶段 · 1998-2009',
    subtitle: '经典时期（英语一二通用）',
    years: classicYears,
  },
  {
    key: 'era-modern',
    title: '第三阶段 · 2010-2025',
    subtitle: '现代时期（英语一专用）',
    years: modernYears,
  },
];

/** 获取所有年份数据（扁平数组） */
export function getAllYears(): PaperYear[] {
  return [...earlyYears, ...classicYears, ...modernYears];
}

/** 根据年份查找数据 */
export function findYear(year: string): PaperYear | undefined {
  return getAllYears().find((y) => y.year === year);
}
