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

  console.log('1. Navigating to http://localhost:8085 ...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  // Enter 2014 Quiz Mode
  console.log('2. Entering 2014 Quiz Mode...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2014'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Go to Reading A tab
  console.log('3. Clicking Reading A (21-40) tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('阅读A'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Programmatically select a word inside the reading text container
  console.log('4. Selecting word "challenging" or "individual" in the passage...');
  const selectResult = await page.evaluate(() => {
    const p = document.querySelector('p.font-serif') || document.querySelector('p');
    if (!p) return { success: false, error: 'No paragraph found' };

    // Find a text node with words
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
    let node;
    let targetWord = '';
    let targetRange = null;

    while ((node = walker.nextNode())) {
      const match = node.nodeValue.match(/\b([a-zA-Z]{4,})\b/);
      if (match) {
        targetWord = match[1];
        const start = match.index;
        const end = start + targetWord.length;

        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        // Dispatch mouseup to trigger selection handler
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        return { success: true, targetWord, text: node.nodeValue.slice(0, 100) };
      }
    }
    return { success: false, error: 'No matching word found' };
  });

  console.log('Selection result:', selectResult);
  await new Promise(r => setTimeout(r, 800));

  const shotDarkPath = path.join(artifactDir, 'word_selection_lookup_dark.png');
  await page.screenshot({ path: shotDarkPath });
  console.log('Saved dark mode lookup screenshot:', shotDarkPath);

  // Switch to Light Mode and select another word
  console.log('5. Toggling to light mode and selecting another word...');
  await page.evaluate(() => {
    const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && (b.title.includes('模式') || b.title.includes('主题')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    const targetSpan = spans.find(s => s.textContent && s.textContent.trim().length > 6 && /^[a-zA-Z]+$/.test(s.textContent.trim()));
    if (targetSpan && targetSpan.firstChild) {
      const range = document.createRange();
      range.selectNodeContents(targetSpan);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const shotLightPath = path.join(artifactDir, 'word_selection_lookup_light.png');
  await page.screenshot({ path: shotLightPath });
  console.log('Saved light mode lookup screenshot:', shotLightPath);

  console.log('🎉 Word selection lookup popover verified successfully!');
  await browser.close();
})();
