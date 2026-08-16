const fs = require('fs');
const https = require('https');
const path = require('path');

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://zhentiqiang.com/kaoyan/english1/'
      }
    }, res => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(fs.statSync(dest).size));
        });
      } else {
        file.close();
        fs.unlink(dest, () => reject(new Error(`Status ${res.statusCode}`)));
      }
    });
    req.on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function fixAndDownload() {
  const years = ['2010', '2016', '2020'];
  for (const y of years) {
    const pPath = path.join(__dirname, `../public/data/papers/${y}.json`);
    const p = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    
    // Correct task metadata
    p.tasks.forEach(t => {
      if (t.meta.id === parseInt(`${y}01007`)) {
        t.meta.chinese_name = '英译汉';
        t.meta.category = 'translation';
      }
      if (t.meta.id === parseInt(`${y}01008`)) {
        t.meta.chinese_name = '小作文';
        t.meta.category = 'writing';
      }
      if (t.meta.id === parseInt(`${y}01009`)) {
        t.meta.chinese_name = '大作文';
        t.meta.category = 'writing';
      }
    });

    fs.writeFileSync(pPath, JSON.stringify(p, null, 2), 'utf8');
    console.log(`Updated ${y}.json task names`);

    // Download 008 (small) and 009 (big)
    for (const suffix of ['008', '009']) {
      const tid = `${y}01${suffix}`;
      const url = `https://zhentiqiang.com/kaoyan/english1/static/images/kaoyan_writing/${tid}.png`;
      const pubDest = path.join(__dirname, `../public/data/images/writing/${tid}.png`);
      const distDest = path.join(__dirname, `../dist/data/images/writing/${tid}.png`);
      try {
        const size = await downloadImage(url, pubDest);
        fs.copyFileSync(pubDest, distDest);
        console.log(`✓ Downloaded ${tid}.png (${(size/1024).toFixed(1)} KB)`);
      } catch (e) {
        console.log(`Failed ${tid}:`, e.message);
      }
    }
  }
}

fixAndDownload();
