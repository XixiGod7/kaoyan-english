export interface DictEntry {
  type?: string;
  phonetic?: string;
  definition_cn: string;
  is_kaoyan_key?: boolean;
  task_ids?: number[];
  sentence_ids?: Array<[number, string, string]>;
}

export interface KaoyanDict {
  version: number;
  exam_type: string;
  paper: number;
  entries: Record<string, DictEntry>;
}

export interface PaperQuestion {
  id: number;
  index: number;
  knowledge_tags_id: number;
  part: string;
  question_ids: number[];
  question_type: number;
  score: number;
  section: string;
  thumbnail_id: number;
  year: string;
}

export interface PaperGroup {
  id: string;
  name: string;
  questions: PaperQuestion[];
}

export interface KnowledgePoint {
  id: number;
  name: string;
  children?: KnowledgePoint[];
}

export interface WordFreqItem {
  word: string;
  entry: DictEntry;
  paperCount: number;
  totalCount: number;
  status: 'unknown' | 'familiar' | 'unfamiliar'; // 未标, 熟词, 生词
}
