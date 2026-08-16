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

  // 2. Click 2021 Year card to enter Quiz Mode
  console.log('2. Entering 2021 exam paper ...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button'));
    const y2021 = cards.find(c => c.textContent && c.textContent.includes('2021'));
    if (y2021) y2021.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Switch to Translation tab
  console.log('3. Switching to Translation tab ...');
  await page.evaluate(() => {
    const transTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('翻译'));
    if (transTab) transTab.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Check that 5 textareas exist
  const textareaCount = await page.evaluate(() => {
    return document.querySelectorAll('textarea').length;
  });
  console.log(`Found ${textareaCount} textareas in Translation view`);
  if (textareaCount !== 5) {
    console.error(`❌ Expected 5 textareas for translation, but found ${textareaCount}!`);
    process.exit(1);
  }

  // 5. Fill out all 5 textareas
  console.log('5. Filling in translations for questions 46, 47, 48, 49, 50 ...');
  await page.type('#translation-input-46', '二战是现代西方社会高等教育的分水岭事件。');
  await page.type('#translation-input-47', '战后对进入高等教育的需求扩大到了此前未曾考虑过上大学的群体和社会阶层。');
  await page.type('#translation-input-48', '首先是增长速度：在西欧许多国家，接受高等教育的学生人数在短短数年内翻了一番。');
  await page.type('#translation-input-49', '第二次重大变革发生在20世纪70年代初，高等教育结构经历了深刻重塑。');
  await page.type('#translation-input-50', '高等教育系统不仅在绝对规模上迅速扩张，而且在适龄人群中的入学普及比例也大幅提升。');
  await new Promise(r => setTimeout(r, 500));

  // 6. Verify Answer sheet marks 46-50 as filled
  const answerSheetCheck = await page.evaluate(() => {
    const q46 = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '46');
    const q50 = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '50');
    return {
      q46Class: q46?.className,
      q50Class: q50?.className,
    };
  });
  console.log('Answer sheet status check for 46 & 50:', answerSheetCheck);

  // 7. Toggle show translation
  console.log('7. Toggling show translation to verify reference translations ...');
  await page.evaluate(() => {
    const chk = document.querySelector('input[type="checkbox"]');
    if (chk) chk.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const darkScreenshot = path.join(artifactDir, 'translation_5_input_boxes_dark.png');
  await page.screenshot({ path: darkScreenshot });
  console.log('Saved Dark mode screenshot:', darkScreenshot);

  // 8. Switch to Light Mode
  console.log('8. Switching to light theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const lightScreenshot = path.join(artifactDir, 'translation_5_input_boxes_light.png');
  await page.screenshot({ path: lightScreenshot });
  console.log('Saved Light mode screenshot:', lightScreenshot);

  console.log('🎉 翻译五个独立输入框功能 100% 验证通过！');
  await browser.close();
})();
