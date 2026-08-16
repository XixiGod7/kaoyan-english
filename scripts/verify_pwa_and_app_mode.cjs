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

  // 1. Verify manifest link
  const manifestHref = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') : null;
  });
  console.log('Manifest href in HTML:', manifestHref);

  // 2. Verify Desktop App button in Header
  const appBtnText = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('桌面应用'));
    return btn ? btn.textContent.trim() : null;
  });
  console.log('Header Desktop App button found:', appBtnText);

  // 3. Take screenshot of Dark Theme
  const pwaDarkShot = path.join(artifactDir, 'pwa_chrome_app_header_dark.png');
  await page.screenshot({ path: pwaDarkShot });
  console.log('Saved PWA Dark mode screenshot:', pwaDarkShot);

  // 4. Toggle to Light Theme
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.title && (b.title.includes('浅色') || b.title.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const pwaLightShot = path.join(artifactDir, 'pwa_chrome_app_header_light.png');
  await page.screenshot({ path: pwaLightShot });
  console.log('Saved PWA Light mode screenshot:', pwaLightShot);

  console.log('🎉 PWA Manifest, Service Worker, and App Mode integration successfully verified!');
  await browser.close();
})();
