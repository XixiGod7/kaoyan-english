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

  // Find 2014 thumb 9 (201401009)
  console.log('2. Clicking 201401009 thumb...');
  const clicked = await page.evaluate(() => {
    const el = document.querySelector('[data-task-id="201401009"]') || 
               document.querySelector('img[src*="201401009"]');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Clicked 201401009:', clicked);
  await new Promise(r => setTimeout(r, 2500));

  const modalShot = path.join(artifactDir, 'ztq_201401009_modal.png');
  await page.screenshot({ path: modalShot });
  console.log('Saved screenshot:', modalShot);

  // Inspect the active modal or popup DOM
  const modalDom = await page.evaluate(() => {
    const visibleModals = Array.from(document.querySelectorAll('.modal, .modal-dialog, [role="dialog"], .popup, .overlay, .question-detail, .reading-modal')).filter(e => {
      const style = window.getComputedStyle(e);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    const activeImgs = Array.from(document.querySelectorAll('img')).filter(img => {
      return img.src.includes('2014') || img.naturalWidth > 100;
    }).map(i => ({
      src: i.src,
      width: i.width,
      naturalWidth: i.naturalWidth,
      height: i.height,
      naturalHeight: i.naturalHeight,
      className: i.className,
      style: i.getAttribute('style'),
      outerHtml: i.outerHTML
    }));

    return {
      visibleModals: visibleModals.map(m => ({ class: m.className, innerHtml: m.innerHTML.slice(0, 1500) })),
      activeImgs
    };
  });

  console.log('Modal DOM info:', JSON.stringify(modalDom, null, 2));

  await browser.close();
})();
