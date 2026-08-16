const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://zhentiqiang.com/kaoyan/english1/api';
const TASKS_DIR = path.join(__dirname, '../public/data/tasks');
const SENTENCES_DIR = path.join(__dirname, '../public/data/sentences');

if (!fs.existsSync(SENTENCES_DIR)) {
  fs.mkdirSync(SENTENCES_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSentences() {
  const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.json'));
  let taskIds = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(TASKS_DIR, file), 'utf8'));
    if (data.tasks) {
      for (const t of data.tasks) {
        if (t.task_id) {
          taskIds.push(t.task_id);
        } else if (t.id) {
           taskIds.push(t.id);
        }
      }
    }
  }

  // Deduplicate
  taskIds = [...new Set(taskIds)];
  console.log(`Found ${taskIds.length} tasks to scrape sentences for.`);

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const outFile = path.join(SENTENCES_DIR, `${taskId}.json`);
    
    if (fs.existsSync(outFile)) {
      console.log(`[${i+1}/${taskIds.length}] Skipping ${taskId}, already exists.`);
      continue;
    }

    try {
      console.log(`[${i+1}/${taskIds.length}] Fetching sentences for ${taskId}...`);
      const res = await fetch(`${BASE_URL}/sentences?task_id=${taskId}`);
      if (!res.ok) {
        console.error(`Failed to fetch ${taskId}: ${res.statusText}`);
        continue;
      }
      const json = await res.json();
      fs.writeFileSync(outFile, JSON.stringify(json, null, 2));
      await sleep(200); // polite delay
    } catch (err) {
      console.error(`Error fetching ${taskId}:`, err);
    }
  }
  console.log('Done.');
}

scrapeSentences();
