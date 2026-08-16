/** 资源类型 */
export type ResourceType = 'exam' | 'answer' | 'analysis';

/** 英语类型 */
export type EnglishType = '01' | '02';

/** 单个 PDF 资源 */
export interface PaperResource {
  type: ResourceType;
  label: string;
  filePath: string;
}

/** 一套具体试卷 (如: 2025年英语一) */
export interface PaperEntry {
  year: string;
  englishType: EnglishType;
  englishLabel: string;     // '英语一' | '英语二'
  thumbnailUrl?: string;
  isLatest: boolean;
  progress: number;         // 0-100
  resources: PaperResource[];
}

/** 按年份分组 */
export interface YearGroup {
  year: string;
  papers: PaperEntry[];
}

/** 单个年份的数据 (legacy, kept for backward compatibility) */
export interface PaperYear {
  year: string;
  era: 'early' | 'classic' | 'modern';
  eraLabel: string;
  resources: PaperResource[];
}

/** 时间段分区 */
export interface EraSection {
  key: string;
  title: string;
  subtitle: string;
  years: PaperYear[];
}
