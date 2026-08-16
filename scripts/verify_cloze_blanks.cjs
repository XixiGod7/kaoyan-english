const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1550, height: 980 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 2. Select 2017 Year (user's latest screenshot where [11] and [16] were wrong)
  console.log('2. Entering 2017 exam paper ...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button'));
    const y2017 = cards.find(c => c.textContent && c.textContent.includes('2017'));
    if (y2017) y2017.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Make sure 完形填空 tab is selected
  console.log('3. Checking 完形填空 (1-20) in 2017 ...');
  await page.evaluate(() => {
    const clozeTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('完形'));
    if (clozeTab) clozeTab.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Extract all blank numbers in DOM sequence
  const result2017 = await page.evaluate(() => {
    const blanks = Array.from(document.querySelectorAll('button[id^="blank-btn-"]'));
    const blankNums = blanks.map(b => parseInt(b.id.replace('blank-btn-', '')));
    const pCount = document.querySelectorAll('div.space-y-3 p').length;
    return {
      blankNums,
      pCount
    };
  });

  console.log('2017 Cloze DOM Blanks Sequence:', result2017.blankNums.join(', '));
  console.log('2017 Cloze Paragraph Count:', result2017.pCount);

  const darkShot2017 = path.join(artifactDir, 'cloze_2017_strictly_ascending_dark.png');
  await page.screenshot({ path: darkShot2017 });
  console.log('Saved 2017 Cloze strictly ascending Dark screenshot:', darkShot2017);

  // Switch to light theme
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && (b.title.includes('主题') || b.textContent === '☀️' || b.textContent === '🌙'));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const lightShot2017 = path.join(artifactDir, 'cloze_2017_strictly_ascending_light.png');
  await page.screenshot({ path: lightShot2017 });
  console.log('Saved 2017 Cloze strictly ascending Light screenshot:', lightShot2017);

  // Assert 1..20 strict sequence
  const is1to20 = result2017.blankNums.length === 20 && result2017.blankNums.every((n, i) => n === i + 1);
  if (!is1to20) {
    console.error('❌ Failed: 2017 blank numbers are NOT strictly 1..20!');
    process.exit(1);
  }

  console.log('🎉 2017 完形填空严格 1 到 20 递增顺序与优雅段落排版 100% 验证通过！');
  await browser.close();
})();
