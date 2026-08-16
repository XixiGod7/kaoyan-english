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

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // Wait 1.5s for async React loading
  await new Promise(r => setTimeout(r, 1500));

  const allBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
  });
  console.log('All buttons on page:', allBtns);

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('单词复习'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked 单词复习 button:', clicked);
  await new Promise(r => setTimeout(r, 600));

  // Verify Header Title & Subtitle cleanup
  const headerCheck = await page.evaluate(() => {
    const modal = document.querySelector('.rounded-3xl.max-w-4xl');
    const headerTitle = modal ? modal.querySelector('h3')?.textContent?.trim() : '';
    const hasLongSubtitle = modal ? modal.textContent.includes('生词/模糊词今日重复循环考查') : false;
    const hasBottomHint = modal ? modal.textContent.includes('先在脑海中回忆中文词义') : false;
    return {
      headerTitle,
      hasLongSubtitle,
      hasBottomHint,
    };
  });
  console.log('Header & Card Cleanliness Check:', headerCheck);

  if (headerCheck.headerTitle !== '单词复习' || headerCheck.hasLongSubtitle || headerCheck.hasBottomHint) {
    console.error('❌ Failed: Modal still contains verbose description or wrong title!');
    process.exit(1);
  }

  // Screenshot in Dark Theme
  const darkScreenshot = path.join(artifactDir, 'word_review_clean_dark.png');
  await page.screenshot({ path: darkScreenshot });
  console.log('Saved Dark Clean Word Review screenshot:', darkScreenshot);

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.rounded-3xl.max-w-4xl button[class*="rounded-full"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Switch to Light Theme
  console.log('3. Switching to Light Theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙') || b.textContent.includes('浅色模式') || b.textContent.includes('深色模式')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Open modal in Light Theme
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('单词复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot in Light Theme
  const lightScreenshot = path.join(artifactDir, 'word_review_clean_light.png');
  await page.screenshot({ path: lightScreenshot });
  console.log('Saved Light Clean Word Review screenshot:', lightScreenshot);

  console.log('🎉 单词复习界面极简化精简 100% 验证通过！');
  await browser.close();
})();
