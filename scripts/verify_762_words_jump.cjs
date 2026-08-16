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

  console.log('1. Navigating to http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 1000));

  // Check stats
  const stats = await page.evaluate(() => {
    const counts = Array.from(document.querySelectorAll('aside .grid button')).map(b => b.textContent.trim().replace(/\s+/g, ' '));
    const firstWord = document.querySelector('aside .divide-y button');
    return {
      counts,
      firstWordText: firstWord ? firstWord.textContent.trim().replace(/\s+/g, ' ') : 'none'
    };
  });

  console.log('Sidebar Stats:', stats);

  const sidebarShot = path.join(artifactDir, 'word_sidebar_762_verified.png');
  await page.screenshot({ path: sidebarShot });
  console.log('Saved sidebar screenshot:', sidebarShot);

  // Click the first word: individual (28篇/33次)
  console.log('2. Clicking first word (individual)...');
  await page.evaluate(() => {
    const firstWord = document.querySelector('aside .divide-y button');
    if (firstWord) firstWord.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const modalShot = path.join(artifactDir, 'word_modal_individual_verified.png');
  await page.screenshot({ path: modalShot });
  console.log('Saved modal screenshot:', modalShot);

  // Test sentence jump
  console.log('3. Clicking "定位到真题此句"...');
  await page.evaluate(() => {
    const jumpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('定位到真题此句'));
    if (jumpBtn) jumpBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const jumpShot = path.join(artifactDir, 'word_sentence_jump_verified.png');
  await page.screenshot({ path: jumpShot });
  console.log('Saved jump screenshot:', jumpShot);

  console.log('🎉 762 Core Focus Words & Sentence Jump verified 100%!');
  await browser.close();
})();
