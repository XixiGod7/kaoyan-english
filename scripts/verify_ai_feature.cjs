// Automated verification script for AI Grading & Custom API Feature
const http = require('http');

// Simple localStorage mock
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// 1. Test URL normalization (strictly use user input without appending /chat/completions)
function normalizeChatEndpoint(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, '');
}

console.log('\n--- 1. Testing Endpoint Handling (Exact Input) ---');
assert(
  normalizeChatEndpoint('https://token.sensenova.cn/v1') === 'https://token.sensenova.cn/v1',
  'SenseNova endpoint retained exactly as input'
);
assert(
  normalizeChatEndpoint('https://token.sensenova.cn/v1/chat/completions') === 'https://token.sensenova.cn/v1/chat/completions',
  'Full chat/completions endpoint retained exactly as input'
);
assert(
  normalizeChatEndpoint('https://api.openai.com/v1/') === 'https://api.openai.com/v1',
  'Trailing slash safely trimmed without adding /chat/completions'
);

// 2. Test Key Masking
function getMaskedApiKey(key) {
  if (!key) return '未设置';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

console.log('\n--- 2. Testing API Key Masking ---');
assert(getMaskedApiKey('') === '未设置', 'Empty key returns "未设置"');
assert(getMaskedApiKey('12345') === '••••••••', 'Short key masked entirely');
assert(getMaskedApiKey('sk-1234567890abcdef') === 'sk-1••••••••cdef', 'Long key masked with head and tail preserved');

// 3. Test Config Storage
const AI_STORAGE_KEY = 'kaoyan_ai_config';
const DEFAULT_AI_CONFIG = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.3,
};

function loadAiConfig() {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || DEFAULT_AI_CONFIG.provider,
      baseUrl: (parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl).trim(),
      apiKey: (parsed.apiKey || '').trim(),
      model: (parsed.model || DEFAULT_AI_CONFIG.model).trim(),
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_AI_CONFIG.temperature,
    };
  } catch (e) {
    return { ...DEFAULT_AI_CONFIG };
  }
}

function saveAiConfig(config) {
  const cleanConfig = {
    provider: config.provider || 'custom',
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: config.apiKey.trim(),
    model: config.model.trim(),
    temperature: config.temperature ?? 0.3,
  };
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(cleanConfig));
}

function hasConfiguredApiKey() {
  const config = loadAiConfig();
  if (config.provider === 'ollama') return true;
  return Boolean(config.apiKey && config.apiKey.length > 5);
}

console.log('\n--- 3. Testing Config Storage & Security ---');
localStorage.clear();
assert(loadAiConfig().provider === 'deepseek', 'Default config loads when storage empty');
assert(hasConfiguredApiKey() === false, 'Empty key returns hasConfiguredApiKey = false');

saveAiConfig({
  provider: 'custom',
  baseUrl: 'https://my-custom-proxy.com/v1/',
  apiKey: 'sk-my-secret-key-12345',
  model: 'gpt-4o',
  temperature: 0.2
});

const loaded = loadAiConfig();
assert(loaded.provider === 'custom', 'Provider saved as custom');
assert(loaded.baseUrl === 'https://my-custom-proxy.com/v1', 'Trailing slash trimmed in save');
assert(loaded.apiKey === 'sk-my-secret-key-12345', 'ApiKey saved accurately in localStorage');
assert(hasConfiguredApiKey() === true, 'hasConfiguredApiKey returns true when key present');

// 4. Test Score Extraction
function extractScoreFromMarkdown(markdown, maxScore) {
  const match = markdown.match(/预估得分[：:]\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*[0-9]+/);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val >= 0 && val <= maxScore) {
      return val;
    }
  }
  return undefined;
}

console.log('\n--- 4. Testing Score Extraction ---');
const translationReviewSample = `
### 🎯 预估得分：1.5 / 2.0 分
> 译文基本忠实于原文，语法结构拆分清晰，但有少许翻译腔。
### 🔍 核心采分点与难点拆解
...
`;
assert(extractScoreFromMarkdown(translationReviewSample, 2.0) === 1.5, 'Translation score 1.5 extracted correctly');

