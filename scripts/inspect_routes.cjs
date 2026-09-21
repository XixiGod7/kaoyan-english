const puppeteer = require('puppeteer-core');

async function inspectRoutes() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    '/english/paraphrase?exam=en1',
    '/english/translate?exam=en1',
    '/english/sentence-review?exam=en1',
    '/english/essay?exam=en1',
    '/english/vocab?exam=en1',
    '/english/phrases?exam=en1',
    '/english/grammar?exam=en1',
    '/english/review?exam=en1',
    '/english/favorites?exam=en1',
    '/english/insight?exam=en1'
  ];

  const results = {};

  for (const route of routes) {
    const url = 'https://yanbrick.com' + route;
    console.log('Navigating to:', url);
    const requests = [];
    page.on('request', req => {
      const u = req.url();
      if (u.includes('/api/')) requests.push(u);
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1000));
      const title = await page.title();
      const textSummary = await page.evaluate(() => {
        return {
          h1: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).slice(0, 10),
          btnCount: document.querySelectorAll('button').length,
          bodySnippet: document.body.innerText.slice(0, 300).replace(/\n+/g, ' ')
        };
      });
      results[route] = {
        title,
        apiRequests: Array.from(new Set(requests)),
        textSummary
      };
    } catch (e) {
      results[route] = { error: e.message };
    }
    page.removeAllListeners('request');
  }

  console.log('Results:\n', JSON.stringify(results, null, 2));
  await browser.close();
}

inspectRoutes().catch(console.error);
