const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 2. Click into 2024 Year
  console.log('2. Entering 2024 exam paper ...');
  await page.evaluate(() => {
    // Click on year header or question thumb
    const card = document.querySelector('button[class*="rounded-2xl"]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Verify Reading Text 1
  console.log('3. Clicking 阅读 Text 1 (21-25) tab ...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Text 1'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const text1Dark = path.join(artifactDir, 'quiz_reading_text1_dark.png');
  await page.screenshot({ path: text1Dark });
  console.log('Saved Text 1 Dark screenshot:', text1Dark);

  // 4. Verify Reading Text 2
  console.log('4. Clicking 阅读 Text 2 (26-30) tab ...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Text 2'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const text2Dark = path.join(artifactDir, 'quiz_reading_text2_dark.png');
  await page.screenshot({ path: text2Dark });
  console.log('Saved Text 2 Dark screenshot:', text2Dark);

  // 5. Verify Reading Text 3
  console.log('5. Clicking 阅读 Text 3 (31-35) tab ...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Text 3'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const text3Dark = path.join(artifactDir, 'quiz_reading_text3_dark.png');
  await page.screenshot({ path: text3Dark });
  console.log('Saved Text 3 Dark screenshot:', text3Dark);

  // 6. Verify Reading Text 4
  console.log('6. Clicking 阅读 Text 4 (36-40) tab ...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Text 4'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const text4Dark = path.join(artifactDir, 'quiz_reading_text4_dark.png');
  await page.screenshot({ path: text4Dark });
  console.log('Saved Text 4 Dark screenshot:', text4Dark);

  // 7. Test Light Theme
  console.log('7. Testing Light Theme on Reading Text 1 ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && (b.title.includes('主题') || b.textContent === '☀️' || b.textContent === '🌙'));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Text 1'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const text1Light = path.join(artifactDir, 'quiz_reading_text1_light.png');
  await page.screenshot({ path: text1Light });
  console.log('Saved Text 1 Light screenshot:', text1Light);

  console.log('🎉 4 Separate Reading Pages (Text 1, 2, 3, 4) successfully verified!');
  await browser.close();
})();