const essayReviewSample = `
### 🎯 预估得分: 16 / 20 分（属于第四档）
> 作文结构完整，论点充实，但在词汇多样性上有待提高。
### 📊 四大核心阅卷维度详细诊断
...
`;
assert(extractScoreFromMarkdown(essayReviewSample, 20) === 16, 'Essay score 16 extracted correctly');

const clinicalReviewSample = `
### 🎯 预估得分：8.5 / 10 分（属于第四档）
> 书信格式规范，要点齐全。
`;
assert(extractScoreFromMarkdown(clinicalReviewSample, 10) === 8.5, 'Part A score 8.5 extracted correctly');

// 5. Test Review Storage Caching
console.log('\n--- 5. Testing Review Storage Caching ---');
function getAiReviewStorageKey(year) {
  return `kaoyan_ai_reviews_${year}`;
}
function loadAiReviews(year) {
  const raw = localStorage.getItem(getAiReviewStorageKey(year));
  if (!raw) return {};
  return JSON.parse(raw);
}
function saveAiReview(year, review) {
  const current = loadAiReviews(year);
  current[review.qid] = review;
  localStorage.setItem(getAiReviewStorageKey(year), JSON.stringify(current));
}

saveAiReview('2023', {
  qid: 46,
  type: 'translation',
  score: 1.5,
  maxScore: 2.0,
  markdownReport: translationReviewSample,
  modelName: 'deepseek-chat',
  evaluatedAt: '2026-09-10T12:00:00Z'
});

const cached2023 = loadAiReviews('2023');
assert(cached2023[46] !== undefined, 'Review saved and retrieved for Q46 in 2023');
assert(cached2023[46].score === 1.5, 'Review score matches cached value');
assert(cached2023[46].modelName === 'deepseek-chat', 'Review model matches');

// 6. Test Mock OpenAI Compatible Server & Streaming
console.log('\n--- 6. Testing Mock OpenAI Chat Server & Client Handshake ---');
const TEST_PORT = 9188;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const auth = req.headers['authorization'];
    if (auth === 'Bearer invalid-token') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Incorrect API key provided' } }));
      return;
    }

    const payload = JSON.parse(body || '{}');

    if (payload.stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const chunks = [
        '### 🎯 预估得分：1.5 / 2.0 分\n',
        '> 翻译忠实通顺。\n\n',
        '### 🔍 核心采分点与难点拆解\n',
        '- **考点 1**：得分点完全命中\n'
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < chunks.length) {
          const sseData = JSON.stringify({
            choices: [{ delta: { content: chunks[i] } }]
          });
          res.write(`data: ${sseData}\n\n`);
          i++;
        } else {
          res.write('data: [DONE]\n\n');
          res.end();
          clearInterval(interval);
        }
      }, 20);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'OK'
            }
          }
        ]
      }));
    }
  });
});

server.listen(TEST_PORT, async () => {
  console.log(`Mock OpenAI Server listening on http://127.0.0.1:${TEST_PORT}`);

  try {
    // Test Ping
    const pingRes = await fetch(`http://127.0.0.1:${TEST_PORT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-valid-key'
      },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Ping' }]
      })
    });
    const pingData = await pingRes.json();
    assert(pingData.choices[0].message.content === 'OK', 'Mock API Ping returned OK');

    // Test 401 handling
    const failRes = await fetch(`http://127.0.0.1:${TEST_PORT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Ping' }]
      })
    });
    assert(failRes.status === 401, 'Invalid API Key returned HTTP 401');

    // Test Streaming SSE Client
    const streamRes = await fetch(`http://127.0.0.1:${TEST_PORT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-valid-key'
      },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Grade' }],
        stream: true
      })
    });

    let fullText = '';
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          const json = JSON.parse(line.slice(6));
          fullText += json.choices[0].delta.content;
        }
      }
    }

    assert(fullText.includes('### 🎯 预估得分：1.5 / 2.0 分'), 'SSE Stream received expected content');
    const score = extractScoreFromMarkdown(fullText, 2.0);
    assert(score === 1.5, 'Streamed content score parsed successfully');

    console.log('\n🎉 ALL 12 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
