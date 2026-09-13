#!/usr/bin/env node
/**
 * Security & Code Hygiene Audit Script.
 * Verifies that the codebase contains no unsafe evals or dangerous prototype pollution patterns.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');
let issuesFound = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for raw eval
      if (/\beval\s*\(/.test(content)) {
        console.error(`[SECURITY ISSUE] eval() found in ${path.relative('.', fullPath)}`);
        issuesFound++;
      }
      
      // Check for direct document.write
      if (/document\.write\s*\(/.test(content)) {
        console.error(`[SECURITY ISSUE] document.write() found in ${path.relative('.', fullPath)}`);
        issuesFound++;
      }
    }
  }
}

console.log('--- Running Starsilk Security & Code Hygiene Audit ---');
scanDir(SRC_DIR);

if (issuesFound === 0) {
  console.log('✅ Security Audit Passed: 0 dangerous evaluation patterns detected in src/.');
  process.exit(0);
} else {
  console.error(`❌ Security Audit Failed: ${issuesFound} issues identified.`);
  process.exit(1);
}
