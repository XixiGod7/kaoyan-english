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

  // Check that "收起试卷" button does NOT exist
  const hasCollapseBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.some(b => b.textContent && (b.textContent.includes('收起试卷') || b.textContent.includes('展开试卷')));
  });
  console.log('Has collapse button:', hasCollapseBtn);
  if (hasCollapseBtn) {
    console.error('❌ Collapse button still exists!');
    process.exit(1);
  } else {
    console.log('✅ Collapse button successfully removed from homepage.');
  }

  const wallShot = path.join(artifactDir, 'examwall_clean_no_collapse.png');
  await page.screenshot({ path: wallShot });
  console.log('Saved clean ExamWall screenshot:', wallShot);

  // 2. Open Study Progress Modal
  console.log('2. Opening Study Progress Modal ...');
  await page.evaluate(() => {
    const progressBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('学习进度'));
    if (progressBtn) progressBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Check Year card titles in Modal
  const titles = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h4 + div, .grid-cols-1.md\\:grid-cols-2 .font-black.text-sm'));
    return headers.map(h => h.textContent?.trim() || '');
  });
  console.log('Progress modal card titles:', titles);

  const hasParenOne = titles.some(t => t.includes('(1)'));
  if (hasParenOne) {
    console.error('❌ Found (1) in progress modal card titles!');
    process.exit(1);
  } else {
    console.log('✅ All card titles cleanly formatted without (1)!');
  }

  const modalShot = path.join(artifactDir, 'progress_modal_clean_years.png');
  await page.screenshot({ path: modalShot });
  console.log('Saved clean Progress Modal screenshot:', modalShot);

  console.log('🎉 验证全部通过！');
  await browser.close();
})();
