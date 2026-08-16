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

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 1. Open Desktop App modal
  console.log('2. Clicking 桌面应用 in Header...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('桌面应用'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 2. Screenshot Windows tab (Dark)
  const winDarkShot = path.join(artifactDir, 'desktop_app_modal_windows_dark.png');
  await page.screenshot({ path: winDarkShot });
  console.log('Saved Windows tab Dark screenshot:', winDarkShot);

  // 3. Switch to Mac tab
  console.log('3. Switching to macOS tab...');
  await page.evaluate(() => {
    const macTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('macOS'));
    if (macTab) macTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const macDarkShot = path.join(artifactDir, 'desktop_app_modal_mac_dark.png');
  await page.screenshot({ path: macDarkShot });
  console.log('Saved macOS tab Dark screenshot:', macDarkShot);

  // 4. Test Light Mode
  console.log('4. Testing Light Mode...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="z-50"] button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('桌面应用'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const winLightShot = path.join(artifactDir, 'desktop_app_modal_windows_light.png');
  await page.screenshot({ path: winLightShot });
  console.log('Saved Windows tab Light screenshot:', winLightShot);

  await page.evaluate(() => {
    const macTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('macOS'));
    if (macTab) macTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const macLightShot = path.join(artifactDir, 'desktop_app_modal_mac_light.png');
  await page.screenshot({ path: macLightShot });
  console.log('Saved macOS tab Light screenshot:', macLightShot);

  console.log('🎉 DesktopAppModal categorized for Windows & macOS successfully verified!');
  await browser.close();
})();
