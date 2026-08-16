const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Navigating to Vite app...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // Click 2014
  console.log('2. Entering 2014 Quiz Mode...');
  await page.evaluate(() => {
    const yearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2014'));
    if (yearBtn) yearBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Click 小作文 Tab
  console.log('3. Clicking 小作文 (51-51) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('小作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const smallWritingPath = path.join(artifactDir, 'writing_small_2014.png');
  await page.screenshot({ path: smallWritingPath });
  console.log(`Saved screenshot: ${smallWritingPath}`);

  // Check image rendered and loaded
  const smallImg = await page.$('img[alt*="小作文"]');
  if (!smallImg) {
    throw new Error('Small writing image element not found!');
  }
  const smallImgSrc = await page.evaluate(el => el.src, smallImg);
  console.log('Small writing img src:', smallImgSrc);

  // Click 大作文 Tab
  console.log('4. Clicking 大作文 (52-52) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('大作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const bigWritingPath = path.join(artifactDir, 'writing_big_2014.png');
  await page.screenshot({ path: bigWritingPath });
  console.log(`Saved screenshot: ${bigWritingPath}`);

  // Check image rendered and loaded
  const bigImg = await page.$('img[alt*="大作文"]');
  if (!bigImg) {
    throw new Error('Big writing image element not found!');
  }
  const bigImgSrc = await page.evaluate(el => el.src, bigImg);
  console.log('Big writing img src:', bigImgSrc);

  console.log('🎉 Writing images & prompts verified successfully!');
  await browser.close();
})();
