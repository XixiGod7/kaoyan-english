const fs = require('fs');
const path = require('path');

function processTask(clozeTask) {
  if (!clozeTask || !clozeTask.detail) return;
  const contentJson = clozeTask.detail.content_json || {};
  const sentences = clozeTask.detail.sentences || [];

  const sentenceBlanksMap = {};
  for (let num = 1; num <= 20; num++) {
    const bInfo = contentJson[String(num)];
    if (!bInfo || !bInfo.replace || !bInfo.sentence_id) continue;
    const sId = bInfo.sentence_id;
    if (!sentenceBlanksMap[sId]) sentenceBlanksMap[sId] = [];
    sentenceBlanksMap[sId].push({
      num,
      start: bInfo.replace.start,
      end: bInfo.replace.end
    });
  }

  if (Array.isArray(contentJson.blanks)) {
    contentJson.blanks.forEach(b => {
      const sId = b.sentence_id;
      if (!sentenceBlanksMap[sId]) sentenceBlanksMap[sId] = [];
      if (!sentenceBlanksMap[sId].some(x => x.num === b.blank_no)) {
        sentenceBlanksMap[sId].push({
          num: b.blank_no,
          start: b.replace.start,
          end: b.replace.end
        });
      }
    });
  }

  const formattedLines = [];
  for (const s of sentences) {
    const sId = s.id;
    const blanksInS = sentenceBlanksMap[sId] || [];
    blanksInS.sort((a, b) => b.start - a.start);

    let text = s.en_text || '';
    for (const b of blanksInS) {
      text = text.substring(0, b.start) + ` [ ${b.num} ] ` + text.substring(b.end);
    }
    formattedLines.push(text.trim().replace(/\s+/g, ' '));
  }

  clozeTask.detail.cloze_formatted_article = formattedLines.join('\n');
}

// 1. Papers
const papersDir = path.join(__dirname, '../public/data/papers');
const paperFiles = fs.readdirSync(papersDir).filter(f => f.endsWith('.json')).sort();
for (const file of paperFiles) {
  const filePath = path.join(papersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const clozeTask = data.tasks.find(t => t.meta?.category === 'cloze' || t.meta?.chinese_name?.includes('完形'));
  if (clozeTask) {
    processTask(clozeTask);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated paper: ${file}`);
  }
}

// 2. Tasks
const tasksDir = path.join(__dirname, '../public/data/tasks');
const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('01001.json')).sort();
for (const file of taskFiles) {
  const filePath = path.join(tasksDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data.tasks) {
    data.tasks.forEach(t => processTask(t));
  } else if (data.detail) {
    processTask(data);
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated task: ${file}`);
}
