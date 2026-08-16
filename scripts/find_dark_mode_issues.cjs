const fs = require('fs');
const path = require('path');

const files = [
  'src/App.tsx',
  'src/components/Header.tsx',
  'src/components/WordFreqSidebar.tsx',
  'src/components/ExamWall.tsx',
  'src/components/WordDetailModal.tsx',
  'src/components/QuizMode.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n================== ${file} ==================`);
  
  lines.forEach((line, idx) => {
    const l = line.trim();
    if (
      l.includes('text-gray-900') ||
      l.includes('text-gray-800') ||
      l.includes('text-gray-700') ||
      l.includes('text-gray-600') ||
      l.includes('text-gray-500') ||
      l.includes('text-black') ||
      l.includes('bg-white') ||
      l.includes('bg-gray-50') ||
      l.includes('bg-gray-100')
    ) {
      if (!l.includes('isDark') && !l.includes('theme ===') && !l.startsWith('//')) {
        console.log(`L${idx + 1}: ${l}`);
      }
    }
  });
});
