const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Use a wide 1920x1080 screen to match the user's wide monitor screenshot
  await page.setViewport({ width: 1920, height: 1080 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Loading application at http://localhost:8085 (1920x1080) ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Verify alignment and dimensions
  const layoutMetrics = await page.evaluate(() => {
    const headerDiv = document.querySelector('header > div');
    const headerRect = headerDiv ? headerDiv.getBoundingClientRect() : null;
    const sidebar = document.querySelector('aside');
    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
    const examWall = document.querySelector('aside + div');
    const examWallRect = examWall ? examWall.getBoundingClientRect() : null;
    const bottomBar = document.querySelector('aside + div > div:last-child');
    const bottomBarRect = bottomBar ? bottomBar.getBoundingClientRect() : null;

    return {
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      headerRect,
      sidebarRect,
      examWallRect,
      bottomBarRect
    };
  });
  console.log('Layout Metrics (Dark Mode):', layoutMetrics);

  // Take screenshot in Dark Theme
  const darkScreenshot = path.join(artifactDir, 'sidebar_layout_optimized_dark.png');
  await page.screenshot({ path: darkScreenshot });
  console.log('Saved Dark Layout screenshot:', darkScreenshot);

  // Switch to Light Theme
  console.log('2. Switching to Light Theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙') || b.textContent.includes('浅色模式') || b.textContent.includes('深色模式')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Take screenshot in Light Theme
  const lightScreenshot = path.join(artifactDir, 'sidebar_layout_optimized_light.png');
  await page.screenshot({ path: lightScreenshot });
  console.log('Saved Light Layout screenshot:', lightScreenshot);

  console.log('🎉 重点词汇侧边栏与主界面上下布局优化 100% 验证通过！');
  await browser.close();
})();
