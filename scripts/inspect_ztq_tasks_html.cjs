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

  console.log('1. Navigating to https://zhentiqiang.com/kaoyan/english1/static/tasks.html?exam=2014(1)&exam_type=kaoyan ...');
  await page.goto('https://zhentiqiang.com/kaoyan/english1/static/tasks.html?exam=2014(1)&exam_type=kaoyan', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 2000));

  const pageInfo = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img')).map(i => ({
      src: i.src,
      width: i.width,
      naturalWidth: i.naturalWidth,
      height: i.height,
      naturalHeight: i.naturalHeight,
      className: i.className,
      style: i.getAttribute('style'),
      outerHtml: i.outerHTML.slice(0, 300)
    }));

    const writingElements = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.textContent && (el.textContent.includes('Part A') || el.textContent.includes('Part B') || el.textContent.includes('小作文') || el.textContent.includes('大作文'));
    }).map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      html: el.outerHTML.slice(0, 400)
    }));

    return {
      title: document.title,
      images,
      writingElements: writingElements.slice(0, 10),
      bodyHtml: document.body.innerHTML.slice(0, 3000)
    };
  });

  console.log('Page Info Images:', JSON.stringify(pageInfo.images, null, 2));
  console.log('Writing Elements:', JSON.stringify(pageInfo.writingElements, null, 2));

  // Scroll to writing section
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Section III'));
    if (target) target.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  const shotPath = path.join(artifactDir, 'ztq_tasks_html_writing.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved screenshot:', shotPath);

  // Save the full HTML of tasks.html for examination
  const fullHtml = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(__dirname, 'ztq_tasks_2014.html'), fullHtml, 'utf8');
  console.log('Saved ztq_tasks_2014.html');

  await browser.close();
})();
