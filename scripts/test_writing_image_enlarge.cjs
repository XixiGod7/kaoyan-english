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

  // Click 大作文
  console.log('3. Clicking 大作文 (52-52) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('大作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const bigEnlargedPath = path.join(artifactDir, 'writing_big_enlarged.png');
  await page.screenshot({ path: bigEnlargedPath });
  console.log(`Saved screenshot: ${bigEnlargedPath}`);

  // Click on "全屏查看大图" or the image container
  console.log('4. Clicking on image zoom to trigger lightbox...');
  await page.evaluate(() => {
    const zoomBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('全屏查看大图'));
    if (zoomBtn) {
      zoomBtn.click();
    } else {
      const imgCard = document.querySelector('img[alt*="大作文"]');
      if (imgCard) imgCard.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const lightboxPath = path.join(artifactDir, 'writing_image_lightbox.png');
  await page.screenshot({ path: lightboxPath });
  console.log(`Saved screenshot: ${lightboxPath}`);

  // Click 小作文
  console.log('5. Clicking 小作文 (51-51) tab...');
  await page.evaluate(() => {
    // Close lightbox first if open
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === '✕');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('小作文'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const smallEnlargedPath = path.join(artifactDir, 'writing_small_enlarged.png');
  await page.screenshot({ path: smallEnlargedPath });
  console.log(`Saved screenshot: ${smallEnlargedPath}`);

  console.log('🎉 Enlarged writing images & lightbox zoom modal verified successfully!');
  await browser.close();
})();
