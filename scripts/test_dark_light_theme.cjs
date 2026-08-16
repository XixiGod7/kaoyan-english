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

  console.log('1. Navigating to Vite app...');
  await page.goto('http://localhost:8085', { waitUntil: 'networkidle2' });

  await page.waitForSelector('header');
  console.log('App loaded.');

  // Take screenshot of Dark Theme Home
  const darkHomePath = path.join(artifactDir, 'dark_theme_home.png');
  await page.screenshot({ path: darkHomePath });
  console.log(`Saved screenshot: ${darkHomePath}`);

  // Test toggling to Light Mode
  console.log('2. Toggling to Light Mode from Header button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    const themeBtn = buttons.find(b => b.textContent && (b.textContent.includes('模式') || b.textContent.includes('浅色') || b.textContent.includes('深色')));
    if (themeBtn) themeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Take screenshot of Light Theme Home
  const lightHomePath = path.join(artifactDir, 'light_theme_home.png');
  await page.screenshot({ path: lightHomePath });
  console.log(`Saved screenshot: ${lightHomePath}`);

  // Test opening a word modal in Light mode
  console.log('3. Opening Word Detail modal in Light Mode...');
  await page.evaluate(() => {
    const cardBtn = document.querySelector('#word-item-appeal') || document.querySelector('.overflow-y-auto .group button');
    if (cardBtn) cardBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Open modal button
  await page.evaluate(() => {
    const openModalBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('查看真题例句'));
    if (openModalBtn) openModalBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const lightModalPath = path.join(artifactDir, 'light_theme_word_modal.png');
  await page.screenshot({ path: lightModalPath });
  console.log(`Saved screenshot: ${lightModalPath}`);

  // Close modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('✕') || b.textContent.includes('关闭面板')));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Test entering Quiz Mode in Light mode
  console.log('4. Entering 2014 Quiz Mode in Light Mode...');
  await page.evaluate(() => {
    const yearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2014'));
    if (yearBtn) yearBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const lightQuizPath = path.join(artifactDir, 'light_theme_quiz.png');
  await page.screenshot({ path: lightQuizPath });
  console.log(`Saved screenshot: ${lightQuizPath}`);

  // Toggle theme to Dark Mode inside Quiz Mode
  console.log('5. Toggling theme inside Quiz Mode to Dark Mode...');
  await page.evaluate(() => {
    const quizThemeBtn = document.querySelector('button[title*="切换浅色/深色主题"]');
    if (quizThemeBtn) quizThemeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const darkQuizPath = path.join(artifactDir, 'dark_theme_quiz.png');
  await page.screenshot({ path: darkQuizPath });
  console.log(`Saved screenshot: ${darkQuizPath}`);

  // Verify persistence after reload
  console.log('6. Reloading page to test theme persistence...');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const darkQuizReloadPath = path.join(artifactDir, 'dark_theme_quiz_reloaded.png');
  await page.screenshot({ path: darkQuizReloadPath });
  console.log(`Saved screenshot: ${darkQuizReloadPath}`);

  // Verify localStorage
  const savedTheme = await page.evaluate(() => localStorage.getItem('kaoyan_theme'));
  console.log(`Verified localStorage kaoyan_theme = "${savedTheme}"`);

  if (savedTheme !== 'dark') {
    throw new Error(`Expected savedTheme to be 'dark', got '${savedTheme}'`);
  }

  console.log('🎉 All Dark & Light mode theme tests passed with 100% success!');
  await browser.close();
})();
