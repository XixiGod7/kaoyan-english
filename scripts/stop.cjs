const { exec } = require('child_process');

const PORT = 8085;

console.log('========================================================');
console.log('         考研英语一真题刷题系统 - 停止服务');
console.log('========================================================\n');

exec(`netstat -ano | findstr :${PORT}`, (err, stdout) => {
  if (err || !stdout || !stdout.trim()) {
    console.log(`[提示] 端口 ${PORT} 当前没有正在运行的服务。`);
    setTimeout(() => process.exit(0), 1500);
    return;
  }

  const lines = stdout.trim().split('\n');
  const pids = new Set();

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && !isNaN(pid)) {
      pids.add(pid);
    }
  });

  if (pids.size === 0) {
    console.log(`[提示] 未找到相关进程。`);
    setTimeout(() => process.exit(0), 1500);
    return;
  }

  pids.forEach((pid) => {
    console.log(`正在停止进程 (PID: ${pid})...`);
    exec(`taskkill /F /PID ${pid}`);
  });

  console.log(`\n[√] 考研英语刷题服务已全部停止。`);
  setTimeout(() => process.exit(0), 1500);
});
