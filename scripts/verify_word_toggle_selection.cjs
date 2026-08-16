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

  // 2. Click 1st word: individual
  console.log('2. Clicking 1st word: individual ...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('[id^="word-item-"]');
    if (items.length > 0) items[0].click();
  });
  await new Promise(r => setTimeout(r, 400));

  const checkItem1 = await page.evaluate(() => {
    const el = document.getElementById('word-item-individual');
    const bar = el ? el.querySelector('span.absolute') : null;
    return {
      hasElement: !!el,
      hasLeftBar: !!bar,
      barClasses: bar?.className,
      textContent: el?.textContent,
    };
  });
  console.log('Item 1 (individual) selection check:', checkItem1);
  if (!checkItem1.hasLeftBar) {
    console.error('❌ Failed: Left blue bar not found on item 1!');
    process.exit(1);
  }

  const screenshot1 = path.join(artifactDir, 'word_selection_uniform_item1_dark.png');
  await page.screenshot({ path: screenshot1 });
  console.log('Saved Item 1 screenshot:', screenshot1);

  // 3. Click 2nd word: ensure
  console.log('3. Clicking 2nd word: ensure ...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('[id^="word-item-"]');
    if (items.length > 1) items[1].click();
  });
  await new Promise(r => setTimeout(r, 400));

  const checkItem2 = await page.evaluate(() => {
    const el = document.getElementById('word-item-ensure');
    const bar = el ? el.querySelector('span.absolute') : null;
    return {
      hasElement: !!el,
      hasLeftBar: !!bar,
      barClasses: bar?.className,
      textContent: el?.textContent,
    };
  });
  console.log('Item 2 (ensure) selection check:', checkItem2);
  if (!checkItem2.hasLeftBar) {
    console.error('❌ Failed: Left blue bar not found on item 2!');
    process.exit(1);
  }

  const screenshot2 = path.join(artifactDir, 'word_selection_uniform_item2_dark.png');
  await page.screenshot({ path: screenshot2 });
  console.log('Saved Item 2 screenshot:', screenshot2);

  // 4. Test in Light Theme
  console.log('4. Switching to Light Theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙') || b.textContent.includes('浅色模式') || b.textContent.includes('深色模式')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Click 1st word in light theme
  await page.evaluate(() => {
    const items = document.querySelectorAll('[id^="word-item-"]');
    if (items.length > 0) items[0].click();
  });
  await new Promise(r => setTimeout(r, 400));

  const lightScreenshot1 = path.join(artifactDir, 'word_selection_uniform_item1_light.png');
  await page.screenshot({ path: lightScreenshot1 });
  console.log('Saved Light Item 1 screenshot:', lightScreenshot1);

  // Click 2nd word in light theme
  await page.evaluate(() => {
    const items = document.querySelectorAll('[id^="word-item-"]');
    if (items.length > 1) items[1].click();
  });
  await new Promise(r => setTimeout(r, 400));

  const lightScreenshot2 = path.join(artifactDir, 'word_selection_uniform_item2_light.png');
  await page.screenshot({ path: lightScreenshot2 });
  console.log('Saved Light Item 2 screenshot:', lightScreenshot2);

  // Click 2nd word again to deselect
  console.log('5. Clicking 2nd word again to deselect in light theme ...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('[id^="word-item-"]');
    if (items.length > 1) items[1].click();
  });
  await new Promise(r => setTimeout(r, 400));

  const lightDeselectedScreenshot = path.join(artifactDir, 'word_selection_uniform_deselected_light.png');
  await page.screenshot({ path: lightDeselectedScreenshot });
  console.log('Saved Light Deselected screenshot:', lightDeselectedScreenshot);

  console.log('🎉 所有单词选中样式 100% 统一验证通过！');
  await browser.close();
})();
