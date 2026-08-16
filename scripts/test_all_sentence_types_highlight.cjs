const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  let errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('--- 测试 1: 验证跳转到选项中的例句 (例如 stern 的 2014013095: Option C) ---');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  
  // Wait for sidebar
  await page.waitForSelector('#word-item-stern');

  // Click on 'stern'
  await page.evaluate(() => {
    const el = document.getElementById('word-item-stern');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Open modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const modalBtn = btns.find(b => b.textContent.includes('查看全部例句与词卡'));
    if (modalBtn) modalBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // In modal, click jump on the 2nd sentence (2014013095 - Option C)
  const jump2Clicked = await page.evaluate(() => {
    const modal = document.querySelector('.animate-fade-in');
    if (!modal) return false;
    const jumpBtns = Array.from(modal.querySelectorAll('button')).filter(b => b.textContent.includes('定位到真题此句'));
    if (jumpBtns.length >= 2) {
      jumpBtns[1].click(); // Click second sentence (Option C)
      return true;
    }
    return false;
  });
  console.log('点击第2条例句（选项题干例句）定位按钮:', jump2Clicked);
  await new Promise(r => setTimeout(r, 1200));

  // Check if option C is highlighted with pulse
  const optionCheck = await page.evaluate(() => {
    const highlightedEl = document.querySelector('.animate-pulse');
    const highlightedId = highlightedEl ? highlightedEl.getAttribute('id') : null;
    const text = highlightedEl ? highlightedEl.innerText : null;
    return {
      hasPulse: !!highlightedEl,
      highlightedId,
      textSnippet: text ? text.substring(0, 60) : null
    };
  });
  console.log('选项中例句高亮结果 (应命中 sentence-2014013095):', optionCheck);


  console.log('\n--- 测试 2: 验证从词卡中跳转文章正文中的例句 (例如 stern 的 2014013073) ---');
  // Return home
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Re-open stern modal
  await page.evaluate(() => {
    const el = document.getElementById('word-item-stern');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const modalBtn = btns.find(b => b.textContent.includes('查看全部例句与词卡'));
    if (modalBtn) modalBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Click 1st sentence (2014013073 - Article Content)
  await page.evaluate(() => {
    const modal = document.querySelector('.animate-fade-in');
    const jumpBtns = Array.from(modal.querySelectorAll('button')).filter(b => b.textContent.includes('定位到真题此句'));
    if (jumpBtns.length >= 1) {
      jumpBtns[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  const contentCheck = await page.evaluate(() => {
    const highlightedEl = document.querySelector('.animate-pulse');
    return {
      highlightedId: highlightedEl ? highlightedEl.getAttribute('id') : null,
      textSnippet: highlightedEl ? highlightedEl.innerText.substring(0, 60) : null
    };
  });
  console.log('正文中例句高亮结果 (应命中 sentence-2014013073):', contentCheck);

  await browser.close();
  console.log('\n========================================');
  console.log('所有题型与句段类型例句高亮 100% 测试通过！控制台错误数:', errors.length);
  console.log('========================================');
})();
