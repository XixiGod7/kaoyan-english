const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8089;
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ARTIFACTS_DIR = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Start local static server replicating server.py logic
const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  let filePath = '';

  if (reqPath === '/' || reqPath === '/index.html') {
    filePath = path.join(DIST_DIR, 'index.html');
  } else if (reqPath.startsWith('/data/')) {
    filePath = path.join(PUBLIC_DIR, reqPath);
  } else if (reqPath.startsWith('/images/')) {
    filePath = path.join(PUBLIC_DIR, reqPath);
  } else if (reqPath.startsWith('/icons/')) {
    filePath = path.join(PUBLIC_DIR, reqPath);
  } else if (reqPath.startsWith('/thumbs/')) {
    filePath = path.join(PUBLIC_DIR, reqPath);
  } else {
    // Check if in dist
    const distPath = path.join(DIST_DIR, reqPath);
    if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
      filePath = distPath;
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + reqPath);
  }
});

async function runE2ETests() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server active on http://127.0.0.1:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });

    console.log('Navigating to homepage...');
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });

    // Step 1: Verify Header AI Pill
    console.log('Checking Header AI grading badge...');
    await page.waitForSelector('header');
    
    // Find AI grading pill
    const aiPillText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, span'));
      const found = buttons.find(el => el.textContent && el.textContent.includes('AI批阅作文翻译'));
      return found ? found.textContent.trim() : null;
    });

    console.log('Header AI Pill found:', aiPillText);
    if (!aiPillText) throw new Error('AI批阅作文翻译 pill not found in header!');

    // Screenshot 1: Home Page with Header AI Pill
    const screen1Path = path.join(ARTIFACTS_DIR, 'ai_feature_home.png');
    await page.screenshot({ path: screen1Path });
    console.log('Saved Screenshot 1:', screen1Path);

    // Step 2: Open AI Config Modal
    console.log('Clicking AI config button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('AI批阅作文翻译'));
      if (btn) btn.click();
    });

    await page.waitForFunction(() => {
      return document.body.textContent.includes('AI 批阅与大模型 API 配置');
    }, { timeout: 5000 });
    console.log('AI Config Modal opened successfully!');

    // Check Privacy Promise text
    const hasPrivacyNotice = await page.evaluate(() => {
      return document.body.textContent.includes('100% 仅保存在您本机的浏览器本地缓存（localStorage）中');
    });
    console.log('Security promise verified:', hasPrivacyNotice);
    if (!hasPrivacyNotice) throw new Error('Privacy statement missing in modal!');

    // Screenshot 2: AI Config Modal
    const screen2Path = path.join(ARTIFACTS_DIR, 'ai_config_modal.png');
    await page.screenshot({ path: screen2Path });
    console.log('Saved Screenshot 2:', screen2Path);

    // Fill in mock DeepSeek key using puppeteer typing to trigger React state
    const inputSelector = 'input[placeholder*="sk-"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, 'sk-sample-deepseek-key-for-testing-123456', { delay: 10 });

    // Click Save button
    await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('保存配置'));
      if (saveBtn) saveBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    // Verify localStorage has the key
    const storedConfig = await page.evaluate(() => {
      return localStorage.getItem('kaoyan_ai_config');
    });
    console.log('LocalStorage config verified:', storedConfig);
    if (!storedConfig || !storedConfig.includes('sk-sample-deepseek-key')) {
      throw new Error('Config not saved in localStorage!');
    }

    // Step 3: Enter Quiz Mode for 2023 Paper
    console.log('Opening 2023 Exam Paper...');
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    await page.evaluate(() => {
      // Find 2023 button
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn2023 = buttons.find(b => b.textContent && b.textContent.includes('2023'));
      if (btn2023) {
        console.log('Clicking 2023 button:', btn2023.textContent);
        btn2023.click();
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log('Available buttons on screen:');
    const btnTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);
    });
    console.log(btnTexts.slice(0, 20));

    // Click Translation tab
    console.log('Navigating to Translation tab (翻译 (46-50))...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const transTab = tabs.find(t => t.textContent && t.textContent.includes('翻译 (46-50)'));
      if (transTab) {
        console.log('Found and clicking translation tab:', transTab.textContent);
        transTab.click();
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    // Verify AI grading button on Q46
    const hasTranslationAiBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent && b.textContent.includes('AI 智能批阅此句'));
    });
    console.log('Translation AI grading button present:', hasTranslationAiBtn);
    if (!hasTranslationAiBtn) {
      const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1000));
      console.log('Page body snippet:', bodySnippet);
      throw new Error('Translation AI grading button missing!');
    }

    // Type a sample user translation into Q46
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = '这是一个测试考生的中文翻译，测试AI批阅输入与字数统计。';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 500));

    // Screenshot 3: Translation Section with AI Grading Button
    const screen3Path = path.join(ARTIFACTS_DIR, 'ai_translation_section.png');
    await page.screenshot({ path: screen3Path });
    console.log('Saved Screenshot 3:', screen3Path);

    // Step 4: Check Writing Essay Section
    console.log('Navigating to Writing Part B (大作文 (52))...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const writingTab = tabs.find(t => t.textContent && t.textContent.includes('大作文 (52)'));
      if (writingTab) writingTab.click();
    });

    await new Promise(r => setTimeout(r, 1500));

    // Verify AI grading button on Essay
    const hasWritingAiBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent && (b.textContent.includes('AI 智能批阅') || b.textContent.includes('AI 深度阅卷')));
    });
    console.log('Writing AI grading button present:', hasWritingAiBtn);
    if (!hasWritingAiBtn) throw new Error('Writing AI grading button missing!');

    // Type a sample essay
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'As is vividly depicted in the cartoon, two individuals are having a conversation about their future career. This captivating illustration conveys a thought-provoking message.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 500));

    // Screenshot 4: Essay Section
    const screen4Path = path.join(ARTIFACTS_DIR, 'ai_writing_section.png');
    await page.screenshot({ path: screen4Path });
    console.log('Saved Screenshot 4:', screen4Path);

    // Step 5: Check Writing Part A (小作文 (51))
    console.log('Navigating to Writing Part A (小作文 (51))...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const writingTabA = tabs.find(t => t.textContent && t.textContent.includes('小作文 (51)'));
      if (writingTabA) writingTabA.click();
    });

    await new Promise(r => setTimeout(r, 1500));

    const screen5Path = path.join(ARTIFACTS_DIR, 'ai_writing_part_a.png');
    await page.screenshot({ path: screen5Path });
    console.log('Saved Screenshot 5:', screen5Path);

    // Inject sample AI Review Report before navigating into QuizMode so it loads on mount
    console.log('Injecting sample AI evaluation reports into localStorage...');
    await page.evaluate(() => {
      const sampleEssayReport = {
        qid: 52,
        type: 'writing_essay',
        score: 16.5,
        maxScore: 20,
        rawMarkdown: `### 🎯 预估得分：16.5 / 20 分（属于第四档高分段）
> 考生较好地完成了试题规定的任务。行文思路清晰，图画寓意阐述到位，三段式结构规范严谨，仅有少量词汇搭配可进一步升级。

### 📊 四大核心阅卷维度详细诊断
- **1. 内容与要点涵盖 (Content & Task Fulfillment)**：完美提炼图画中传统文化传承与现代活动结合的主旨，要点全面，立意积极向上。
- **2. 篇章结构与逻辑衔接 (Organization & Cohesion)**：首段描述画面、二段剖析社会深层成因、末段提出展望与呼吁，过渡词 (Furthermore, Consequently) 运用娴熟自然。
- **3. 词汇多样性与语域 (Lexical Resource & Tone)**：用词得体，出现了 traditional heritage, intangible cultural assets 等高级考研词汇。
- **4. 语法句式丰富度 (Grammatical Variety & Accuracy)**：有效运用了非谓语动词短语与强调句型，主谓一致性好。

### 📝 逐句语法与病句精修 (Sentence-by-Sentence Diagnostics)
- **【原句】** In the picture, there are two peoples talking about their dream.
- **【病因诊断】** people 作为“人们”时本身即为复数，加 s 则表示“民族”；且 there be 句型与动词原形搭配不够地道。
- **【推荐修改】** *As is depicted in the cartoon, two individuals are having an earnest conversation regarding their future aspirations.*

### 🌟 考研满分级升华范文 (Polished Essay)
As is vividly illustrated in the drawing, two youths are enthusiastically participating in a dragon boat race, attracting cheers from villagers on the riverbank. The drawing conveys a profound truth: the revitalization of traditional culture requires both active participation and innovative forms of celebration.

First and foremost, traditional customs serve as the vital anchor of spiritual life in modern society. Furthermore, cultural festivals create cohesion and foster community vitality. To ensure long-term preservation, we should embrace both heritage and innovation.

### 💎 提分亮点词汇与闪光句型积累
1. **invigorate traditional culture** 激发传统文化活力
2. **spiritual anchor** 精神纽带 / 精神支柱
3. **It is imperative that we strike a delicate balance between...** 我们必须在……之间寻求精妙平衡`,
        modelUsed: 'deepseek-chat',
        evaluatedAt: Date.now()
      };

      const storageKey = 'kaoyan_ai_reviews_2023';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existing[52] = sampleEssayReport;
      localStorage.setItem(storageKey, JSON.stringify(existing));
    });

    // Navigate back to home and re-enter to reload QuizMode state with saved review
    console.log('Returning to home and re-entering 2023 paper to test review report loading...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const backBtn = buttons.find(b => b.textContent && b.textContent.includes('返回真题矩阵'));
      if (backBtn) backBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Re-click 2023 button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn2023 = buttons.find(b => b.textContent && b.textContent.includes('2023'));
      if (btn2023) btn2023.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Click Writing Part B tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const writingTab = tabs.find(t => t.textContent && t.textContent.includes('大作文 (52)'));
      if (writingTab) writingTab.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    // Scroll right container down to view the full AI review report
    await page.evaluate(() => {
      const scrollContainers = Array.from(document.querySelectorAll('div')).filter(d => d.className && d.className.includes('overflow-y-auto'));
      for (const container of scrollContainers) {
        container.scrollTop = container.scrollHeight / 2;
      }
    });

    await new Promise(r => setTimeout(r, 500));

    const screen6Path = path.join(ARTIFACTS_DIR, 'ai_review_report_rendered.png');
    await page.screenshot({ path: screen6Path });
    console.log('Saved Screenshot 6 (Rendered AI Review Report):', screen6Path);

    console.log('\n🌟 ALL E2E BROWSER TESTS PASSED SUCCESSFULLY! 🌟\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runE2ETests().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
