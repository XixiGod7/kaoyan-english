const fs = require('fs');
const https = require('https');
const path = require('path');

const publicWritingDir = path.join(__dirname, '../public/data/images/writing');
const distWritingDir = path.join(__dirname, '../dist/data/images/writing');

[publicWritingDir, distWritingDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
          file.close(() => {
            const size = fs.statSync(dest).size;
            resolve(size);
          });
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

async function scrapeAllWritingImages() {
  const papersDir = path.join(__dirname, '../public/data/papers');
  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} paper json files.`);
  let count = 0;

  for (const file of files) {
    const paper = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const writingTasks = paper.tasks.filter(t => 
      t.meta.category.includes('writing') || 
      t.meta.chinese_name.includes('作文') ||
      (t.meta.part && t.meta.part.includes('Part') && t.meta.section && t.meta.section.includes('III'))
    );

    for (const t of writingTasks) {
      const taskId = t.meta.id;
      const url = `https://zhentiqiang.com/kaoyan/english1/static/images/kaoyan_writing/${taskId}.png`;
      const publicDest = path.join(publicWritingDir, `${taskId}.png`);
      const distDest = path.join(distWritingDir, `${taskId}.png`);

      console.log(`Downloading Task ${taskId} (${t.meta.chinese_name}) from ${url}...`);
      try {
        const size = await downloadImage(url, publicDest);
        // Also copy to dist
        fs.copyFileSync(publicDest, distDest);
        console.log(`✓ Saved ${taskId}.png (${(size / 1024).toFixed(1)} KB)`);
        count++;
      } catch (err) {
        console.warn(`✗ Failed for ${taskId}:`, err.message);
      }
    }
  }

  console.log(`🎉 Successfully downloaded ${count} high-resolution writing images!`);
}

scrapeAllWritingImages();
