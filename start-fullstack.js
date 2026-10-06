const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('  VAAN VIBES CAFE & RESTRO - UNIFIED MULTI-SERVICE PLATFORM');
console.log('='.repeat(70));
console.log('🚀 FastAPI Backend        -> http://127.0.0.1:9000 (API & Docs: /docs)');
console.log('☕ Customer Frontend     -> http://localhost:4000 (Menu, QR & Ordering)');
console.log('📊 Management Portal     -> http://localhost:4001 (Dashboard, KOT & Billing)');
console.log('-'.repeat(70));

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'apps', 'frontend');
const managementDir = path.join(rootDir, 'apps', 'management');

const pythonVenv = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const pythonExe = fs.existsSync(pythonVenv) ? pythonVenv : 'python';
const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

// Helper to log service output
function attachLogger(proc, prefix, colorCode) {
  proc.stdout.on('data', (data) => {
    data.toString().trim().split('\n').forEach((line) => {
      if (line.trim()) console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line.trim()}`);
    });
  });
  proc.stderr.on('data', (data) => {
    data.toString().trim().split('\n').forEach((line) => {
      if (line.trim()) console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line.trim()}`);
    });
  });
}

// 1. Launch FastAPI Backend on Port 9000
const backendProcess = spawn(
  pythonExe,
  ['-m', 'uvicorn', 'app.main:app', '--app-dir', backendDir, '--host', '127.0.0.1', '--port', '9000', '--reload'],
  {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: true,
  }
);
attachLogger(backendProcess, 'BACKEND:9000', '35');

// 2. Launch Customer Frontend on Port 4000
const customerProcess = spawn(
  pnpmCmd,
  ['run', 'dev'],
  {
    cwd: frontendDir,
    env: { ...process.env, PORT: '4000' },
    shell: true,
  }
);
attachLogger(customerProcess, 'CUSTOMER:4000', '36');

// 3. Launch Management Frontend on Port 4001
const managementProcess = spawn(
  pnpmCmd,
  ['run', 'dev'],
  {
    cwd: managementDir,
    env: { ...process.env, PORT: '4001' },
    shell: true,
  }
);
attachLogger(managementProcess, 'MANAGEMENT:4001', '33');

const childProcesses = [
  { name: 'Backend', proc: backendProcess },
  { name: 'Customer Frontend', proc: customerProcess },
  { name: 'Management Portal', proc: managementProcess },
];

function cleanup() {
  console.log('\nStopping all services...');
  childProcesses.forEach(({ name, proc }) => {
    try {
      if (proc.pid) {
        if (isWin) {
          spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
        } else {
          proc.kill('SIGINT');
        }
      }
    } catch (e) {}
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
