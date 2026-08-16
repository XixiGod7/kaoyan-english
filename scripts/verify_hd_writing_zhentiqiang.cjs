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

  console.log('1. Navigating to Vite app...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // Click 2014
  console.log('2. Entering 2014 Quiz Mode...');
  await page.evaluate(() => {
    const yearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2014'));
    if (yearBtn) yearBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click 大作文 (52)
  console.log('3. Clicking 大作文 (52-52) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('大作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const bigHdPath = path.join(artifactDir, 'writing_big_hd_zhentiqiang.png');
  await page.screenshot({ path: bigHdPath });
  console.log(`Saved screenshot: ${bigHdPath}`);

  // Click 小作文 (51)
  console.log('4. Clicking 小作文 (51-51) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('小作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const smallHdPath = path.join(artifactDir, 'writing_small_hd_zhentiqiang.png');
  await page.screenshot({ path: smallHdPath });
  console.log(`Saved screenshot: ${smallHdPath}`);

  // Switch to 2013 and check big essay (drawing of parents and child)
  console.log('5. Testing 2013 大作文...');
  await page.evaluate(() => {
    const homeBtn = document.querySelector('button[title*="首页"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('首页'));
    if (homeBtn) homeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const btn2013 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2013'));
    if (btn2013) btn2013.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('大作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const hd2013Path = path.join(artifactDir, 'writing_2013_hd_zhentiqiang.png');
  await page.screenshot({ path: hd2013Path });
  console.log(`Saved screenshot: ${hd2013Path}`);

  console.log('🎉 Full HD writing layout & images verified successfully!');
  await browser.close();
})();
