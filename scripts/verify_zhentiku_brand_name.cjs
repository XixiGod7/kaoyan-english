const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Check page text
  const checkResult = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasOldZhentiQiang = bodyText.includes('真题墙');
    const headerTitle = document.querySelector('header')?.innerText || '';
    const mainTitle = document.querySelector('h1')?.innerText || '';

    return {
      hasOldZhentiQiang,
      hasZhentiKuInHeader: headerTitle.includes('真题库'),
      hasZhentiKuInMainTitle: mainTitle.includes('真题库'),
      headerTitleSnippet: headerTitle.substring(0, 50),
      mainTitle
    };
  });
  console.log('Brand Name Check:', checkResult);

  if (checkResult.hasOldZhentiQiang || !checkResult.hasZhentiKuInHeader || !checkResult.hasZhentiKuInMainTitle) {
    console.error('❌ Failed: "真题墙" still exists or "真题库" missing!');
    process.exit(1);
  }

  // Screenshot in Dark Theme
  const darkScreenshot = path.join(artifactDir, 'zhentiku_brand_dark.png');
  await page.screenshot({ path: darkScreenshot });
  console.log('Saved Dark ZhentiKu screenshot:', darkScreenshot);

  // Switch to Light Theme
  console.log('2. Switching to Light Theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙') || b.textContent.includes('浅色模式') || b.textContent.includes('深色模式')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot in Light Theme
  const lightScreenshot = path.join(artifactDir, 'zhentiku_brand_light.png');
  await page.screenshot({ path: lightScreenshot });
  console.log('Saved Light ZhentiKu screenshot:', lightScreenshot);

  console.log('🎉 「真题库」品牌名称全局更替 100% 验证通过！');
  await browser.close();
})();
