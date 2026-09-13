import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');
const distDir = path.resolve(repoDir, 'dist');
const stampFile = path.resolve(distDir, '.starsilk-source-revision');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

let gitHead = 'unknown';
try {
  gitHead = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
} catch (err) {
  console.warn('[Stamp] Warning: could not determine git HEAD:', err.message);
}

// Check runtime source paths for uncommitted modifications
const runtimePaths = ['src', 'public', 'package.json', 'vite.config.ts', 'index.html', 'tsconfig.json'];
let isDirty = false;
let sourceDiffHash = null;

try {
  const statusOutput = execSync(`git status --porcelain -- ${runtimePaths.join(' ')}`, {
    cwd: repoDir,
    encoding: 'utf8',
  }).trim();

  if (statusOutput.length > 0) {
    isDirty = true;
    const diffOutput = execSync(`git diff HEAD -- ${runtimePaths.join(' ')}`, {
      cwd: repoDir,
      encoding: 'utf8',
    });
    const hash = crypto.createHash('sha256');
    hash.update(statusOutput);
    hash.update(diffOutput);
    sourceDiffHash = hash.digest('hex');
  }
} catch (err) {
  console.warn('[Stamp] Warning: could not compute source diff:', err.message);
}

const stampData = {
  head: gitHead,
  buildTimestamp: new Date().toISOString(),
  base: process.env.VITE_PUBLIC_BASE || '/Star_System_Planner/',
  isDirty,
  sourceDiffHash,
};

fs.writeFileSync(stampFile, JSON.stringify(stampData, null, 2) + '\n', 'utf8');
console.log(`[Stamp] Stamped ${stampFile} with HEAD: ${gitHead} (dirty: ${isDirty})`);
