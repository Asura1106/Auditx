const { execFileSync } = require('node:child_process');
const path = require('node:path');

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
}

function getOutput(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    shell: false,
    ...options,
  }).trim();
}

function main() {
  const branch = getOutput(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD') {
    console.error('[ship] You must be on a branch before shipping.');
    process.exit(1);
  }

  const root = getOutput(['rev-parse', '--show-toplevel']);
  const repoName = path.basename(root);
  const message = process.argv.slice(2).join(' ').trim() || `chore: ship ${new Date().toISOString().slice(0, 10)}`;

  console.log(`[ship] Staging changes on ${branch}...`);
  runGit(['add', '-A']);

  const status = getOutput(['status', '--porcelain']);
  if (status) {
    console.log(`[ship] Committing with message: ${message}`);
    runGit(['commit', '-m', message]);
  } else {
    console.log('[ship] Working tree is clean. Pushing current branch tip...');
  }

  console.log(`[ship] Pushing ${branch} to origin...`);
  runGit(['push', 'origin', branch]);

  console.log(`[ship] Done. Vercel should pick up the new push automatically.`);
  console.log(`[ship] Repo: ${repoName}`);
}

try {
  main();
} catch (error) {
  console.error('[ship] Ship failed.');
  if (error && typeof error === 'object' && 'message' in error) {
    console.error(String(error.message));
  }
  process.exit(1);
}
