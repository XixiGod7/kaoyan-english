const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

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
  try {
    await page.goto('https://zhentiqiang.com/kaoyan/english1/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Loaded home page');
  } catch (e) {
    console.log('Goto error (will try screenshot anyway):', e.message);
  }

  // Inspect page content
  const info = await page.evaluate(() => {
    return {
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button, a')).map(b => ({ text: b.textContent?.trim(), href: b.getAttribute('href') })),
      images: Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt, className: i.className }))
    };
  });
  console.log('Page Title:', info.title);
  console.log('Sample images:', info.images.slice(0, 10));

  // Try finding 2014 writing
  const clicked2014 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.includes('2014') && (e.tagName === 'BUTTON' || e.tagName === 'A' || e.onclick || e.classList.contains('year')));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Clicked 2014:', clicked2014);
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot current state
  const ztqScreenshot = path.join(artifactDir, 'ztq_site_state.png');
  await page.screenshot({ path: ztqScreenshot });
  console.log('Saved screenshot:', ztqScreenshot);

  // Look for writing tab / section
  const writingInfo = await page.evaluate(() => {
    // find writing buttons
    const btns = Array.from(document.querySelectorAll('*')).filter(e => e.textContent && (e.textContent.includes('小作文') || e.textContent.includes('大作文') || e.textContent.includes('Part A') || e.textContent.includes('Part B') || e.textContent.includes('Section III')));
    return btns.map(b => ({ tag: b.tagName, text: b.textContent?.trim(), class: b.className }));
  });
  console.log('Writing elements found:', writingInfo);

  // Click on 大作文 or Part B
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('*')).find(e => e.textContent && (e.textContent.trim() === '大作文' || e.textContent.includes('大作文')));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const ztqWritingShot = path.join(artifactDir, 'ztq_writing_state.png');
  await page.screenshot({ path: ztqWritingShot });
  console.log('Saved writing screenshot:', ztqWritingShot);

  // Extract all images on the page now
  const writingPageDetails = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).map(i => ({
      src: i.src,
      alt: i.alt,
      width: i.width,
      naturalWidth: i.naturalWidth,
      height: i.height,
      naturalHeight: i.naturalHeight,
      style: i.getAttribute('style'),
      class: i.className,
      parentHtml: i.parentElement ? i.parentElement.outerHTML.slice(0, 300) : ''
    }));
    const html = document.body.innerHTML;
    return { imgs, htmlSample: html.slice(0, 2000) };
  });

  console.log('Writing page images:', JSON.stringify(writingPageDetails.imgs, null, 2));

  await browser.close();
})();
