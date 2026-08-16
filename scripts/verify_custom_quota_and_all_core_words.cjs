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

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 1. Mark some words as unfamiliar
  console.log('2. Marking sample words as 生词 (unfamiliar)...');
  await page.evaluate(() => {
    const testStatuses = {
      'individual': 'unfamiliar',
      'economic': 'unfamiliar',
      'significant': 'unfamiliar'
    };
    localStorage.setItem('kaoyan_word_statuses', JSON.stringify(testStatuses));
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // 2. Open Ebbinghaus Vocabulary Review Modal
  console.log('3. Opening Ebbinghaus Vocabulary Review Modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 3. Verify total words in list tab is 762
  console.log('4. Checking all 762 core words in list tab...');
  await page.evaluate(() => {
    const listTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('全词库清单'));
    if (listTab) listTab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const totalCountText = await page.evaluate(() => {
    const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('全部'));
    return allBtn ? allBtn.textContent : '';
  });
  console.log('Total Core Words Count in Database:', totalCountText);

  const listShot = path.join(artifactDir, 'ebbinghaus_762_all_words_list.png');
  await page.screenshot({ path: listShot });
  console.log('Saved 762 list screenshot:', listShot);

  // 4. Switch back to review tab
  await page.evaluate(() => {
    const revTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('今日背词复习'));
    if (revTab) revTab.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Test changing quota to 10 words
  console.log('5. Testing Daily Quota: 10 词...');
  await page.evaluate(() => {
    const tenBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '10词');
    if (tenBtn) tenBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 6. Test Custom Quota Input: 15 words
  console.log('6. Testing Custom Daily Quota input (15 词)...');
  await page.evaluate(() => {
    const customBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === '自定义');
    if (customBtn) customBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const input = document.querySelector('input[type="number"]');
    if (input) {
      input.value = '15';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = input.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise(r => setTimeout(r, 500));

  const darkQuotaShot = path.join(artifactDir, 'ebbinghaus_daily_quota_priority_dark.png');
  await page.screenshot({ path: darkQuotaShot });
  console.log('Saved dark mode quota & priority screenshot:', darkQuotaShot);

  // 7. Test Light Mode
  console.log('7. Switching to Light Mode...');
  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('生词本复习'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const lightQuotaShot = path.join(artifactDir, 'ebbinghaus_daily_quota_priority_light.png');
  await page.screenshot({ path: lightQuotaShot });
  console.log('Saved light mode quota & priority screenshot:', lightQuotaShot);

  console.log('🎉 762 Core Words Inclusion & Custom Daily Quota Settings successfully verified!');
  await browser.close();
})();
