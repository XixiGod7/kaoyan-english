const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '../public/data/papers');
const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json')).sort();

for (const file of files) {
  const filePath = path.join(papersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const clozeTask = data.tasks.find(t => t.meta?.category === 'cloze' || t.meta?.chinese_name?.includes('完形'));
  if (!clozeTask) continue;

  const contentJson = clozeTask.detail.content_json || {};
  const sentences = clozeTask.detail.sentences || [];
  
  // Check if contentJson has 1..20
  const blankNums = Object.keys(contentJson).filter(k => /^\d+$/.test(k)).map(Number).sort((a,b)=>a-b);
  console.log(`\n=== ${file} ===`);
  console.log(`content_json keys (1..20 count): ${blankNums.length}`);

  // Test reconstructing each sentence by replacing exact [start, end] ranges with [ blankNum ]
  // Map sentence_id -> list of blanks
  const sentenceBlanksMap = {};
  for (let num = 1; num <= 20; num++) {
    const bInfo = contentJson[String(num)];
    if (!bInfo || !bInfo.replace || !bInfo.sentence_id) {
      console.log(`  Missing blank info for Question ${num}`);
      continue;
    }
    const sId = bInfo.sentence_id;
    if (!sentenceBlanksMap[sId]) sentenceBlanksMap[sId] = [];
    sentenceBlanksMap[sId].push({
      num,
      start: bInfo.replace.start,
      end: bInfo.replace.end
    });
  }

  // Group by sentence and reconstruct
  const reconstructedSentences = [];
  for (const s of sentences) {
    const sId = s.id;
    const blanksInS = sentenceBlanksMap[sId] || [];
    // Sort blanks by start descending so replacing from end doesn't shift earlier start indices!
    blanksInS.sort((a, b) => b.start - a.start);
    
    let text = s.en_text || '';
    for (const b of blanksInS) {
      const replacedWord = text.substring(b.start, b.end);
      text = text.substring(0, b.start) + ` [ ${b.num} ] ` + text.substring(b.end);
    }
    reconstructedSentences.push({
      order_seq: s.order_seq,
      text: text.trim().replace(/\s+/g, ' ')
    });
  }

  // Count reconstructed blanks in text order
  const allReconstructedText = reconstructedSentences.map(s => s.text).join(' ');
  const regex = /\[\s*(\d+)\s*\]/g;
  const seq = [];
  let m;
  while ((m = regex.exec(allReconstructedText)) !== null) {
    seq.push(parseInt(m[1]));
  }

  console.log(`Reconstructed blanks seq: ${seq.join(',')}`);
  const isPerfect = seq.length === 20 && seq.every((b, i) => b === i + 1);
  if (isPerfect) {
    console.log(`✅ PERFECT 1..20 ASCENDING ORDER in ${file}`);
  } else {
    console.log(`❌ STILL HAS ISSUES in ${file}: expected 1..20, got ${seq.join(',')}`);
  }
}
