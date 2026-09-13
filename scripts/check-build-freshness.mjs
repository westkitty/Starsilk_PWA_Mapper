import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');
const distDir = path.resolve(repoDir, 'dist');
const indexPath = path.resolve(distDir, 'index.html');
const stampPath = path.resolve(distDir, '.starsilk-source-revision');

if (!fs.existsSync(indexPath)) {
  console.log('STALE: dist/index.html missing');
  process.exit(1);
}

if (!fs.existsSync(stampPath)) {
  console.log('STALE: dist/.starsilk-source-revision missing');
  process.exit(1);
}

let stamp;
try {
  stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
} catch (e) {
  console.log('STALE: could not parse build stamp:', e.message);
  process.exit(1);
}

let currentHead;
try {
  currentHead = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
} catch (e) {
  console.log('STALE: could not determine git HEAD:', e.message);
  process.exit(1);
}

if (stamp.head !== currentHead) {
  console.log(`STALE: HEAD mismatch (stamp: ${stamp.head.slice(0, 7)}, current: ${currentHead.slice(0, 7)})`);
  process.exit(1);
}

// Check runtime source paths for uncommitted modifications
const runtimePaths = ['src', 'public', 'package.json', 'vite.config.ts', 'index.html', 'tsconfig.json'];
try {
  const statusOutput = execSync(`git status --porcelain -- ${runtimePaths.join(' ')}`, {
    cwd: repoDir,
    encoding: 'utf8',
  }).trim();

  const isCurrentlyDirty = statusOutput.length > 0;
  if (stamp.isDirty !== isCurrentlyDirty) {
    console.log(`STALE: dirty state mismatch (stamp dirty: ${stamp.isDirty}, current dirty: ${isCurrentlyDirty})`);
    process.exit(1);
  }

  if (isCurrentlyDirty) {
    const diffOutput = execSync(`git diff HEAD -- ${runtimePaths.join(' ')}`, {
      cwd: repoDir,
      encoding: 'utf8',
    });
    const hash = crypto.createHash('sha256');
    hash.update(statusOutput);
    hash.update(diffOutput);
    const currentDiffHash = hash.digest('hex');
    if (stamp.sourceDiffHash !== currentDiffHash) {
      console.log('STALE: source modifications have changed since build');
      process.exit(1);
    }
  }
} catch (e) {
  console.log('STALE: error checking git dirty status:', e.message);
  process.exit(1);
}

console.log(`FRESH: dist matches current HEAD ${currentHead.slice(0, 7)} (dirty: ${stamp.isDirty})`);
process.exit(0);
