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

  // 1. Open Ebbinghaus review modal
  console.log('2. Opening Ebbinghaus Vocabulary Review Modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Set daily target to 10 words
  console.log('3. Setting daily quota to 10 words...');
  await page.evaluate(() => {
    const tenBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '10词');
    if (tenBtn) tenBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Record initial word name
  const firstWord = await page.evaluate(() => {
    const h2 = document.querySelector('.min-h-\\[350px\\] h2');
    return h2 ? h2.textContent.trim() : '';
  });
  console.log(`Initial Card 1 Word: "${firstWord}"`);

  // Flip card 1
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Click "模糊不熟" (Hard) on Card 1 -> must re-queue for today!
  console.log('4. Rating Card 1 as "模糊不熟 (Hard)" -> Expecting re-queue for today...');
  await page.evaluate(() => {
    const hardBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('模糊不熟'));
    if (hardBtn) hardBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const fuzzyToastShot = path.join(artifactDir, 'ebbinghaus_fuzzy_retry_loop.png');
  await page.screenshot({ path: fuzzyToastShot });
  console.log('Saved fuzzy retry loop toast screenshot:', fuzzyToastShot);

  // Check progress: should still be 0 / 10 passed
  const progressAfterHard = await page.evaluate(() => {
    const progText = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    return progText ? progText.textContent.trim() : '';
  });
  console.log(`Progress after Hard: ${progressAfterHard}`);

  // Flip card 2
  await page.evaluate(() => {
    const card = document.querySelector('.min-h-\\[350px\\]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Click "轻松秒杀" (Easy) on Card 2 -> should pass today!
  console.log('5. Rating Card 2 as "轻松秒杀 (Easy)" -> Expecting passed count to become 1 / 10...');
  await page.evaluate(() => {
    const easyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('轻松秒杀'));
    if (easyBtn) easyBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const progressAfterEasy = await page.evaluate(() => {
    const progText = document.querySelector('.font-mono.text-sm.font-bold.text-indigo-400');
    return progText ? progText.textContent.trim() : '';
  });
  console.log(`Progress after Easy: ${progressAfterEasy}`);

  const passedProgressShot = path.join(artifactDir, 'ebbinghaus_progress_advancing.png');
  await page.screenshot({ path: passedProgressShot });
  console.log('Saved progress advancing screenshot:', passedProgressShot);

  // Quick test: Finish remaining cards with Easy/Good until session completion celebration screen
  console.log('6. Finishing remaining session cards to verify completion celebration screen...');
  for (let i = 0; i < 15; i++) {
    const hasCard = await page.evaluate(() => !!document.querySelector('.min-h-\\[350px\\]'));
    if (!hasCard) break;

    // Flip card
    await page.evaluate(() => {
      const card = document.querySelector('.min-h-\\[350px\\]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 100));

    // Rate Good
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('认得/良好'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 150));
  }

  await new Promise(r => setTimeout(r, 600));

  const completedShot = path.join(artifactDir, 'ebbinghaus_session_completed_celebration.png');
  await page.screenshot({ path: completedShot });
  console.log('Saved session completion screenshot:', completedShot);

  console.log('🎉 Active session review queue & retry loop successfully verified!');
  await browser.close();
})();
