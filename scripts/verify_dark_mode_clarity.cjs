const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Setting dark mode and navigating to 2014...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.setItem('kaoyan_theme', 'dark'));
  await page.reload({ waitUntil: 'networkidle2' });

  // Click 2014
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2014'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Cloze Dark
  const clozeDarkPath = path.join(artifactDir, 'dark_mode_cloze_clarity.png');
  await page.screenshot({ path: clozeDarkPath });
  console.log(`Saved screenshot: ${clozeDarkPath}`);

  // 2. Reading Dark
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('阅读A'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const readingDarkPath = path.join(artifactDir, 'dark_mode_reading_clarity.png');
  await page.screenshot({ path: readingDarkPath });
  console.log(`Saved screenshot: ${readingDarkPath}`);

  // 3. Translation Dark
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('翻译'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const transDarkPath = path.join(artifactDir, 'dark_mode_trans_clarity.png');
  await page.screenshot({ path: transDarkPath });
  console.log(`Saved screenshot: ${transDarkPath}`);

  console.log('🎉 All dark mode clarity screenshots captured successfully!');
  await browser.close();
})();
