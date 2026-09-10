import { AiConfig, ProviderPreset } from '../types/ai';

export const AI_STORAGE_KEY = 'kaoyan_ai_config';

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    desc: '国内顶尖大模型，高智商低成本，考研英语作文与翻译批阅首选',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    helpUrl: 'https://platform.deepseek.com/api_keys',
    tag: '强烈推荐',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    desc: '业界基准模型，语法纠错细致，支持 GPT-4o-mini / GPT-4o',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    helpUrl: 'https://platform.openai.com/api-keys',
    tag: '国际通用',
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    desc: '月之暗面大模型，长文本理解能力优秀，中文考研语感好',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    availableModels: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    helpUrl: 'https://platform.moonshot.cn/',
  },
  {
    id: 'dashscope',
    name: '阿里通义千问 (DashScope)',
    desc: '阿里云通义千问 OpenAI 兼容端点，响应飞快',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
    availableModels: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    helpUrl: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    desc: '清华系智谱大模型，GLM-4-Flash 个人体验性价比极高',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    availableModels: ['glm-4-flash', 'glm-4-plus', 'glm-4'],
    helpUrl: 'https://open.bigmodel.cn/',
  },
  {
    id: 'ollama',
    name: '本地 Ollama (完全离线)',
    desc: '本机离线部署的大模型，无需外网，零费用隐私 100% 掌握',
    baseUrl: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'qwen2.5:7b',
    availableModels: ['qwen2.5:7b', 'llama3:8b', 'gemma2:9b'],
    helpUrl: 'https://ollama.com/',
    tag: '本地离线',
  },
  {
    id: 'sensenova',
    name: '商汤日日新 (SenseNova)',
    desc: '商汤科技日日新大模型，支持轻量敏捷的 6.8 Flash Lite',
    baseUrl: 'https://token.sensenova.cn/v1/chat/completions',
    defaultModel: 'sensenova-6.8-flash-lite',
    availableModels: ['sensenova-6.8-flash-lite', 'deepseek-v4-flash', 'glm-5.2'],
    helpUrl: 'https://platform.sensenova.cn/docs',
    tag: '支持商汤',
  },
  {
    id: 'custom',
    name: '自定义 API (中转/第三方)',
    desc: '任何兼容 OpenAI Chat Completions 协议的第三方中转或自建服务',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'deepseek-chat', 'claude-3-5-sonnet-20241022'],
  }
];

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.3,
};

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw);
    let baseUrl = (parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl).trim();
    if (baseUrl === 'https://api.deepseek.com') {
      baseUrl = 'https://api.deepseek.com/chat/completions';
    }
    return {
      provider: parsed.provider || DEFAULT_AI_CONFIG.provider,
      baseUrl,
      apiKey: (parsed.apiKey || '').trim(),
      model: (parsed.model || DEFAULT_AI_CONFIG.model).trim(),
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_AI_CONFIG.temperature,
    };
  } catch (e) {
    console.error('Failed to load AI config from localStorage:', e);
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    const cleanConfig: AiConfig = {
      provider: config.provider || 'custom',
      baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
      apiKey: config.apiKey.trim(),
      model: config.model.trim(),
      temperature: config.temperature ?? 0.3,
    };
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(cleanConfig));
  } catch (e) {
    console.error('Failed to save AI config to localStorage:', e);
  }
}

export function clearAiConfig(): void {
  try {
    localStorage.removeItem(AI_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear AI config from localStorage:', e);
  }
}

export function hasConfiguredApiKey(): boolean {
  const config = loadAiConfig();
  // Ollama might not require API key, but other cloud APIs require it
  if (config.provider === 'ollama') return true;
  return Boolean(config.apiKey && config.apiKey.length > 5);
}

export function getMaskedApiKey(key: string): string {
  if (!key) return '未设置';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
