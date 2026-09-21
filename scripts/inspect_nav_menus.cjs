const puppeteer = require('puppeteer-core');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://yanbrick.com/english?exam=en1', { waitUntil: 'networkidle2' });
  
  const buttons = await page.$$('.nav-group button.nav-trigger');
  console.log('Found nav buttons:', buttons.length);
  const menus = [];
  for (let i = 0; i < buttons.length; i++) {
    await buttons[i].click();
    await new Promise(r => setTimeout(r, 200));
    const content = await page.evaluate(idx => {
      const g = document.querySelectorAll('.nav-group')[idx];
      return {
        btn: g.querySelector('button')?.textContent.trim(),
        links: Array.from(g.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
      };
    }, i);
    menus.push(content);
  }
  console.log(JSON.stringify(menus, null, 2));

  // Also check all links on the entire page
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href')
    }));
  });
  console.log('All links count:', allLinks.length);
  console.log('Unique link hrefs:', Array.from(new Set(allLinks.map(l => l.href))));

  await browser.close();
}
run().catch(console.error);
