/** 资源类型 */
export type ResourceType = 'exam' | 'answer' | 'analysis';

/** 单个 PDF 资源 */
export interface PaperResource {
  type: ResourceType;
  label: string;          // 显示名称
  filePath: string;       // 文件绝对路径
}

/** 单个年份的数据 */
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
