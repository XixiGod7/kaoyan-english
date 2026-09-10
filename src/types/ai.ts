export interface AiConfig {
  provider: string; // 'deepseek' | 'openai' | 'kimi' | 'dashscope' | 'zhipu' | 'ollama' | 'custom'
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  desc: string;
  baseUrl: string;
  defaultModel: string;
  availableModels: string[];
  helpUrl?: string;
  tag?: string;
}

export interface AiReviewReport {
  qid: number;
  type: 'translation' | 'writing_clinical' | 'writing_essay';
  rawMarkdown: string;
  score?: number;
  maxScore?: number;
  evaluatedAt: number;
  modelUsed: string;
  isEvaluating?: boolean;
  error?: string;
}
