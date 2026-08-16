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

  // Handle JS window.confirm dialogs automatically
  page.on('dialog', async dialog => {
    console.log('Dialog opened:', dialog.message());
    await dialog.accept();
  });

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

  // 3. Answer questions 1, 2, 3 in Cloze
  console.log('3. Answering Question 1, 2, 3 in Cloze ...');
  await page.evaluate(() => {
    // Select Option A for Q1
    const q1Btns = document.querySelectorAll('#question-1 button');
    if (q1Btns.length > 0) q1Btns[0].click();

    // Select Option C for Q2
    const q2Btns = document.querySelectorAll('#question-2 button');
    if (q2Btns.length > 2) q2Btns[2].click();

    // Select Option B for Q3
    const q3Btns = document.querySelectorAll('#question-3 button');
    if (q3Btns.length > 1) q3Btns[1].click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Switch to Translation and type text
  console.log('4. Switching to Translation and inputting text ...');
  await page.evaluate(() => {
    const transTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('翻译'));
    if (transTab) transTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.type('textarea', '(46) 人工智能技术正在深刻改变现代社会生活。\n(47) 科学研究表明持续学习能够显著改善认知功能。');
  await new Promise(r => setTimeout(r, 600));

  // Verify saved in localStorage
  const storageAfterAnswer = await page.evaluate(() => {
    return localStorage.getItem('kaoyan_quiz_progress_2021');
  });
  console.log('Saved localStorage progress:', storageAfterAnswer);
  if (!storageAfterAnswer) {
    console.error('❌ Failed: Progress was not auto-saved to localStorage!');
    process.exit(1);
  }

  const answeredScreenshot = path.join(artifactDir, 'quiz_autosaved_with_answers_dark.png');
  await page.screenshot({ path: answeredScreenshot });
  console.log('Saved Auto-saved state screenshot:', answeredScreenshot);

  // 5. Exit back to Home Matrix
  console.log('5. Clicking "返回真题矩阵" to exit ...');
  await page.evaluate(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 6. Re-enter 2021 paper to verify restoration
  console.log('6. Re-entering 2021 exam paper to test auto-restore ...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button'));
    const y2021 = cards.find(c => c.textContent && c.textContent.includes('2021'));
    if (y2021) y2021.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Verify Cloze answers are restored
  const restoredCloze = await page.evaluate(() => {
    const q1Btn = document.querySelector('#blank-btn-1')?.textContent || '';
    const q2Btn = document.querySelector('#blank-btn-2')?.textContent || '';
    const q3Btn = document.querySelector('#blank-btn-3')?.textContent || '';
    const hasRestoredToast = !!document.querySelector('.animate-bounce');
    return { q1Btn, q2Btn, q3Btn, hasRestoredToast };
  });

  console.log('Restored Cloze blank buttons:', restoredCloze);
  if (!restoredCloze.q1Btn.includes('A') || !restoredCloze.q2Btn.includes('C') || !restoredCloze.q3Btn.includes('B')) {
    console.error('❌ Failed: Objective choices were not restored!');
    process.exit(1);
  }

  const restoredScreenshot = path.join(artifactDir, 'quiz_restored_progress_toast.png');
  await page.screenshot({ path: restoredScreenshot });
  console.log('Saved Restored Progress screenshot:', restoredScreenshot);

  // Switch to Translation tab and verify text is restored
  await page.evaluate(() => {
    const transTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('翻译'));
    if (transTab) transTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const restoredTransText = await page.evaluate(() => {
    return document.querySelector('textarea')?.value || '';
  });
  console.log('Restored Translation Text in textarea:', restoredTransText);
  if (!restoredTransText.includes('人工智能技术')) {
    console.error('❌ Failed: Translation textarea text was not restored!');
    process.exit(1);
  }

  // 7. Test Clear Progress Button in Answer Sheet
  console.log('7. Testing Clear Progress button in Answer sheet ...');
  await page.evaluate(() => {
    const clearBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('清空本卷做题进度'));
    if (clearBtns.length > 0) clearBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 600));

  const storageAfterClear = await page.evaluate(() => {
    return localStorage.getItem('kaoyan_quiz_progress_2021');
  });
  console.log('Storage after clear:', storageAfterClear);
  if (storageAfterClear) {
    console.error('❌ Failed: Progress still exists in localStorage after clear!');
    process.exit(1);
  }

  const clearedScreenshot = path.join(artifactDir, 'quiz_cleared_progress_dark.png');
  await page.screenshot({ path: clearedScreenshot });
  console.log('Saved Cleared state screenshot:', clearedScreenshot);

  console.log('🎉 做题进度自动保存与手动清空功能 100% 验证通过！');
  await browser.close();
})();
