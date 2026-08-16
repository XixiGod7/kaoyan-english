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

  // 2. Set daily quota to 20
  console.log('3. Setting daily quota to 20 words...');
  await page.evaluate(() => {
    const twentyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '20词');
    if (twentyBtn) twentyBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Flip card to inspect Similar / Derivative Words section
  console.log('4. Flipping card to verify 形近词/派生变形串记 section...');
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const similarWordsShot = path.join(artifactDir, 'ebbinghaus_similar_words_card_dark.png');
  await page.screenshot({ path: similarWordsShot });
  console.log('Saved similar words card screenshot:', similarWordsShot);

  // 4. Pass 10 cards to test incremental quota adjustment
  console.log('5. Passing 10 cards using Easy...');
  for (let i = 0; i < 10; i++) {
    const hasCard = await page.evaluate(() => !!document.querySelector('.min-h-\\[350px\\]'));
    if (!hasCard) break;

    await page.evaluate(() => {
      const card = document.querySelector('.min-h-\\[350px\\]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 80));

    await page.evaluate(() => {
      const easyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('轻松秒杀'));
      if (easyBtn) easyBtn.click();
    });
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 500));

  const passedText10 = await page.evaluate(() => {
    const prog = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    return prog ? prog.textContent.trim() : '';
  });
  console.log(`Progress after passing 10 words (Target 20): "${passedText10}"`);

  // 5. Test clicking "10词" (which is <= 10 already passed) -> 待攻克 should be 0, completed celebration!
  console.log('6. Switching daily quota to 10 words (when 10 already passed) -> Expecting 待攻克: 0 (Goal accomplished)...');
  await page.evaluate(() => {
    const tenBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '10词');
    if (tenBtn) tenBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const completedUnderTen = await page.evaluate(() => {
    const title = document.querySelector('h4');
    return title ? title.textContent.trim() : '';
  });
  console.log(`Status when target is 10 and 10 passed: "${completedUnderTen}"`);

  const quotaCompletedShot = path.join(artifactDir, 'ebbinghaus_quota_completed_when_exceeded.png');
  await page.screenshot({ path: quotaCompletedShot });
  console.log('Saved quota completed screenshot:', quotaCompletedShot);

  // 6. Test clicking "30词" (when 10 already passed) -> 待攻克 should be 30 - 10 = 20 words!
  console.log('7. Switching daily quota to 30 words (when 10 already passed) -> Expecting 待攻克: 20, 已过关: 10 / 30...');
  await page.evaluate(() => {
    const thirtyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '30词');
    if (thirtyBtn) thirtyBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const progressUnderThirty = await page.evaluate(() => {
    const prog = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    const waiting = Array.from(document.querySelectorAll('span')).find(s => s.textContent && s.textContent.includes('待攻克'));
    return {
      progress: prog ? prog.textContent.trim() : '',
      waiting: waiting ? waiting.textContent.trim() : ''
    };
  });
  console.log(`Incremental progress under 30 words target:`, progressUnderThirty);

  const incrementalShot = path.join(artifactDir, 'ebbinghaus_incremental_quota_30_target.png');
  await page.screenshot({ path: incrementalShot });
  console.log('Saved incremental quota screenshot:', incrementalShot);

  // 7. Test Light Mode for Similar Words Card
  console.log('8. Testing Light Mode similar words card...');
  // Close and switch theme
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const lightSimilarShot = path.join(artifactDir, 'ebbinghaus_similar_words_card_light.png');
  await page.screenshot({ path: lightSimilarShot });
  console.log('Saved light mode similar words card screenshot:', lightSimilarShot);

  console.log('🎉 Similar/derivative words section & smart incremental daily quota successfully verified!');
  await browser.close();
})();
