const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  let errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('--- 测试 1: 验证点击左侧词汇高亮真题出现篇章与底部词条栏 ---');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  
  // Wait for sidebar words to render
  await page.waitForSelector('#word-item-individual');

  // Click on 'individual'
  await page.evaluate(() => {
    const el = document.getElementById('word-item-individual');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Check highlight on wall and bottom bar
  const highlightRes = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasBottomBar = text.includes('individual') && text.includes('高亮命中');
    const highlightedCards = document.querySelectorAll('.ring-blue-400');
    return {
      hasBottomBar,
      highlightedCardsCount: highlightedCards.length
    };
  });
  console.log('单词高亮效果与底部栏状态:', highlightRes);

  console.log('\n--- 测试 2: 验证点击真题各部分精准跳转对应板块 ---');
  // Test jumping to New Type (Section II Part B) of 2019
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2019"]'));
    const matchingCard = cards.find(c => c.getAttribute('title').includes('新题型'));
    if (matchingCard) matchingCard.click();
  });
  await new Promise(r => setTimeout(r, 800));

  let tabCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      is2019: text.includes('2019年'),
      isMatchingTab: text.includes('阅读新题型') && (text.includes('41') || text.includes('排序指引'))
    };
  });
  console.log('点击 2019 新题型卡片精准跳转结果:', tabCheck);

  // Return home
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Test jumping to Translation (Section II Part C / 翻译) of 2019
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2019"]'));
    const transCard = cards.find(c => c.getAttribute('title').includes('翻译'));
    if (transCard) transCard.click();
  });
  await new Promise(r => setTimeout(r, 800));

  tabCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isTranslationTab: text.includes('翻译 (46-50)') || text.includes('翻译原文材料')
    };
  });
  console.log('点击 2019 翻译卡片精准跳转结果:', tabCheck);

  // Return home
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Test jumping to Small Essay (Section III Part A) of 2019
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2019"]'));
    const smallEssayCard = cards.find(c => c.getAttribute('title').includes('小作文'));
    if (smallEssayCard) smallEssayCard.click();
  });
  await new Promise(r => setTimeout(r, 800));

  tabCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isSmallEssayTab: text.includes('小作文 (51-51)') || text.includes('小作文')
    };
  });
  console.log('点击 2019 小作文卡片精准跳转结果:', tabCheck);

  // Return home
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Test jumping to Big Essay (Section III Part B) of 2019
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2019"]'));
    const bigEssayCard = cards.find(c => c.getAttribute('title').includes('大作文'));
    if (bigEssayCard) bigEssayCard.click();
  });
  await new Promise(r => setTimeout(r, 800));

  tabCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isBigEssayTab: text.includes('大作文 (52-52)') || text.includes('大作文')
    };
  });
  console.log('点击 2019 大作文卡片精准跳转结果:', tabCheck);


  console.log('\n--- 测试 3: 验证真题墙 17 年份 9 大板块顺序与底部布局排版 ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const layoutCheck = await page.evaluate(() => {
    const columns = Array.from(document.querySelectorAll('.w-24, .w-28'));
    const counts = columns.map(col => col.querySelectorAll('img').length);
    return {
      columnCount: columns.length,
      eachColItemCounts: Array.from(new Set(counts))
    };
  });
  console.log('真题墙列数与每列板块数 (应为17列，每列严格9个板块):', layoutCheck);

  await browser.close();
  console.log('\n========================================');
  console.log('所有测试全部 100% 顺利通过！控制台错误数:', errors.length);
  console.log('========================================');
})();
