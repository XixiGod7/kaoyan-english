const fs = require('fs');
const path = require('path');

// Source paths (absolute or relative to project root)
const srcRoot = path.join(__dirname, '..', '2010-2025年考研英语一真题及解析');
const srcExams = path.join(srcRoot, '01、英一真题部分');
const srcAnswers = path.join(srcRoot, '02、解析部分', '速查版');
const srcAnalysis = path.join(srcRoot, '02、解析部分', '详细版');

// Destination paths
const destRoot = path.join(__dirname, '..', 'public', 'pdfs', '2010-2025');
const destExams = path.join(destRoot, 'exam');
const destAnswers = path.join(destRoot, 'answers');
const destAnalysis = path.join(destRoot, 'analysis');

// Ensure destination directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

ensureDir(destExams);
ensureDir(destAnswers);
ensureDir(destAnalysis);

// Process Exams
// Source pattern: "2010年考研英语一真题【可复制搜索查词】.pdf" -> "2010.pdf"
if (fs.existsSync(srcExams)) {
  const files = fs.readdirSync(srcExams);
  files.forEach(file => {
    if (file.endsWith('.pdf')) {
      const match = file.match(/^(\d{4})年/);
      if (match) {
        const year = match[1];
        const destFile = path.join(destExams, `${year}.pdf`);
        fs.copyFileSync(path.join(srcExams, file), destFile);
        console.log(`Copied Exam: ${file} -> ${year}.pdf`);
      }
    }
  });
} else {
  console.error(`Source Exams folder not found: ${srcExams}`);
}

// Process Answers (速查版)
// Source pattern: "2010考研英语一真题答案.pdf" -> "2010-answer.pdf"
if (fs.existsSync(srcAnswers)) {
  const files = fs.readdirSync(srcAnswers);
  files.forEach(file => {
    if (file.endsWith('.pdf')) {
      const match = file.match(/^(\d{4})考研/);
      if (match) {
        const year = match[1];
        const destFile = path.join(destAnswers, `${year}-answer.pdf`);
        fs.copyFileSync(path.join(srcAnswers, file), destFile);
        console.log(`Copied Answer: ${file} -> ${year}-answer.pdf`);
      }
    }
  });
} else {
  console.error(`Source Answers folder not found: ${srcAnswers}`);
}

// Process Analysis (详细版)
// Source pattern: "2010年考研英语一真题解析.pdf" -> "2010-analysis.pdf"
if (fs.existsSync(srcAnalysis)) {
  const files = fs.readdirSync(srcAnalysis);
  files.forEach(file => {
    if (file.endsWith('.pdf')) {
      const match = file.match(/^(\d{4})年/);
      if (match) {
        const year = match[1];
        const destFile = path.join(destAnalysis, `${year}-analysis.pdf`);
        fs.copyFileSync(path.join(srcAnalysis, file), destFile);
        console.log(`Copied Analysis: ${file} -> ${year}-analysis.pdf`);
      }
    }
  });
} else {
  console.error(`Source Analysis folder not found: ${srcAnalysis}`);
}

console.log('PDF copying and renaming completed successfully!');
