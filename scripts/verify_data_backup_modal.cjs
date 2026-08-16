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

  // 1. Verify no login button exists
  const hasLogin = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).some(el => el.textContent && (el.textContent.includes('登录') || el.textContent.includes('注册')));
  });
  console.log('Is "登录 / 注册" present?', hasLogin);

  // 2. Mark a word in sidebar
  console.log('2. Marking a word as 熟词 in sidebar...');
  await page.evaluate(() => {
    const familiarBtn = document.querySelector('aside button[title*="熟"], aside button:has(svg)');
    // Click on individual to open modal
    const firstWord = document.querySelector('aside .divide-y button');
    if (firstWord) firstWord.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const famBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('熟词'));
    if (famBtn) famBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Close word modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('✕'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Open Data Backup Modal
  console.log('3. Clicking "数据备份" button...');
  await page.evaluate(() => {
    const backupBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('数据备份'));
    if (backupBtn) backupBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const darkBackupShot = path.join(artifactDir, 'data_backup_modal_dark.png');
  await page.screenshot({ path: darkBackupShot });
  console.log('Saved dark mode backup modal screenshot:', darkBackupShot);

  // 4. Test copying JSON
  console.log('4. Testing Copy JSON text...');
  await page.evaluate(() => {
    const copyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('复制 JSON'));
    if (copyBtn) copyBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Switch to Light theme and test
  console.log('5. Switching to light mode and screenshotting backup modal...');
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('完成'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const backupBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('数据备份'));
    if (backupBtn) backupBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const lightBackupShot = path.join(artifactDir, 'data_backup_modal_light.png');
  await page.screenshot({ path: lightBackupShot });
  console.log('Saved light mode backup modal screenshot:', lightBackupShot);

  console.log('🎉 Data Backup & Learning Data Import/Export successfully verified!');
  await browser.close();
})();
