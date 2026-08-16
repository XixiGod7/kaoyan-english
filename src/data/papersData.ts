import type { PaperYear, PaperEntry, YearGroup, EraSection } from '../types/paper';

const B = 'pdfs';

/** 获取封面年代段 CSS 类名 */
export function getCoverEraClass(year: number): string {
  if (year >= 2020) return 'era-2020s';
  if (year >= 2015) return 'era-2015s';
  return 'era-2010s';
}

/** 生成单套试卷数据 */
function createPaperEntry(year: number, isLatest: boolean = false): PaperEntry {
  return {
    year: String(year),
    englishType: '01',
    englishLabel: '英语一',
    isLatest,
    progress: 0,
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

/** 辅助：生成 2010-2025 年份数据 (legacy) */
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

/** 所有试卷（按年份降序，新格式） */
export const allPaperEntries: PaperEntry[] = Array.from({ length: 16 }, (_, i) => {
  const year = 2025 - i;
  return createPaperEntry(year, year === 2025);
});

/** 按年份分组（降序） */
export const yearGroups: YearGroup[] = Array.from({ length: 16 }, (_, i) => {
  const year = 2025 - i;
  return {
    year: String(year),
    papers: [createPaperEntry(year, year === 2025)],
  };
});

/** 2010-2025 年数据 (legacy) */
export const modernYears: PaperYear[] = Array.from({ length: 16 }, (_, i) => createModernYear(2010 + i));

/** 所有时间段分区 (legacy) */
export const eraSections: EraSection[] = [
  {
    key: 'era-modern',
    title: '现代时期 · 2010-2025',
    subtitle: '英语一专用',
    years: modernYears,
  },
];

/** 获取所有年份数据（扁平数组） (legacy) */
export function getAllYears(): PaperYear[] {
  return modernYears;
}

/** 根据年份查找数据 (legacy) */
export function findYear(year: string): PaperYear | undefined {
  return getAllYears().find((y) => y.year === year);
}

/** 根据年份查找试卷 */
export function findPaperEntry(year: string, englishType: string = '01'): PaperEntry | undefined {
  return allPaperEntries.find((p) => p.year === year && p.englishType === englishType);
}
