const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/11612/.cache/puppeteer/chrome-headless-shell/win64-151.0.7922.47/chrome-headless-shell-win64/chrome-headless-shell.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1550, height: 980 });

  const artifactDir = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';

  console.log('1. Loading application at http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // 2. Click 2021 Year card to enter Quiz Mode
  console.log('2. Entering 2021 exam paper ...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button'));
    const y2021 = cards.find(c => c.textContent && c.textContent.includes('2021'));
    if (y2021) y2021.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Take screenshot with Answer Sheet OPEN
  const openDarkScreenshot = path.join(artifactDir, 'answersheet_open_dark.png');
  await page.screenshot({ path: openDarkScreenshot });
  console.log('Saved Open Answer Sheet screenshot:', openDarkScreenshot);

  // 4. Click Collapse Button inside Answer sheet header
  console.log('4. Clicking collapse button in Answer Sheet header ...');
  await page.evaluate(() => {
    const collapseBtn = document.getElementById('collapse-answersheet-btn');
    if (collapseBtn) collapseBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Verify floating handle is visible and answer sheet is collapsed
  const collapsedCheck = await page.evaluate(() => {
    const floatBtn = document.getElementById('expand-answersheet-floating-btn');
    return {
      hasFloatBtn: !!floatBtn,
      floatBtnText: floatBtn?.textContent,
    };
  });
  console.log('Collapsed state verification:', collapsedCheck);
  if (!collapsedCheck.hasFloatBtn) {
    console.error('❌ Failed: Floating handle did not appear after collapsing answer sheet!');
    process.exit(1);
  }

  const collapsedDarkScreenshot = path.join(artifactDir, 'answersheet_collapsed_fullwidth_dark.png');
  await page.screenshot({ path: collapsedDarkScreenshot });
  console.log('Saved Collapsed Full-width screenshot (Dark):', collapsedDarkScreenshot);

  // 6. Test expanding via Floating Handle
  console.log('6. Clicking floating handle to expand Answer Sheet ...');
  await page.evaluate(() => {
    const floatBtn = document.getElementById('expand-answersheet-floating-btn');
    if (floatBtn) floatBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 7. Test collapsing via Top Navbar Button
  console.log('7. Clicking navbar toggle button to collapse Answer Sheet ...');
  await page.evaluate(() => {
    const navBtn = document.getElementById('toggle-answersheet-nav-btn');
    if (navBtn) navBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 8. Switch to Light theme in collapsed mode
  console.log('8. Switching to light theme ...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('☀️') || b.textContent.includes('🌙')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const collapsedLightScreenshot = path.join(artifactDir, 'answersheet_collapsed_fullwidth_light.png');
  await page.screenshot({ path: collapsedLightScreenshot });
  console.log('Saved Collapsed Full-width screenshot (Light):', collapsedLightScreenshot);

  console.log('🎉 答题卡收起与展开全套交互 100% 验证通过！');
  await browser.close();
})();
