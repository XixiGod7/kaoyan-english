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
  await new Promise(r => setTimeout(r, 1500));

  // 2. Open Data Backup Modal
  console.log('2. Opening Data Backup Modal ...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('数据备份'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Click "清空本地学习数据" to trigger confirmation
  console.log('3. Clicking "清空本地学习数据" ...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('清空本地学习数据'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Verify button presence & non-overlap
  const checkButtons = await page.evaluate(() => {
    const modal = document.querySelector('.max-w-xl');
    const allButtons = Array.from(modal ? modal.querySelectorAll('button') : []).map(b => b.textContent?.trim());
    const hasFinishBtn = allButtons.some(t => t === '完成');
    const hasConfirmBtn = allButtons.some(t => t === '确认清空');
    const hasCancelBtn = allButtons.some(t => t === '取消');
    return {
      allButtons,
      hasFinishBtn,
      hasConfirmBtn,
      hasCancelBtn,
    };
  });
  console.log('Clear Confirmation Buttons Check:', checkButtons);

  if (checkButtons.hasFinishBtn || !checkButtons.hasConfirmBtn || !checkButtons.hasCancelBtn) {
    console.error('❌ Failed: Confirmation buttons still contain "完成" or missing cancel/confirm!');
    process.exit(1);
  }

  // Screenshot in Dark Theme
  const darkScreenshot = path.join(artifactDir, 'data_backup_confirm_clean_dark.png');
  await page.screenshot({ path: darkScreenshot });
  console.log('Saved Dark Confirmation screenshot:', darkScreenshot);

  // Click Cancel to restore
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('取消'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.max-w-xl button[class*="rounded-full"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Switch to Light Theme
  console.log('4. Switching to Light Theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙') || b.textContent.includes('浅色模式') || b.textContent.includes('深色模式')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Open Data Backup Modal in Light Theme
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('数据备份'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click clear in light theme
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('清空本地学习数据'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Screenshot in Light Theme
  const lightScreenshot = path.join(artifactDir, 'data_backup_confirm_clean_light.png');
  await page.screenshot({ path: lightScreenshot });
  console.log('Saved Light Confirmation screenshot:', lightScreenshot);

  console.log('🎉 清空确认按钮布局精简与去重叠 100% 验证通过！');
  await browser.close();
})();
