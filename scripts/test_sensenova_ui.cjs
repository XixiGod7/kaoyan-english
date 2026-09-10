const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

async function testSenseNovaUI() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    console.log('Navigating to http://127.0.0.1:8085/ ...');
    await page.goto('http://127.0.0.1:8085/', { waitUntil: 'networkidle2' });

    // Open AI config modal
    console.log('Clicking AI Config button in header...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('AI批阅作文翻译'));
      if (btn) btn.click();
    });

    await page.waitForFunction(() => {
      return document.body.textContent.includes('AI 批阅与大模型 API 配置');
    }, { timeout: 5000 });

    console.log('Clicking 商汤日日新 preset button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sensenovaBtn = buttons.find(b => b.textContent && b.textContent.includes('商汤日日新'));
      if (sensenovaBtn) sensenovaBtn.click();
    });

    await new Promise(r => setTimeout(r, 300));

    console.log('Typing API Key...');
    const inputSelector = 'input[placeholder*="sk-"]';
    await page.waitForSelector(inputSelector);
    // Clear and type
    await page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (el) el.value = '';
    }, inputSelector);
    await page.type(inputSelector, 'sk-hqAiWjkWZQjMAMi6YaNFlZcl94UrnqiL', { delay: 10 });

    console.log('Waiting 6 seconds for SenseNova rate limit window to refresh...');
    await new Promise(r => setTimeout(r, 6000));

    console.log('Clicking "测试连接与可用性" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const testBtn = buttons.find(b => b.textContent && b.textContent.includes('测试连接与可用性'));
      if (testBtn) testBtn.click();
    });

    console.log('Waiting for test to finish...');
    await new Promise(r => setTimeout(r, 8000));

    const resultText = await page.evaluate(() => {
      const card = document.querySelector('.animate-in');
      return card ? card.innerText : document.body.innerText.slice(0, 500);
    });
    console.log('Result on screen:\n', resultText);

    const screenPath = path.join(ARTIFACTS_DIR, 'sensenova_connection_success.png');
    await page.screenshot({ path: screenPath });
    console.log('Saved screenshot:', screenPath);

    // Click save
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.textContent && b.textContent.includes('保存配置'));
      if (saveBtn) saveBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    console.log('Configuration saved successfully!');
  } finally {
    await browser.close();
  }
}

testSenseNovaUI().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
