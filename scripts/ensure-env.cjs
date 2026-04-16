const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const nodeModulesPath = path.join(root, 'node_modules');
const modulesLockPath = path.join(nodeModulesPath, '.package-lock.json');

function log(msg) {
  console.log(`[setup] ${msg}`);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const major = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(major) || major < 20) {
  console.error(`[setup] Node.js 20+ required. Current: ${process.versions.node}`);
  process.exit(1);
}

if (!fs.existsSync(lockPath)) {
  log('No package-lock.json found. Running npm install...');
  run('npm', ['install']);
  process.exit(0);
}

let shouldInstall = false;
if (!fs.existsSync(nodeModulesPath)) {
  shouldInstall = true;
  log('node_modules missing. Installing dependencies...');
} else if (!fs.existsSync(modulesLockPath)) {
  shouldInstall = true;
  log('node_modules lock snapshot missing. Reinstalling dependencies...');
} else {
  const lockMtime = fs.statSync(lockPath).mtimeMs;
  const modulesLockMtime = fs.statSync(modulesLockPath).mtimeMs;
  if (lockMtime > modulesLockMtime) {
    shouldInstall = true;
    log('package-lock changed. Reinstalling pinned versions...');
  }
}

if (shouldInstall) {
  run('npm', ['ci']);
} else {
  log('Dependencies already aligned with lockfile.');
}
