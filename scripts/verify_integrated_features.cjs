const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\11612\\.gemini\\antigravity\\brain\\61b30e2f-0098-4fe6-bfb6-a6e37264e01b';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runE2E() {
  console.log('=== Starting Puppeteer E2E Verification ===');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Open the local dev / preview server (port 5173 or 4173)
  const appUrl = 'http://localhost:5173';
  console.log('Navigating to:', appUrl);
  await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Screenshot: Intensive Reading View (Default Landing)
  console.log('1. Capturing Intensive Reading View...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_intensive_reading.png'),
    fullPage: false
  });

  // Test toggling self-test mode
  const selfTestBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('自测模式'));
  });
  if (selfTestBtn) {
    await selfTestBtn.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_self_test_mode.png'),
      fullPage: false
    });
    // Toggle back
    await selfTestBtn.click();
    await new Promise(r => setTimeout(r, 300));
  }

  // 2. Screenshot: Paraphrase View
  console.log('2. Navigating to Paraphrase Drill...');
  await page.evaluate(() => {
    // Open dropdown or click tab
    const btns = Array.from(document.querySelectorAll('header button'));
    const drillBtn = btns.find(b => b.textContent.includes('专项'));
    if (drillBtn) drillBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const pBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('同义替换'));
    if (pBtn) pBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Pick option B and submit
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    if (labels[1]) labels[1].click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const subBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('提交对答案'));
    if (subBtn) subBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_paraphrase_drill.png'),
    fullPage: false
  });

  // 3. Screenshot: Grammar Drill View
  console.log('3. Navigating to Grammar Drill...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const drillBtn = btns.find(b => b.textContent.includes('专项'));
    if (drillBtn) drillBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const gBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('语法点专练'));
    if (gBtn) gBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click on "定语从句" tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const attrTab = tabs.find(t => t.textContent.includes('定语从句'));
    if (attrTab) attrTab.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_grammar_drill.png'),
    fullPage: false
  });

  // 4. Screenshot: Phrases View
  console.log('4. Navigating to High Frequency Phrases...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const drillBtn = btns.find(b => b.textContent.includes('专项'));
    if (drillBtn) drillBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const phrBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('高频词组'));
    if (phrBtn) phrBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_phrases_browse.png'),
    fullPage: false
  });

  // 5. Screenshot: Vocab Stats View
  console.log('5. Navigating to Vocab Stats...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const vBtn = btns.find(b => b.textContent.includes('词汇'));
    if (vBtn) vBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_vocab_stats.png'),
    fullPage: false
  });

  // 6. Screenshot: Personal Center (复习中心)
  console.log('6. Navigating to Personal Center...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const pBtn = btns.find(b => b.textContent.includes('复习'));
    if (pBtn) pBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_personal_center.png'),
    fullPage: false
  });

  // 7. Screenshot: Real Exam Wall (全真模考)
  console.log('7. Navigating to Real Exam Quiz Wall...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const qBtn = btns.find(b => b.textContent.includes('模考'));
    if (qBtn) qBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verify_exam_wall_backward_compatible.png'),
    fullPage: false
  });

  console.log('All 7 verification screenshots captured successfully!');
  await browser.close();
}

runE2E().catch(console.error);
