const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '../public/data/papers');
const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json')).sort();

for (const file of files) {
  const filePath = path.join(papersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const clozeTask = data.tasks.find(t => t.meta?.category === 'cloze' || t.meta?.chinese_name?.includes('完形'));
  if (!clozeTask) {
    console.log(`[${file}] No cloze task found.`);
    continue;
  }

  const raw = clozeTask.detail.cloze_formatted_article || '';
  const regex = /\[\s*(\d+)\s*\]/g;
  const blanks = [];
  let m;
  while ((m = regex.exec(raw)) !== null) {
    blanks.push(parseInt(m[1]));
  }

  const isStrictlyAscending = blanks.every((b, i) => b === i + 1);
  console.log(`[${file}] blanks length: ${blanks.length}, sequence: ${blanks.join(',')}`);
  if (!isStrictlyAscending || blanks.length !== 20) {
    console.log(`  ❌ MISMATCH in ${file}!`);
  } else {
    console.log(`  ✅ Perfect in ${file}`);
  }
}
