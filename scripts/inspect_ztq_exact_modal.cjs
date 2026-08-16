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

  console.log('1. Navigating to https://zhentiqiang.com/kaoyan/english1/ ...');
  await page.goto('https://zhentiqiang.com/kaoyan/english1/', { waitUntil: 'networkidle2' });

  // Click 201401009 (大作文)
  await page.evaluate(() => {
    const item = document.querySelector('[data-task-id="201401009"]');
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const modalHtml = await page.evaluate(() => {
    const m = document.querySelector('#task-modal');
    return m ? m.innerHTML : 'No modal found';
  });

  fs.writeFileSync(path.join(__dirname, 'ztq_modal_201401009.html'), modalHtml, 'utf8');
  console.log('Saved ztq_modal_201401009.html');

  // Screenshot modal
  const shotPath = path.join(artifactDir, 'ztq_modal_201401009.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved modal screenshot:', shotPath);

  // Click 201401008 (小作文)
  await page.evaluate(() => {
    const closeBtn = document.querySelector('#task-modal .close-btn, #task-modal [onclick*="close"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const item = document.querySelector('[data-task-id="201401008"]');
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const smallModalHtml = await page.evaluate(() => {
    const m = document.querySelector('#task-modal');
    return m ? m.innerHTML : 'No modal found';
  });
  fs.writeFileSync(path.join(__dirname, 'ztq_modal_201401008.html'), smallModalHtml, 'utf8');

  const smallShotPath = path.join(artifactDir, 'ztq_modal_201401008.png');
  await page.screenshot({ path: smallShotPath });
  console.log('Saved small modal screenshot:', smallShotPath);

  await browser.close();
})();
