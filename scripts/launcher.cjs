const net = require('net');
const { exec } = require('child_process');
const path = require('path');

const PORT = 8085;
const URL = `http://localhost:${PORT}/`;
const ROOT_DIR = path.resolve(__dirname, '..');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

function openBrowser(url) {
  console.log(`[+] 正在打开浏览器: ${url}`);
  exec(`start ${url}`);
}

async function main() {
  console.log('========================================================');
  console.log('         考研英语一真题刷题系统 - 快速启动');
  console.log('========================================================\n');

  const isRunning = await checkPort(PORT);

  if (isRunning) {
    console.log(`[+] 检测到后台服务已在运行 (端口 ${PORT})`);
    openBrowser(URL);
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  console.log(`[+] 正在启动后台 Vite 题库服务 (端口 ${PORT})...`);

  // Use cmd start /min to ensure the process lives independently in background
  const command = `start "KaoyanEnglishServer" /min cmd /c "cd /d "${ROOT_DIR}" && npm run dev -- --port ${PORT} --host"`;
  exec(command);

  // Wait for server to become responsive
  let ready = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 300));
    if (await checkPort(PORT)) {
      ready = true;
      break;
    }
  }

  if (ready) {
    console.log(`[√] 服务启动成功！`);
  } else {
    console.log(`[!] 服务正在启动...`);
  }

  openBrowser(URL);
  console.log('\n========================================================');
  console.log(' 题库系统已在浏览器打开，祝考研顺利！');
  console.log('========================================================\n');

  setTimeout(() => process.exit(0), 1200);
}

main().catch((err) => {
  console.error('启动出错:', err);
  openBrowser(URL);
  setTimeout(() => process.exit(1), 2000);
});
