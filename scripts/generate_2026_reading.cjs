const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'sk-hqAiWjkWZQjMAMi6YaNFlZcl94UrnqiL';

const TASKS = [
  { textNo: 1, taskId: 202601002, key: '2026-t1', title: '驴在推动人类文明中的演化与遗传驯化历史' },
  { textNo: 2, taskId: 202601003, key: '2026-t2', title: '科学研究在绿色减排与碳足迹考量下的平衡与自省' },
  { textNo: 3, taskId: 202601004, key: '2026-t3', title: '好莱坞传统电影制片厂在流媒体亏损后的策略回归' },
  { textNo: 4, taskId: 202601005, key: '2026-t4', title: '数字遗产、数字信息保存与物理文化载体的脆弱性' }
];

function callSenseNova(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature: 0.1
    });

    const req = https.request({
      hostname: 'token.sensenova.cn',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
          resolve(json.choices?.[0]?.message?.content || '');
        } catch (err) {
          reject(new Error(`Failed to parse SenseNova JSON: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function analyzeBatch(batch) {
  const systemPrompt = `你是一位考研英语长难句语法分析名师。
请对给出的考研英语真题句子列表（包含英文原句和参考译文），严格进行句法结构树拆解。
严格输出一个 JSON 数组，必须包含与输入数组相同数量和顺序的对象，每个对象结构：
{
  "sid": "句子sid",
  "trunk": {
    "主语": "英文主语",
    "谓语": "英文谓语",
    "宾语或表语": "英文宾语或表语",
    "主干翻译": "中文主干精简翻译"
  },
  "components": [
    {
      "成分类型": "状语从句(时间/原因等) / 定语从句 / 非谓语动词短语 / 介词短语作定语 / 插入语 / 宾语从句 等",
      "原文": "英文修饰原文",
      "修饰对象": "修饰的目标词或句子",
      "中文翻译": "该成分的中文翻译",
      "说明": "语法功能与解析说明"
    }
  ]
}
只返回合法 JSON，不要加 markdown 代码块，不要有多余文字。`;

  const inputPayload = batch.map(b => ({
    sid: b.sid,
    s: b.s,
    zh: b.zh
  }));

  const resText = await callSenseNova([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(inputPayload) }
  ]);

  const clean = resText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

async function extractKeywords(sentences, textNo) {
  const text = sentences.map(s => s.s).join(' ');
  const systemPrompt = `你是一位考研英语命题与词汇分析名师。
请从给定的考研英语一 2026 年 Text ${textNo} 全文中，提取：
1. 10-15 个核心考研重难点词汇（words）：每个词含 w (原形单词), n (文章出现频次), forms (文章中出现的形态列表)。
2. 5-8 个地道真题短语/固定搭配（phrases）：每个短语含 en (英文短语), zh (准确中文释义), note (考点用法说明)。

严格返回合法 JSON 格式：
{
  "words": [
    { "w": "word", "n": 2, "forms": ["words"] }
  ],
  "phrases": [
    { "en": "phrase in english", "zh": "中文含义", "note": "用法点拨" }
  ]
}
只返回合法 JSON，不要加 markdown 代码块。`;

  const resText = await callSenseNova([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text.slice(0, 3500) }
  ]);

  const clean = resText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

async function main() {
  console.log('Starting 2026 Reading Data Generation...');

  const papersPath = path.join(__dirname, '../public/data/papers/2026.json');
  const paper = JSON.parse(fs.readFileSync(papersPath, 'utf8'));

  const newIndexItems = [];
  const allGrammarRows = [];

  for (const tConfig of TASKS) {
    console.log(`\n=== Processing 2026 Text ${tConfig.textNo} (${tConfig.key}) ===`);
    const task = paper.tasks.find(t => t.meta.id === tConfig.taskId);
    if (!task) {
      console.error(`Task ${tConfig.taskId} not found!`);
      continue;
    }

    // 1. Load sentences
    const sFilePath = path.join(__dirname, `../public/data/sentences/${tConfig.taskId}.json`);
    const sData = JSON.parse(fs.readFileSync(sFilePath, 'utf8'));
    const contentSentences = sData.sentences.filter(s => s.order_seq && s.order_seq.startsWith('content_'));

    console.log(`Found ${contentSentences.length} article sentences.`);

    // Map into preliminary passage sentences
    const passageSentences = contentSentences.map((s, idx) => {
      const parts = s.order_seq.split('_');
      const paraNo = parseInt(parts[1], 10);
      const paraSeq = parseInt(parts[2], 10) - 1;
      return {
        sid: `en1-2026-text${tConfig.textNo}-s${idx + 1}`,
        s: s.en_text.trim(),
        para_no: paraNo,
        para_seq: paraSeq,
        zh: s.cn_text.trim(),
        underline: null,
        trunk: {
          "主语": "",
          "谓语": "",
          "宾语或表语": "",
          "主干翻译": ""
        },
        components: []
      };
    });

    // 2. Batch syntax tree breakdown (batches of 6)
    const BATCH_SIZE = 6;
    for (let i = 0; i < passageSentences.length; i += BATCH_SIZE) {
      const chunk = passageSentences.slice(i, i + BATCH_SIZE);
      console.log(`Analyzing syntax tree for sentences ${i + 1} to ${Math.min(i + BATCH_SIZE, passageSentences.length)}...`);
      try {
        const trees = await analyzeBatch(chunk);
        for (const item of trees) {
          const target = passageSentences.find(s => s.sid === item.sid);
          if (target) {
            target.trunk = item.trunk || target.trunk;
            target.components = item.components || target.components;
          }
        }
      } catch (err) {
        console.error(`Failed to analyze syntax batch ${i}:`, err.message);
      }
      // Small pause to avoid rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    // 3. Build paragraphs
    const paraMap = {};
    for (const s of passageSentences) {
      if (!paraMap[s.para_no]) paraMap[s.para_no] = [];
      paraMap[s.para_no].push(s.s);
    }
    const paragraphs = Object.keys(paraMap).sort((a, b) => Number(a) - Number(b)).map(pNo => ({
      index: Number(pNo),
      text: paraMap[pNo].join(' ')
    }));

    // 4. Save Passage detail JSON
    const passageData = {
      exam: 'en1',
      key: tConfig.key,
      year: 2026,
      text_no: tConfig.textNo,
      title: tConfig.title,
      sentences: passageSentences,
      paragraphs
    };
    const passageOutPath = path.join(__dirname, `../public/data/reading/passages/${tConfig.key}.json`);
    fs.writeFileSync(passageOutPath, JSON.stringify(passageData, null, 2), 'utf8');
    console.log(`Saved ${passageOutPath}`);

    // 5. Build and Save Questions JSON
    const questions = (task.detail.questions || []).map((q, qIdx) => ({
      id: q.id || (202600 + (tConfig.textNo - 1) * 5 + qIdx + 1),
      qNo: qIdx + 1,
      stem: q.text ? q.text.replace(/^Question\s+\d+[:.\s]*/i, '') : `Question ${qIdx + 1}`,
      choices: (q.options || []).map(opt => opt.replace(/^[A-D]\)\s*/, '').trim()),
      answer: q.answer || 'A',
      analysis: q.ai_analysis_text || ''
    }));
    const questionsOutPath = path.join(__dirname, `../public/data/reading/questions/${tConfig.key}.json`);
    fs.writeFileSync(questionsOutPath, JSON.stringify(questions, null, 2), 'utf8');
    console.log(`Saved ${questionsOutPath}`);

    // 6. Generate and Save Keywords JSON
    console.log(`Generating keywords and phrases for ${tConfig.key}...`);
    try {
      const kw = await extractKeywords(passageSentences, tConfig.textNo);
      const keywordsData = {
        exam: 'en1',
        key: tConfig.key,
        found: true,
        words: kw.words || [],
        phrases: kw.phrases || []
      };
      const kwOutPath = path.join(__dirname, `../public/data/reading/keywords/${tConfig.key}.json`);
      fs.writeFileSync(kwOutPath, JSON.stringify(keywordsData, null, 2), 'utf8');
      console.log(`Saved ${kwOutPath}`);
    } catch (e) {
      console.error(`Failed to generate keywords for ${tConfig.key}:`, e.message);
    }

    // 7. Collect Index item
    newIndexItems.push({
      exam: 'en1',
      key: tConfig.key,
      year: 2026,
      text_no: tConfig.textNo,
      title: tConfig.title,
      preview: passageSentences[0]?.s || '',
      n: passageSentences.length
    });

    // 8. Collect grammar sentences for grammar_all.json
    for (const s of passageSentences) {
      allGrammarRows.push({
        sid: s.sid,
        key: tConfig.key,
        year: 2026,
        text_no: tConfig.textNo,
        s: s.s,
        zh: s.zh,
        cats: s.components.map(c => c['成分类型']).filter(Boolean),
        labels: s.components.map(c => c['成分类型']).filter(Boolean)
      });
    }
  }

  // Update public/data/reading/index.json
  const indexPath = path.join(__dirname, '../public/data/reading/index.json');
  const existingIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const filteredIndex = existingIndex.filter(item => item.year !== 2026);
  const updatedIndex = [...newIndexItems, ...filteredIndex];
  fs.writeFileSync(indexPath, JSON.stringify(updatedIndex, null, 2), 'utf8');
  console.log(`Updated ${indexPath} (total ${updatedIndex.length} texts, 2026 Texts 1-4 added at top).`);

  // Update public/data/grammar/grammar_all.json
  const grammarPath = path.join(__dirname, '../public/data/grammar/grammar_all.json');
  if (fs.existsSync(grammarPath)) {
    const grammarData = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
    const non2026Rows = (grammarData.rows || []).filter(r => r.year !== 2026);
    const updatedRows = [...allGrammarRows, ...non2026Rows];
    grammarData.rows = updatedRows;
    grammarData.total = updatedRows.length;
    fs.writeFileSync(grammarPath, JSON.stringify(grammarData, null, 2), 'utf8');
    console.log(`Updated ${grammarPath} with 2026 sentences (total ${updatedRows.length}).`);
  }

  console.log('\nAll 2026 reading data generated successfully!');
}

main().catch(err => {
  console.error('Fatal error generating 2026 reading data:', err);
  process.exit(1);
});
