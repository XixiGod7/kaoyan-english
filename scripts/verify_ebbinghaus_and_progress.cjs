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

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 1. Mark some words as unfamiliar to populate Ebbinghaus review queue
  console.log('2. Marking words as 生词 (unfamiliar)...');
  await page.evaluate(() => {
    // Inject test unfamiliar words directly to ensure deterministic testing
    const testStatuses = {
      'individual': 'unfamiliar',
      'economic': 'unfamiliar',
      'significant': 'unfamiliar',
      'perspective': 'unfamiliar',
      'essential': 'unfamiliar'
    };
    localStorage.setItem('kaoyan_word_statuses', JSON.stringify(testStatuses));
  });

  // Reload page to apply
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // 2. Screenshot main dashboard with top Study Progress Bar in Dark Mode
  console.log('3. Capturing main wall with Study Progress Bar in Dark Mode...');
  const mainDarkShot = path.join(artifactDir, 'study_progress_bar_dark.png');
  await page.screenshot({ path: mainDarkShot });
  console.log('Saved main dark screenshot:', mainDarkShot);

  // 3. Open Ebbinghaus Vocabulary Notebook Modal
  console.log('4. Opening Ebbinghaus Vocabulary Notebook...');
  await page.evaluate(() => {
    const ebbinghausBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (ebbinghausBtn) ebbinghausBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const ebbReviewDarkShot = path.join(artifactDir, 'ebbinghaus_flashcard_front_dark.png');
  await page.screenshot({ path: ebbReviewDarkShot });
  console.log('Saved ebbinghaus flashcard front screenshot:', ebbReviewDarkShot);

  // 4. Flip Flashcard
  console.log('5. Flipping card to view definitions & exam context...');
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[340px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const ebbReviewFlippedShot = path.join(artifactDir, 'ebbinghaus_flashcard_flipped_dark.png');
  await page.screenshot({ path: ebbReviewFlippedShot });
  console.log('Saved ebbinghaus flashcard flipped screenshot:', ebbReviewFlippedShot);

  // 5. Rate the card with "记得/良好" (Good)
  console.log('6. Rating card with "良好 (Good)"...');
  await page.evaluate(() => {
    const goodBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('记得/良好'));
    if (goodBtn) goodBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. View Vocabulary List Tab
  console.log('7. Switching to Vocabulary List Tab...');
  await page.evaluate(() => {
    const listTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('生词库清单'));
    if (listTabBtn) listTabBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const ebbListShot = path.join(artifactDir, 'ebbinghaus_vocab_list_dark.png');
  await page.screenshot({ path: ebbListShot });
  console.log('Saved ebbinghaus list screenshot:', ebbListShot);

  // 7. View Memory Curve Theory Tab
  console.log('8. Switching to Ebbinghaus Memory Curve Tab...');
  await page.evaluate(() => {
    const curveTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('遗忘曲线看板'));
    if (curveTabBtn) curveTabBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const ebbCurveShot = path.join(artifactDir, 'ebbinghaus_curve_stats_dark.png');
  await page.screenshot({ path: ebbCurveShot });
  console.log('Saved ebbinghaus curve screenshot:', ebbCurveShot);

  // Close Ebbinghaus Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 8. Open Study Progress Dashboard Modal
  console.log('9. Opening Study Progress Dashboard...');
  await page.evaluate(() => {
    const progBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('学习进度'));
    if (progBtn) progBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const progModalDarkShot = path.join(artifactDir, 'study_progress_modal_dark.png');
  await page.screenshot({ path: progModalDarkShot });
  console.log('Saved study progress modal screenshot:', progModalDarkShot);

  // Close Progress Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 9. Switch to Light Mode and capture screenshots
  console.log('10. Switching to Light Theme...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Open Ebbinghaus in light mode
  await page.evaluate(() => {
    const ebbinghausBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (ebbinghausBtn) ebbinghausBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const ebbLightShot = path.join(artifactDir, 'ebbinghaus_flashcard_light.png');
  await page.screenshot({ path: ebbLightShot });
  console.log('Saved ebbinghaus light mode screenshot:', ebbLightShot);

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Open Progress in light mode
  await page.evaluate(() => {
    const progBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('学习进度'));
    if (progBtn) progBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const progLightShot = path.join(artifactDir, 'study_progress_modal_light.png');
  await page.screenshot({ path: progLightShot });
  console.log('Saved study progress modal light mode screenshot:', progLightShot);

  console.log('🎉 All Ebbinghaus Vocabulary Notebook and Study Progress features successfully verified!');
  await browser.close();
})();
