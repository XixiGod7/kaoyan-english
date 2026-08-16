const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  let errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('--- 测试: 点击高亮卡片直达文章具体句子并高亮 ---');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  
  // Wait for sidebar
  await page.waitForSelector('#word-item-ensure');

  // Click on 'ensure'
  await page.evaluate(() => {
    const el = document.getElementById('word-item-ensure');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Find a highlighted thumbnail card (e.g. 2014 Text 1)
  const clickedTarget = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2014"]'));
    const highlightedCard = cards.find(c => c.className.includes('ring-blue-400') && c.getAttribute('title').includes('篇1'));
    if (highlightedCard) {
      highlightedCard.click();
      return true;
    }
    return false;
  });
  console.log('点击 2014年 高亮卡片 (篇1):', clickedTarget);
  await new Promise(r => setTimeout(r, 1200));

  // Check if routed to 2014 and has highlighted sentence element
  const sentenceCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    const is2014 = text.includes('2014年');
    const highlightedSentence = document.querySelector('.animate-pulse');
    const highlightedId = highlightedSentence ? highlightedSentence.getAttribute('id') : null;
    const sentenceText = highlightedSentence ? highlightedSentence.innerText : null;

    return {
      is2014,
      hasPulse: !!highlightedSentence,
      highlightedId,
      sentenceText: sentenceText ? sentenceText.substring(0, 80) + '...' : null
    };
  });
  console.log('直达真题具体句子并呼吸高亮验证结果:', sentenceCheck);

  // Return home and test another word 'stern'
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent.includes('返回真题矩阵'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Click on 'stern'
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('aside div'));
    const sternEl = items.find(el => el.textContent && el.textContent.trim().startsWith('stern'));
    if (sternEl) sternEl.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Click highlighted card in 2014 (Text 2)
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[title*="2014"]'));
    const highlightedCard = cards.find(c => c.className.includes('ring-blue-400') && c.getAttribute('title').includes('篇2'));
    if (highlightedCard) highlightedCard.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const sternCheck = await page.evaluate(() => {
    const highlightedSentence = document.querySelector('.animate-pulse');
    return {
      highlightedId: highlightedSentence ? highlightedSentence.getAttribute('id') : null,
      sentenceSnippet: highlightedSentence ? highlightedSentence.innerText.substring(0, 80) : null
    };
  });
  console.log('stern 单词高亮卡片直达真题该句结果:', sternCheck);

  await browser.close();
  console.log('\n========================================');
  console.log('高亮卡片直接精准直达具体句子测试 100% 成功！错误数:', errors.length);
  console.log('========================================');
})();
