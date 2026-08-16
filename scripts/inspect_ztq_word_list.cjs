const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://zhentiqiang.com/kaoyan/english1/', { waitUntil: 'networkidle2' });

  const wordStats = await page.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('#word-list-container .word-item, .word-item, [id*="word-item"]'));
    const badgeStats = Array.from(document.querySelectorAll('.stat-item, .badge, [class*="stat"]')).map(el => el.textContent?.trim());
    return {
      totalWordsRendered: listItems.length,
      sampleWords: listItems.slice(0, 15).map(el => el.textContent?.trim().replace(/\s+/g, ' ')),
      badgeStats
    };
  });

  console.log('Zhentiqiang Sidebar Word Stats:', JSON.stringify(wordStats, null, 2));

  await browser.close();
})();
