const { spawnSync } = require('child_process');

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    const message = stderr || stdout || `git ${args.join(' ')}`;
    throw new Error(message);
  }

  return (result.stdout || '').trim();
}

function log(message) {
  console.log(`[ship] ${message}`);
}

function main() {
  const branch = runGit(['branch', '--show-current']);
  if (!branch) {
    throw new Error('No current branch detected. Are you in a detached HEAD state?');
  }

  const status = runGit(['status', '--porcelain']);
  if (!status) {
    log('No changes to ship.');
    return;
  }

  const message = process.argv.slice(2).join(' ').trim() || `chore: ship ${new Date().toISOString().slice(0, 10)}`;

  log(`Staging changes on ${branch}...`);
  runGit(['add', '-A']);

  log(`Committing with message: ${message}`);
  runGit(['commit', '-m', message]);

  log(`Pushing ${branch} to origin...`);
  runGit(['push', '-u', 'origin', branch], { stdio: 'inherit' });

  log('Done. Vercel should pick up the new push automatically.');
}

try {
  main();
} catch (error) {
  console.error(`[ship] ${error.message}`);
  process.exit(1);
}
