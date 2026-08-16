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

  // 1. Open Ebbinghaus modal
  console.log('2. Opening Ebbinghaus Modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 2. Set daily quota to 10
  console.log('3. Setting daily quota to 10 words...');
  await page.evaluate(() => {
    const tenBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '10词');
    if (tenBtn) tenBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Pass 2 cards
  console.log('4. Passing 2 cards (Card 1 with Easy, Card 2 with Good)...');
  // Flip Card 1
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 300));
  // Rate Easy
  await page.evaluate(() => {
    const easyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('轻松秒杀'));
    if (easyBtn) easyBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Flip Card 2
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 300));
  // Rate Good
  await page.evaluate(() => {
    const goodBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('认得/良好'));
    if (goodBtn) goodBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Check progress before closing
  const progressBeforeClose = await page.evaluate(() => {
    const prog = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    return prog ? prog.textContent.trim() : '';
  });
  console.log(`Progress before closing modal: "${progressBeforeClose}"`);

  // 4. Close the modal
  console.log('5. Closing modal via X button...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 5. Reopen the modal
  console.log('6. Reopening modal to verify progress preservation...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Check progress after reopening
  const progressAfterReopen = await page.evaluate(() => {
    const prog = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    return prog ? prog.textContent.trim() : '';
  });
  console.log(`Progress after reopening modal: "${progressAfterReopen}"`);

  const reopenedShot = path.join(artifactDir, 'ebbinghaus_progress_preserved_after_close.png');
  await page.screenshot({ path: reopenedShot });
  console.log('Saved preserved progress screenshot:', reopenedShot);

  if (progressAfterReopen.includes('2') && progressAfterReopen.includes('10')) {
    console.log('✅ SUCCESS: Daily progress is completely preserved across modal open/close!');
  } else {
    console.error('❌ ERROR: Progress was not preserved properly!', progressAfterReopen);
  }

  await browser.close();
})();
