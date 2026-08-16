const fs = require('fs');
const https = require('https');
const path = require('path');

const papersDir = path.join(__dirname, 'public/data/papers');
const imagesDir = path.join(__dirname, 'public/data/images/writing');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      resolve(); // skip if already downloaded
      return;
    }
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => reject(`Status ${response.statusCode}`));
      }
    }).on('error', err => {
      fs.unlink(dest, () => reject(err.message));
    });
  });
}

async function main() {
  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const writingTasks = data.tasks.filter(t => t.meta.category.includes('writing'));
    for (const t of writingTasks) {
      const url = `https://zhentiqiang.com/kaoyan/english1/static/thumbs/${t.id}.png`;
      const dest = path.join(imagesDir, `${t.id}.png`);
      try {
        await download(url, dest);
        console.log(`Downloaded ${t.id}.png`);
      } catch (err) {
        console.log(`Failed to download ${t.id}.png: ${err}`);
      }
    }
  }
}

main();
