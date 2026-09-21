export interface PassageIndexItem {
  exam: string;
  key: string; // e.g. "2025-t1"
  year: number;
  text_no: number;
  title?: string | null;
  preview?: string;
  n: number;
}

export interface SentenceTrunk {
  '主语'?: string;
  '谓语'?: string;
  '宾语或表语'?: string;
  '主干翻译'?: string;
}

export interface SentenceComponent {
  '成分类型': string;
  '原文': string;
  '修饰对象': string;
  '中文翻译': string;
  '说明': string;
}

export interface PassageSentence {
  sid: string;
  s: string;
  para_no: number;
  para_seq: number;
  trunk: SentenceTrunk;
  components: SentenceComponent[];
  zh: string;
  underline?: string | null;
}

export interface PassageParagraph {
  index: number;
  text: string;
}

export interface PassageDetail {
  exam: string;
  key: string;
  year: number;
  text_no: number;
  title?: string | null;
  sentences: PassageSentence[];
  paragraphs: PassageParagraph[];
}

export interface PassageKeywordWord {
  w: string;
  trans: string;
  phonetic?: string;
  is_syllabus?: boolean;
  is_core?: boolean;
  level?: string;
  count?: number;
}

export interface PassageKeywordPhrase {
  phrase: string;
  trans: string;
  in_text?: boolean;
}

export interface PassageKeywords {
  exam: string;
  key: string;
  found: boolean;
  words: PassageKeywordWord[];
  phrases: PassageKeywordPhrase[];
}

export interface ReadingQuestion {
  id: number;
  qNo: number;
  stem: string;
  choices: string[];
  answer?: string;
  analysis?: string;
  anchors?: string[];
  traps?: Record<string, string>;
}

export interface GrammarRow {
  sid: string;
  s: string;
  zh: string;
  year: number;
  text_no: number;
  cat: string; // appos, attr, coord, adv, nounclause, nonfinite, special
  catName?: string;
  comp_type?: string;
  comp_orig?: string;
  comp_target?: string;
  comp_zh?: string;
  comp_note?: string;
  trunk?: SentenceTrunk;
  components?: SentenceComponent[];
}

export interface GrammarResult {
  total: number;
  catCounts: Record<string, number>;
  rows: GrammarRow[];
}

export interface ParaphraseItem {
  id: string;
  exam: string;
  passKey: string;
  qNo: number;
  text: string;
  stem: string;
  choices: string[];
  answer: string;
  zh: string;
}

export interface PhraseItem {
  en: string;
  zh: string;
  head: string;
  part: string;
  sent?: string;
  sentZh?: string;
  sids?: string[];
}

export interface VocabStatItem {
  w: string;
  n: number;
  docs: number;
  years: number;
  firstYear: number;
  lastYear: number;
  recent: number;
  everyYear?: boolean;
  inSyllabus: boolean;
  syllabusRank: number;
  rawWord?: string;
  phonetic?: string;
  trans?: string;
  byYear?: string;
}

export interface FavoriteSentenceItem {
  sid: string;
  s: string;
  zh: string;
  trunk: SentenceTrunk;
  components: SentenceComponent[];
  year: number;
  text_no: number;
  addedAt: number;
}

export interface WrongQuestionItem {
  id: string | number;
  type: 'reading' | 'paraphrase';
  title: string;
  stem: string;
  choices: string[];
  myChoice: string;
  answer: string;
  analysis?: string;
  zh?: string;
  passKey?: string;
  year?: number;
  text_no?: number;
  timestamp: number;
}
