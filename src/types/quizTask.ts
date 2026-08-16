export interface TaskQuestionOptionToken {
  lemma: string;
  surface: string;
}

export interface TaskQuestion {
  id: number;
  qid: number;
  text: string;
  options: string[];
  answer: string;
  ai_analysis_text?: string;
  option_tokens?: Record<string, TaskQuestionOptionToken[]>;
}

export interface TaskBlank {
  blank_no: number;
  sentence_id: number;
  replace: {
    start: number;
    end: number;
  };
}

export interface TaskDetail {
  id?: number;
  type?: string;
  exam_info?: string;
  exam_type?: string;
  section?: string;
  part?: string;
  directions?: string;
  article?: string;
  cloze_formatted_article?: string;
  reference_translation?: string;
  question_prompt?: string;
  img_url?: string;
  blanks?: TaskBlank[];
  content_json?: Record<string, any>;
  questions?: TaskQuestion[];
  sentences?: any[];
}

export interface TaskBundleItem {
  meta: {
    id: number;
    index: number;
    chinese_name: string;
    score: string;
    category: string;
    year: string;
  };
  detail: TaskDetail;
}

export interface YearPaperBundle {
  year: string;
  tasks: TaskBundleItem[];
}
