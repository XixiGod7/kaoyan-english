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

  console.log('1. Navigating to https://zhentiqiang.com/kaoyan/english1/ ...');
  await page.goto('https://zhentiqiang.com/kaoyan/english1/', { waitUntil: 'networkidle2' });

  // Get all event listeners or click action on question items
  const clickResult = await page.evaluate(() => {
    const item = document.querySelector('[data-task-id="201401009"]');
    if (!item) return '201401009 not found';
    
    // Simulate click
    item.click();
    return 'clicked item: ' + item.outerHTML.slice(0, 200);
  });
  console.log('Click result:', clickResult);

  await new Promise(r => setTimeout(r, 2000));

  const afterClickShot = path.join(artifactDir, 'ztq_after_thumb_click.png');
  await page.screenshot({ path: afterClickShot });
  console.log('Saved afterClickShot:', afterClickShot);

  // Check what changed on page
  const pageDom = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      return (s.position === 'fixed' || s.position === 'absolute') && s.zIndex > 10 && s.display !== 'none';
    });
    return dialogs.map(d => ({
      tag: d.tagName,
      id: d.id,
      class: d.className,
      style: d.getAttribute('style'),
      html: d.outerHTML.slice(0, 300)
    }));
  });
  console.log('Dialogs/Popups found:', JSON.stringify(pageDom, null, 2));

  await browser.close();
})();
