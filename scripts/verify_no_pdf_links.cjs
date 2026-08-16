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

  // 3. Submit quiz to enter submitted state
  console.log('3. Submitting quiz ...');
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('提交答案'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 4. Verify no PDF links in Navbar or Result Modal
  const pdfCheck = await page.evaluate(() => {
    const pdfLinks = Array.from(document.querySelectorAll('a')).filter(a => (a.href && a.href.includes('.pdf')) || (a.textContent && a.textContent.includes('PDF')));
    const pdfButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('PDF'));
    return {
      pdfLinkCount: pdfLinks.length,
      pdfButtonCount: pdfButtons.length,
    };
  });
  console.log('PDF presence check:', pdfCheck);

  if (pdfCheck.pdfLinkCount > 0 || pdfCheck.pdfButtonCount > 0) {
    console.error(`❌ Failed: Found ${pdfCheck.pdfLinkCount} PDF links and ${pdfCheck.pdfButtonCount} PDF buttons!`);
    process.exit(1);
  }

  // 5. Screenshot result modal without PDF button
  const modalScreenshot = path.join(artifactDir, 'result_modal_no_pdf.png');
  await page.screenshot({ path: modalScreenshot });
  console.log('Saved Result Modal without PDF screenshot:', modalScreenshot);

  // Close Result Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.bg-gradient-to-r button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 6. Screenshot submitted navbar without PDF button
  const navbarScreenshot = path.join(artifactDir, 'quiz_submitted_navbar_no_pdf.png');
  await page.screenshot({ path: navbarScreenshot });
  console.log('Saved Submitted Navbar without PDF screenshot:', navbarScreenshot);

  console.log('🎉 访问 PDF 功能关闭验证 100% 通过！');
  await browser.close();
})();
